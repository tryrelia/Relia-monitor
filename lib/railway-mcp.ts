import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ToolSet } from "ai";
import { dynamicTool, jsonSchema } from "ai";

const RAILWAY_MCP_URL = "https://mcp.railway.com/mcp";

/** Max characters to return from a single tool result to prevent token overflow */
const MAX_RESULT_CHARS = 12_000;

export interface MCPSession {
  tools: ToolSet;
  close: () => Promise<void>;
}

/** Module-level cache of live MCP sessions keyed by API key */
const sessionCache = new Map<string, MCPSession>();

/** In-flight creation promises to prevent concurrent duplicate connects */
const inflightCache = new Map<string, Promise<MCPSession>>();

export async function createRailwayMCPSession(credentials: {
  apiKey?: string;
}): Promise<MCPSession | null> {
  const { apiKey } = credentials;
  if (!apiKey) return null;

  const cacheKey = apiKey;

  if (sessionCache.has(cacheKey)) {
    return { ...sessionCache.get(cacheKey)!, close: async () => {} };
  }

  if (inflightCache.has(cacheKey)) {
    const session = await inflightCache.get(cacheKey)!;
    return { ...session, close: async () => {} };
  }

  const creationPromise = (async () => {
    const client = new Client({ name: "relia-chat-railway", version: "1.0.0" });

    const url = new URL(RAILWAY_MCP_URL);

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

    console.log(`[MCP] Railway Server returned ${mcpTools.length} tools`);

    const tools: ToolSet = Object.fromEntries(
      mcpTools.map((mcpTool) => {
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
                `[MCP] Calling Railway ${mcpTool.name}:`,
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
                console.error(`[MCP] Railway ${mcpTool.name} error:`, errText);
                throw new Error(errText || "Railway tool call failed");
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

    const session: MCPSession = {
      tools,
      close: async () => {},
    };

    sessionCache.set(cacheKey, session);

    return session;
  })().finally(() => inflightCache.delete(cacheKey));

  inflightCache.set(cacheKey, creationPromise);

  const session = await creationPromise;
  return { ...session, close: async () => {} };
}
