import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ToolSet } from "ai";
import { dynamicTool, jsonSchema } from "ai";

const RENDER_MCP_URL = "https://mcp.render.com/mcp";

/** Max characters to return from a single tool result to prevent token overflow */
const MAX_RESULT_CHARS = 12_000;

export interface RenderMCPSession {
  tools: ToolSet;
  close: () => Promise<void>;
}

/** Module-level cache of live MCP sessions keyed by API key */
const sessionCache = new Map<string, RenderMCPSession>();

/** In-flight creation promises to prevent concurrent duplicate connects */
const inflightCache = new Map<string, Promise<RenderMCPSession>>();

export async function createRenderMCPSession(credentials: {
  apiKey?: string;
  workspaceId?: string;
}): Promise<RenderMCPSession | null> {
  const { apiKey, workspaceId } = credentials;
  if (!apiKey) return null;

  const cacheKey = `${apiKey}:${workspaceId ?? ""}`;

  if (sessionCache.has(cacheKey)) {
    return { ...sessionCache.get(cacheKey)!, close: async () => {} };
  }

  if (inflightCache.has(cacheKey)) {
    const session = await inflightCache.get(cacheKey)!;
    return { ...session, close: async () => {} };
  }

  const creationPromise = (async () => {
    const client = new Client({ name: "relia-chat-render", version: "1.0.0" });

    const url = new URL(RENDER_MCP_URL);

    const transport = new StreamableHTTPClientTransport(url, {
      requestInit: {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    });

    try {
      await client.connect(transport);
    } catch (err) {
      await client.close().catch(() => {});
      throw err;
    }

    let mcpTools: Awaited<ReturnType<typeof client.listTools>>["tools"];
    try {
      ({ tools: mcpTools } = await client.listTools());
    } catch (err) {
      await client.close().catch(() => {});
      throw err;
    }

    console.log(`[MCP] Render Server returned ${mcpTools.length} tools`);

    const filteredMcpTools = workspaceId
      ? mcpTools.filter((t) => t.name !== "select_workspace" && t.name !== "list_workspaces")
      : mcpTools;

    const tools: ToolSet = Object.fromEntries(
      filteredMcpTools.map((mcpTool) => {
        const toolKey = mcpTool.name.replaceAll("-", "_");
        const desc = (mcpTool.description ?? mcpTool.name).slice(0, 300);

        return [
          toolKey,
          dynamicTool({
            description: desc,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inputSchema: jsonSchema(
              (mcpTool.inputSchema ?? {
                type: "object",
                properties: {},
              }) as any
            ),
            execute: async (input: unknown) => {
              console.log(
                `[MCP] Calling Render ${mcpTool.name}:`,
                JSON.stringify(input)
              );

              let result: Awaited<ReturnType<typeof client.callTool>>;
              try {
                result = await client.callTool({
                  name: mcpTool.name,
                  arguments: input as Record<string, unknown>,
                });
              } catch (err) {
                await client.close().catch(() => {});
                sessionCache.delete(cacheKey);
                throw err;
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const content = result.content as any[];

              if (result.isError) {
                const errText = content
                  .filter((c) => c.type === "text")
                  .map((c) => String(c.text))
                  .join("\n");
                console.error(`[MCP] Render ${mcpTool.name} error:`, errText);
                throw new Error(errText || "Render tool call failed");
              }

              const textParts = content.filter((c) => c.type === "text");
              let fullText = textParts.map((p) => String(p.text)).join("");

              if (fullText.length > MAX_RESULT_CHARS) {
                fullText =
                  fullText.slice(0, MAX_RESULT_CHARS) +
                  "\n...[TRUNCATED]";
              }

              try {
                return JSON.parse(fullText);
              } catch {
                return fullText;
              }
            },
          }),
        ];
      })
    );

    const session: RenderMCPSession = {
      tools,
      close: async () => {},
    };

    if (workspaceId) {
      await client.callTool({ name: "select_workspace", arguments: { ownerID: workspaceId } }).catch((err) => {
        console.error("[MCP] Failed to pre-select workspace (LLM will handle it):", err);
      });
    }

    sessionCache.set(cacheKey, session);

    return session;
  })().finally(() => inflightCache.delete(cacheKey));

  inflightCache.set(cacheKey, creationPromise);

  const session = await creationPromise;
  return { ...session, close: async () => {} };
}
