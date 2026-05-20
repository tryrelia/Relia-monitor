import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { UIMessage } from "ai";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful, friendly, and knowledgeable AI assistant.`;

export async function POST(req: Request) {
  const {
    messages,
  }: {
    messages: UIMessage[],
  } = await req.json();

  const providerType = (req.headers.get("x-ai-provider") || "openrouter") as any;
  const userApiKey = req.headers.get("x-ai-api-key") || "";
  const userModel = req.headers.get("x-ai-model") || undefined;

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

  const result = streamText({
    model: modelInstance,
    messages: await convertToModelMessages(messages),
    system: SYSTEM_PROMPT,
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}
