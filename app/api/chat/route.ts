import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
import type { UIMessage } from "ai";
import { createRenderMCPSession } from "@/lib/render-mcp";
import { createRailwayAPISession } from "@/lib/railway-api";

export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `You are a helpful, friendly, and knowledgeable AI assistant.`;

const RENDER_SYSTEM_PROMPT_BASE = `You are Relia, a specialized AI platform assistant designed to help manage, deploy, and monitor resources on Render.
You have access to Render platform tools via the Model Context Protocol (MCP). Use these tools to:
1. List and view workspaces, services, databases, and key-value stores.
2. View service logs and troubleshoot deployment or runtime errors.
3. Query database tables (read-only) and check service performance metrics (CPU, Memory, Bandwidth, etc.).
4. Spin up web services, static sites, cron jobs, database and key-value stores.

Always explain what you are doing before calling tools when appropriate. If a tool call fails or a resource is missing, explain the error clearly to the user.`;

function buildRenderSystemPrompt(workspaceId?: string): string {
  if (workspaceId) {
    return `${RENDER_SYSTEM_PROMPT_BASE}

WORKSPACE: The user's Render workspace ownerID is "${workspaceId}". Call select_workspace with ownerID="${workspaceId}" as your FIRST action before calling any other tool. Do not ask the user about workspace selection.`;
  }
  return `${RENDER_SYSTEM_PROMPT_BASE}

WORKSPACE SELECTION: A workspace must be selected before most tools work. If any tool fails with "no workspace set":
1. Call list_workspaces to fetch available workspaces.
2. Present the list to the user and ask them to choose.
3. Call select_workspace with the chosen ownerID.
Alternatively, ask the user to enter their workspace ownerID in Settings → Render Integration → Workspace ID to skip this step automatically.`;
}

const RAILWAY_SYSTEM_PROMPT = `You are Relia, a specialized AI platform assistant for Railway.app.
You have access to Railway platform tools via the GraphQL API. Use these tools to:
1. List projects and services (whoami, list_projects, list_services).
2. View deployments and their status (list_deployments).
3. Fetch logs for debugging (get_deployment_logs, get_environment_logs).

Workflow for listing services or deployments:
- Call list_projects first to get project IDs.
- Call list_services with a projectId to get service IDs and environment IDs.
- Call list_deployments with projectId + serviceId + environmentId.
- Call get_deployment_logs with a deploymentId for logs.

Always explain what you are doing before calling tools. If a tool call fails, explain the error clearly.`;

export async function POST(req: Request) {
  const {
    messages,
  }: {
    messages: UIMessage[],
  } = await req.json();

  const providerType = (req.headers.get("x-ai-provider") || "openrouter") as any;
  const userApiKey = req.headers.get("x-ai-api-key") || "";
  const userModel = req.headers.get("x-ai-model") || undefined;
  const renderApiKey = req.headers.get("x-render-api-key") || "";
  const renderWorkspaceId = req.headers.get("x-render-workspace-id") || undefined;
  const railwayApiKey = req.headers.get("x-railway-api-key") || "";
  const activePlatform = req.headers.get("x-active-platform") || "render";

  let modelInstance;

  if (providerType === "openai") {
    const openai = createOpenAI({ apiKey: userApiKey });
    modelInstance = openai(userModel || "gpt-4o");
  } else if (providerType === "anthropic") {
    const anthropic = createAnthropic({ apiKey: userApiKey });
    modelInstance = anthropic(userModel || "claude-3-5-sonnet-latest");
  } else if (providerType === "google") {
    const google = createGoogleGenerativeAI({ apiKey: userApiKey });
    modelInstance = google(userModel || "gemini-2.5-flash");
  } else {
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: userApiKey,
    });
    modelInstance = openrouter(userModel || "poolside/laguna-m.1:free");
  }

  let session: any = null;
  if (activePlatform === "railway" && railwayApiKey) {
    try {
      session = createRailwayAPISession(railwayApiKey);
    } catch (e) {
      console.error("Failed to create Railway session:", e);
    }
  } else if (renderApiKey) {
    try {
      session = await createRenderMCPSession({ apiKey: renderApiKey, workspaceId: renderWorkspaceId });
    } catch (e) {
      console.error("Failed to connect to Render MCP:", e);
    }
  }

  const systemPrompt = session
    ? activePlatform === "railway"
      ? RAILWAY_SYSTEM_PROMPT
      : buildRenderSystemPrompt(renderWorkspaceId)
    : BASE_SYSTEM_PROMPT;

  const result = streamText({
    model: modelInstance,
    messages: await convertToModelMessages(messages),
    system: systemPrompt,
    tools: session?.tools,
    maxSteps: 10,
    abortSignal: req.signal,
    onFinish: async () => {
      if (session) {
        await session.close().catch((e: any) => {
          console.error("Failed to close Render MCP session:", e);
        });
      }
    },
  } as any);

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}
