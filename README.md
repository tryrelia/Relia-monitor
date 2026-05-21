# Relia Monitor

> An open-source AI chat interface for [Render](https://render.com) and [Railway](https://railway.app) — manage and monitor your deployments using natural language, powered by your choice of LLM provider.

**Live:** [monitor.tryrelia.com](https://monitor.tryrelia.com)

Ask questions like _"Show me the logs for my failing service"_ or _"What's the CPU usage on my web server?"_ and get answers backed by real platform data, rendered with tool output, streamed reasoning, and inline charts.

---

## Features

- **Multi-provider AI** — OpenAI, Anthropic (Claude), Google (Gemini), and OpenRouter all supported out of the box
- **Render integration** — list services, view logs, query databases, check metrics via the official [Render MCP server](https://render.com/docs/mcp)
- **Railway integration** — list projects, services, and deployments, fetch logs via the Railway GraphQL API
- **Inline charts** — AI responses are rendered as live `recharts` bar/line/area/pie visualizations
- **Streaming reasoning** — collapsible thinking panels for models that support reasoning tokens (Claude extended thinking, DeepSeek R1, etc.)
- **Tool call transparency** — every platform action shows its running/success/error state inline
- **Per-conversation persistence** — chats saved locally in IndexedDB, never leave your device
- **Light / dark / system themes** — built on shadcn/ui + Tailwind v4
- **Bring your own keys** — no backend account required; API keys stored locally in your browser

---

## Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router) + React 19
- **AI** — [Vercel AI SDK v6](https://ai-sdk.dev/) with `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`
- **Render** — [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) talking to Render MCP over Streamable HTTP
- **Railway** — direct GraphQL API integration
- **UI** — [shadcn/ui](https://ui.shadcn.com) + Tailwind v4
- **Charts** — [recharts](https://recharts.org)
- **Markdown** — [streamdown](https://www.npmjs.com/package/streamdown) with code/math/mermaid/cjk plugins
- **Storage** — IndexedDB for conversations, localStorage for settings

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- An **AI provider API key** (OpenAI, Anthropic, Google AI Studio, or OpenRouter)
- A **Render** or **Railway** API key (optional — needed for platform features)

### Installation

```bash
git clone https://github.com/tryrelia/Relia-monitor.git
cd Relia-monitor
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Configuration

All configuration happens in-app via the **Settings** dialog (gear icon in the sidebar). No `.env` file required.

1. **AI Provider** — pick OpenAI / Anthropic / Google / OpenRouter and paste your API key
2. **Model** — choose from the predefined list or enter a custom model ID
3. **Platform** — select Render or Railway and paste the corresponding API key
4. **Render Workspace ID** _(optional)_ — auto-selects your workspace, skipping the selection step

Settings are persisted in `localStorage` only — they never leave your browser.

---

## Where to Get API Keys

| Provider | Link |
|----------|------|
| OpenAI | <https://platform.openai.com/api-keys> |
| Anthropic | <https://console.anthropic.com/settings/keys> |
| Google AI Studio | <https://aistudio.google.com/app/apikey> |
| OpenRouter | <https://openrouter.ai/settings/keys> |
| Render | <https://dashboard.render.com/u/settings> |
| Railway | <https://railway.com/account/tokens> |

> **OpenRouter note:** Some free models require provider logging to be enabled in your [privacy settings](https://openrouter.ai/settings/privacy).

---

## How It Works

```
┌──────────────┐    headers     ┌────────────────────┐                  ┌──────────────────┐
│   Browser    │ ─────────────► │  /api/chat route   │ ── MCP/HTTP ───► │  Render MCP      │
│  (useChat)   │                │  (AI SDK stream)   │ ◄─────────────── │  Server          │
└──────────────┘ ◄───────────── └────────────────────┘                  └──────────────────┘
       ▲             SSE              │
       │                             │── GraphQL ──►  ┌──────────────────┐
       │                             │                 │  Railway API     │
       │                             │ ◄────────────── └──────────────────┘
       │                             │
       │                             ▼
       │                      ┌────────────────────┐
       │                      │   LLM Provider     │
       │                      │ OpenAI / Anthropic │
       │                      │  Google / OR       │
       │                      └────────────────────┘
       │
   Tool output, charts, reasoning, task indicators…
```

1. The chat UI sends a message via AI SDK's `useChat`, passing API keys as request headers
2. The Next.js route opens an MCP session (Render) or GraphQL connection (Railway), lists available tools, and exposes them to the LLM
3. The LLM calls tools (e.g. `list_services`, `get_logs`) — results stream back as part of the response
4. Responses are parsed for ` ```recharts ` JSON blocks (rendered as live charts)
5. Reasoning tokens (where supported) stream into a collapsible thinking panel

---

## Project Structure

```
app/
  api/chat/route.ts        # AI SDK streaming route + MCP/GraphQL wiring
  [id]/page.tsx            # individual conversation page
  page.tsx                 # welcome landing
components/
  chat-interface.tsx       # core chat UI (useChat, reasoning, tool indicators)
  chat-chart.tsx           # recharts renderer + JSON block parsing
  chat-layout-wrapper.tsx  # sidebar + mobile layout + context provider
  sidebar.tsx              # conversation list + settings dialog
  render-tool-output.tsx   # renders Render/Railway tool results
  ai-elements/             # AI Elements primitives (message, reasoning, task…)
  ui/                      # shadcn primitives
lib/
  render-mcp.ts            # Render MCP client + tool adapter
  railway-api.ts           # Railway GraphQL client + tool adapter
  chat-context.ts          # React context for settings + conversations
  db.ts                    # IndexedDB persistence layer
```

---

## Available Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

---

## Self-Hosting

### Vercel

```bash
npx vercel
```

No environment variables required.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Railway / Render

Connect the repo in the dashboard. Build command: `npm run build`. Start command: `npm start`. No environment variables needed.

---

## Privacy

- API keys are stored **only** in `localStorage` on your device
- Conversations are stored **only** in IndexedDB on your device
- The Next.js API route is a stateless proxy — it does not log, persist, or forward anything beyond the LLM and platform API calls
- If you self-host, your data flows directly between your browser → your server → the LLM provider + Render/Railway

---

## Security

### Browser Storage Security Considerations

This project stores client-side data using browser storage mechanisms (`IndexedDB` and `localStorage`).

Because browser storage is accessible from client-side JavaScript, sensitive data (API keys) may be exposed in the event of XSS vulnerabilities or compromised browser environments.

The current implementation is primarily intended for development, personal use, and self-hosted deployments. Use with caution in shared or public environments.

---

## Contributing

PRs welcome. Please:

1. Open an issue first for non-trivial changes
2. Follow the existing code style (TypeScript strict, no comments unless the _why_ is non-obvious)
3. Test against at least one AI provider and one platform (Render or Railway) end-to-end

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgements

- [Render](https://render.com) and [Railway](https://railway.app) for the deployment platforms and APIs
- [Vercel AI SDK](https://ai-sdk.dev/) for the streaming AI infrastructure
- [shadcn/ui](https://ui.shadcn.com) for the component foundation
- [Model Context Protocol](https://modelcontextprotocol.io/) for the tool-calling standard
