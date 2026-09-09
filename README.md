# CopilotKit + Microsoft Agent Framework (Python) Test Suite

A navigable, working test harness for the CopilotKit Microsoft Agent Framework Python integration — each doc page is a route that actually runs the thing it describes.

|                         |                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Doc sync date**       | Machine-maintained — `doc-snapshot/manifest.json` → `syncedAt`, rewritten on every sync                          |
| **CopilotKit packages** | `@copilotkit/react-core` 1.69.2 · `@copilotkit/runtime` 1.69.2 — resolved versions live in [`frontend/VERSIONS.md`](frontend/VERSIONS.md) |
| **AG-UI package**       | `@ag-ui/client` 0.0.58                                                                                           |
| **Frontend**            | Next.js 16.3.1 (App Router) · React 19.2 · TypeScript · Tailwind 4                                               |
| **Backend**             | Python 3.12 · `agent-framework-core` 1.13.0 · `agent-framework-ag-ui` 1.0.1 · FastAPI                            |
| **Build status**        | Typecheck runs in the daily workflow (stage 2). Lint ✅. **Typecheck currently failing** in `custom-look-and-feel/slots/demo-chat` — see Known issues #5. |

---

## 2. Overview

[Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/) is Microsoft's agent SDK. Its Python `agent-framework-ag-ui` package can expose an agent over [AG-UI](https://ag-ui.com), the event protocol CopilotKit speaks, which is what lets a React app drive it with streaming, tool calls, shared state, and generative UI.

This repo is a test harness for that integration, covering a **scoped set of 27 doc pages** (listed in §8). Each route implements what its page teaches and shows the exact source that makes it work.

**Everything here comes from the documentation.** No tool, instruction, or state schema was invented — the backend exposes exactly the three tools the docs define (`get_weather`, `update_language`, `update_searches`) and nothing else.

Tracks: **<https://docs.copilotkit.ai/ms-agent-python>**

---

## 3. Architecture

```
Browser (React 19)
  │  @copilotkit/react-core/v2 — CopilotKitProvider, CopilotChat, hooks
  │  POST /api/copilotkit            ← every route except /threads
  │  GET|POST /api/copilotkit-threads/*   ← /threads only
  ▼
Next.js 16 App Router  ·  localhost:3000
  │  Copilot Runtime  (@copilotkit/runtime)
  │  agents: { my_agent, sample_agent, search_agent } → new HttpAgent({ url })
  │  POST http://localhost:8000/{,sample_agent,search_agent}   ← AG-UI over SSE
  ▼
FastAPI + agent-framework-ag-ui  ·  localhost:8000     ← Python
  │  add_agent_framework_fastapi_endpoint(app, agent, path)
  ▼
OpenAI or Azure OpenAI  (gpt-4o-mini by default)
```

Four points worth noting:

- **No framework-specific adapter.** Agent Framework speaks AG-UI natively, so the runtime binds a plain `HttpAgent` — unlike integrations that ship their own agent class.
- **Four agents, not one.** `state_schema` belongs to the agent it is attached to, and the docs define two different schemas (`language` and `searches`). Merging them would mean inventing a schema that appears in neither doc. The fourth is the `ContextAwareAgent` the Agent App Context page started publishing on 2026-09-04.
- **The model key never reaches the browser.** Only the Python process holds it.
- **Two runtime endpoints, on purpose.** `/api/copilotkit/[[...slug]]` is the runtime handler as the v2 docs write it, minus the `intelligence`/`identifyUser` options — the documented no-Intelligence fallback. `/api/copilotkit-threads/[[...slug]]` is a second endpoint configured with CopilotKit Intelligence and license tokens for `/threads` persistence, allowing the standard runtime to remain focused on pure agent execution.

### Request lifecycle

```
1. User sends message
       │
       ▼
2. [CopilotRuntime Handler] (Next.js receives POST /api/copilotkit)
       │
       ▼
3. [InMemoryAgentRunner]
   ├─► Identifies the target agent ("my_agent")
   ├─► Opens an HTTP connection to Python: http://localhost:8000/
   ├─► Pipes user messages into the Python AG-UI server
   │
   ▼
4. [Python Agent Framework]
   ├─► Calls OpenAI / LLM
   ├─► Runs tools (e.g. get_weather)
   └─► Streams back AG-UI events (RUN_STARTED, TEXT_MESSAGE_CONTENT, etc.)
       │
       ▼
5. [InMemoryAgentRunner]
   ├─► Holds active stream state in Node.js process memory
   └─► Forwards SSE chunks directly to the React frontend
       │
       ▼
6. Browser renders streaming response word-by-word
```

### The four agents

| Runtime id     | Endpoint             | Tool              | Serves                                                           |
| -------------- | -------------------- | ----------------- | ---------------------------------------------------------------- |
| `my_agent`     | `:8000/`             | `get_weather`     | Quickstart, Tool Rendering, and every route with no state schema |
| `sample_agent` | `:8000/sample_agent` | `update_language` | Shared State read/write                                          |
| `search_agent` | `:8000/search_agent` | `update_searches` | State Rendering                                                  |
| `context_agent`| `:8000/context_agent`| —                 | Agent App Context (`ContextAwareAgent`)                          |

---

## 4. Prerequisites

| Requirement                        | Version | Notes                                                                            |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------- |
| Node.js                            | 20+     | Next.js 16 requires 20+.                                                         |
| npm                                | 10+     | Or pnpm/yarn/bun.                                                                |
| Python                             | 3.12    |                                                                                  |
| [`uv`](https://docs.astral.sh/uv/) | 0.11+   | The agent-framework packages are pre-release, so `--prerelease=allow` is needed. |
| OpenAI **or** Azure OpenAI key     | —       | Required.                                                                        |

---

## 5. Setup

**1. Clone**

```bash
git clone <this-repo> ms-agent-framework-pt && cd ms-agent-framework-pt
```

**2. Install Backend Dependencies**

```bash
cd backend
uv sync --prerelease=allow
cd ..
```

**3. Install Frontend Dependencies**

```bash
cd frontend
npm install
cd ..
```

**4. Configure the environment**

```bash
cp .env.example backend/.env
```

---

### Upgrading Dependencies

When upgrading frontend packages (especially `@copilotkit/*` and `@ag-ui/*`):

```bash
cd frontend

# Upgrade all packages while safely respecting peer dependencies
npx npm-check-updates -u -p

# Or update only CopilotKit and AG-UI packages:
npx npm-check-updates -u --filter "/copilotkit|ag-ui/"

# Install updated versions and regenerate lockfile
npm install

# Verify build and type integrity
npm run build
```

> **Note on `-p` (`--peer`):** The `-p` flag ensures `npm-check-updates` checks peer dependency compatibility before bumping versions, preventing `ERESOLVE` peer dependency conflicts.

Then edit `backend/.env`:

| Variable                            | Where                 | What it does                                                                               |
| ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `OPENAI_API_KEY`                    | `backend/.env`        | **Required** (unless using Azure). The backend refuses to start with neither provider set. |
| `OPENAI_CHAT_MODEL_ID`              | `backend/.env`        | Model id. Defaults to `gpt-4o-mini`.                                                       |
| `AZURE_OPENAI_ENDPOINT`             | `backend/.env`        | Use Azure instead. Takes precedence when set.                                              |
| `AZURE_OPENAI_CHAT_DEPLOYMENT_NAME` | `backend/.env`        | Azure deployment name.                                                                     |
| `AGENT_PORT`                        | `backend/.env`        | Defaults to `8000`.                                                                        |
| `AUTH_BEARER_TOKEN`                 | `backend/.env`        | Enables the bearer-token middleware. Unset by default.                                     |
| `MS_AGENT_URL`                      | `frontend/.env.local` | Where the runtime finds the agent. Defaults to `http://localhost:8000`.                    |
| `NEXT_PUBLIC_AUTH_BEARER_TOKEN`     | `frontend/.env.local` | The token the provider forwards. Must match the backend's.                                 |
| `COPILOTKIT_LICENSE_TOKEN`          | `frontend/.env.local` | `/threads` only. Signed license, verified offline — no login, no network call.              |
| `CPK_INTELLIGENCE_API_KEY`          | `frontend/.env.local` | `/threads` only. Project key for the managed thread store. `INTELLIGENCE_API_KEY` still read. |
| `INTELLIGENCE_API_URL`              | `frontend/.env.local` | `/threads` only. Managed Intelligence REST endpoint.                                        |
| `INTELLIGENCE_GATEWAY_WS_URL`       | `frontend/.env.local` | `/threads` only. Managed realtime endpoint — a different host from the REST one.             |

> Next.js does not read the repo-root `.env`. Frontend variables belong in `frontend/.env.local`. In practice you only need `OPENAI_API_KEY`.


The four `/threads` variables are the only credentials in this repo that are not optional for the feature they serve — thread storage lives in CopilotKit's managed Intelligence platform, not in the agent or the runtime. `npx copilotkit@latest init` mints all four; this repo's values were copied from the project it scaffolded under `1-cli-testing/`. Leave them unset and `/threads` degrades rather than breaking: the read-only thread routes still answer from the runtime's in-memory fallback, mutations return 422, and the prebuilt drawer renders locked.

**Default ports:** frontend **3000**, backend **8000**.

---

## 6. Running the project

Two processes, two terminals.

**Terminal 1 — the agent:**

```bash
cd backend
uv run --prerelease=allow main.py
```

Success looks like:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

If no model provider is configured it exits immediately saying so, rather than starting and failing on the first message.

**Terminal 2 — the app:**

```bash
cd frontend
npm run dev
```

Open **<http://localhost:3000>**. The home page probes the agent server-side and shows a connection panel — check it first if anything misbehaves.

**Optional — record the demos.** With both processes up, `autorecorder/` drives a real browser through every route and saves a screen capture per doc page:

```bash
npm run record:doctor             # is the recorder configured correctly?
npm run record -- --list          # every registered route
npm run record -- --quickstart    # one page
npm run record                    # all 20, sequentially
```

It refuses to start if either service is down (`--force` overrides). Output lands in `autorecorder/videos/`.

`autorecorder/` is written to be copied into the other CopilotKit framework repos and adapted — see [`autorecorder/README.md`](autorecorder/README.md) to run it and [`autorecorder/ADAPT.md`](autorecorder/ADAPT.md) to port it.

---

## 7. What to expect — walkthrough per section

### How each route is split

Routes with a live feature are split in two:

|                         |                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`<route>`**           | Notes, pass/fail criteria, and **the exact source** of the implementation, read off disk at render time. No live chat.                                                                    |
| **`<route>/demo-chat`** | Just the running feature, no sidebar or page chrome — built for screen recording. Reached via **Open demo ↗** in the route header, which always opens in a new tab so the notes stay put. |

The code on a page is never a re-typed approximation: each page reads real files from the repo via `frontend/src/lib/source.ts`, so what you compare against the doc is what actually runs. Some excerpts use `#region` markers, which stay visible in the source and are labelled with line numbers.

### Getting Started

**`/`** — Orientation plus a live connection check. **Pass:** "Agent Framework AG-UI server" shows green and `200 from http://localhost:8000/health`.

**`/quickstart`** — The bring-your-own-agent path: FastAPI AG-UI server, runtime route, `CopilotSidebar`. **Try:** `Can you tell me a joke?` **Pass:** tokens stream in one at a time. **Fail:** nothing streams — the agent process is down.

### Basics

**`/prebuilt-components`** — `CopilotChat`, `CopilotSidebar`, `CopilotPopup` in tabs. **Pass:** all three drive the same agent; the conversation survives tab switches. **Fail:** a component renders blank.

### Custom Look and Feel

**`/custom-look-and-feel/slots`** _(live but absent from the doc sidebar)_ — Three override levels. **Pass:** level 1 tints the message area, level 2 auto-focuses the input, level 3 shows a custom header, layout, and cursor. **Fail:** all three tabs look identical.

**`/custom-look-and-feel/headless-ui`** _(live but absent from the sidebar)_ — A chat with zero CopilotKit chrome. **Try:** `Tell me a joke`. **Pass:** messages stream into hand-written bubbles. **Fail:** Send does nothing.

**`/programmatic-control`** — Drives the agent with no chat component. **Pass:** status flips to Running, the transcript grows, Stop halts it mid-stream.

**`/inspector`** — The debugging overlay, mounted by the provider. **Pass:** the event list fills and Available Agents lists all four ids. **Fail:** no inspector — it is force-disabled in production builds, so use `npm run dev`.

### Generative UI

**`/generative-ui/your-components/display-only`** — `useComponent`. **Try:** `Show the weather card for Tokyo: 77 degrees, clear`. **Pass:** a bordered card renders inline. **Fail:** plain text with no card.

**`/generative-ui/your-components/interactive`** — `useHumanInTheLoop` approval gate. **Try:** `Run the command rm -rf /tmp/cache`. **Pass:** an approval card renders with the command in a code block and **nothing further streams** until you click Approve or Deny; the agent's next message reflects your choice. **Fail:** plain text with no buttons, or it continues without waiting.

**`/generative-ui/tool-rendering`** — A named renderer for `get_weather` plus a wildcard fallback. **Try:** `What's the weather in Tokyo?` **Pass:** "Calling weather API..." becomes "Called the weather API for Tokyo." **Fail:** raw JSON, or nothing.

**`/generative-ui/state-rendering`** — `searches` state streamed from `search_agent`. **Try:** `Search for the tallest mountains`, then `Now also search for the deepest oceans`. **Pass:** a checked item appears as the tool call streams; the second prompt adds a second item while keeping the first. **Fail:** the list stays empty.

**`/generative-ui/a2ui/styling`** — 🚧 **Tracked, not implemented.** Theming A2UI surfaces through CSS custom properties scoped to `.a2ui-surface`. This repo maps no A2UI page at all — `/generative-ui/a2ui`, `fixed-schema` and `dynamic-schema` are all still unmapped — so there is no surface for a theme file to affect. DeepAgentspy-react implements this page against a real surface.

**`/generative-ui/a2ui/advanced`** — 🚧 **Tracked, not implemented.** Replacing the built-in progress indicator shown while the `render_a2ui` tool call is in flight. That only happens on the Dynamic Schema A2UI path, which this repo does not map, so a custom renderer would never mount. DeepAgentspy-react implements this page too.

### App Control

**`/frontend-tools`** — The doc's `sayHello` tool, executing in the browser. **Try:** `Say hello to Malaika`. **Pass:** a browser alert appears, then the agent confirms. **Fail:** a text reply with no alert.

**`/webmcp`** — 🚧 **Tracked, not implemented.** The doc adds a `webmcp` flag to a frontend tool so browser agents can discover it. Its own test procedure needs Chrome 149+ with the WebMCP origin trial (or `chrome://flags/#enable-webmcp-testing`) and Chrome's Model Context Tool Inspector; CopilotKit no-ops where `document.modelContext` is absent, so a demo here would register nothing and still look green.

**`/human-in-the-loop/governed-actions`** — ✅ **Working.** An approval card gating a side-effecting action. The run stops on the card, which shows the policy verdict, the reference that produced it, and the exact arguments; it proceeds only on approval. The `useHumanInTheLoop` variant is implemented; the `useInterrupt` variant is not, because it needs a backend that pauses a run and attaches `interrupt.metadata.action`, and no agent here does. One departure from the published code: `arguments: z.record(z.unknown())` is a zod 3 signature and this repo is on zod 4, where `z.record` needs both a key and a value schema — the published form is a TS2554. The page names no zod version anywhere. The `useEffect` that auto-resolves `allow` and `deny` omits `onApprove` and `onBlock` from its dependency array; kept as published, warning and all.

### Shared State

**`/shared-state/in-app-agent-read`** — Reading `agent.state`. **Try:** `Switch to Spanish`. **Pass:** the Language line updates as the tool call streams. **Fail:** the agent confirms in text but the panel stays on english.

**`/shared-state/in-app-agent-write`** — `agent.setState`, with and without a re-run. **Pass:** Toggle flips the value immediately and the agent acknowledges on your next message; Toggle + re-run makes it respond straight away.

**`/readables`** — `useAgentContext`. **Try:** `Who are my colleagues?` **Pass:** the agent answers from the list on the left, which it was never told in a message. **Fail:** it says it has no such information.

### Microsoft Agent Framework

**`/auth`** — Forwarding and validating a bearer token. The demo reports whether the agent demands a token and whether the provider sends one, then gives you a chat to send through it. **Try:** send a message with auth off (the baseline), then set `AUTH_BEARER_TOKEN` on the backend only and restart the agent. **Pass:** the second attempt fails — the runtime never reaches the agent. Adding a matching `NEXT_PUBLIC_AUTH_BEARER_TOKEN` and restarting the app makes it stream again. **Fail:** messages stream identically in all three states, meaning the middleware is not enforcing.

### Rich Threads

Four routes, one per doc page. All share the Intelligence-backed runtime at `/api/copilotkit-threads` and the `default` agent, so a thread created on one shows up on the others.

**`/threads`** — Orientation and credentials. No demo; it explains what the other three need and links to them. **Pass:** the four env variables are described and the two source panels render. **Fail:** nothing to fail — if the others are broken, this page says why.

**`/threads/drawer`** — The drop-in `<CopilotThreadsDrawer>`, in two tabs: the doc's zero-prop integration, and the same drawer with `renderRow`, `limit`, and label overrides. **Try:** `Can you tell me a joke?`, then hit "New Conversation" and send another. **Pass:** two rows appear, auto-named; clicking the first replays its transcript with no selection state written by us. **Fail:** a "requires a license" panel instead of a list.

**`/threads/headless`** — The same data through `useThreads`, driving a sidebar this repo writes. **Try:** send a message, then Rename the row and reload. **Pass:** the new name survives the reload (it round-tripped through the platform, not just optimistic state); Archive hides the row until you tick Archived; Delete asks first, then removes it permanently. **Fail:** rows list but mutations error — mutations need the Intelligence runtime, unlike the read-only routes.

**`/threads/lifecycle`** — The lifecycle made observable. **Try:** send a message, hit "New chat", then click the conversation you just made under "Open a known conversation". **Pass:** `hasExplicitThreadId` reads `false` on the fresh chat and flips to `true` on the picked one, whose transcript replays and whose messages appear in the `agent.messages` readout. **Fail:** the id changes but the transcript stays empty — replay needs a server-side store, so check `/threads` first.

All three are recorded by the autorecorder (`npm run record -- --threads-drawer`, `--threads-headless`, `--threads-lifecycle`). Note that each run leaves a real thread on the Intelligence project, so the list grows one row per recording against the free tier's 200-thread cap.

### Backend

**`/copilot-runtime`** — Live routing across all four agent ids. **Pass:** all four stream, each with its own conversation. **Fail:** one errors with agent-not-found.

**`/ag-ui`** — Live AG-UI event capture. **Try:** `What's the weather in Tokyo?` **Pass:** `RUN_STARTED` → `TEXT_MESSAGE_CONTENT` burst → `TOOL_CALL_START/END` → `TOOL_CALL_RESULT` → `RUN_FINISHED`.

**`/status`** — Every route and its status in one table.

### Intelligence

**`/intelligence/quickstart`** — ⚠️ **Partial.** Steps 3 and 4 are implemented; steps 1, 2 and 5 are not. The 2026-09-09 sync rewrote step 3 from the multi-route handler to `mode: "single-route"` with a single `POST` export, and step 4 from `runtimeUrl` alone to `runtimeUrl` plus `useSingleEndpoint`. Neither needs a hosted project, so both are mounted now: `/api/copilotkit-single` takes the same runtime object as the multi-route mount, and `/intelligence/quickstart/demo-chat` drives it. Steps 1, 2 and 5 still open with `npx copilotkit@latest login` plus `project select`, which writes a `CPK_INTELLIGENCE_API_KEY` — an account-scoped resource this harness does not have, so the confirmation step has nothing to assert against. Three findings came out of the half that is testable, all on the route's page: the single endpoint accepts seven envelope methods and no thread, memory or annotation method is among them; single-route mode reports `threadEndpointsEnabled: false` from `/info`, which locks the Inspector thread list the page's last step tells you to check; and the page's own coding-agent prompt still instructs the reader to do the opposite of its manual steps. Still tracked as new because it is a genuinely new page; the rest of `/ms-agent-python/intelligence/*` is the old `/ms-agent-python/premium/*` set renamed, and stays out of scope.

---

## 8. Testing checklist / current status

<!-- status-table:begin — generated by ci/write-readme-status.mjs; edit Notes here, everything else in nav-config.ts -->
| Doc page                                                      | Route                                         | Status        | Recorded | Notes                                                                                                                    |
| ------------------------------------------------------------- | --------------------------------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/ms-agent-python`                                            | `/`                                           | 📖 Reference   | —        | Server-side agent probe.                                                                                                 |
| `/ms-agent-python/quickstart?agent=bring-your-own`            | `/quickstart`                                 | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/prebuilt-components`                        | `/prebuilt-components`                        | ✅ Working     | 🎬        | Doc page is a 191-byte component stub.                                                                                   |
| `/ms-agent-python/custom-look-and-feel/slots`                 | `/custom-look-and-feel/slots`                 | ✅ Working     | 🎬        | **Not in the doc sidebar**, but resolves.                                                                                |
| `/ms-agent-python/custom-look-and-feel/headless-ui`           | `/custom-look-and-feel/headless-ui`           | ✅ Working     | 🎬        | **Not in the doc sidebar**; resolves.                                                                                    |
| `/ms-agent-python/programmatic-control`                       | `/programmatic-control`                       | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/inspector`                                  | `/inspector`                                  | ✅ Working     | 🎬        | Dev-only by design.                                                                                                      |
| `/ms-agent-python/generative-ui/your-components/display-only` | `/generative-ui/your-components/display-only` | ✅ Working     | 🎬        | Needs no backend declaration.                                                                                            |
| `/ms-agent-python/generative-ui/your-components/interactive`  | `/generative-ui/your-components/interactive`  | ✅ Working     | 🎬        | `useHumanInTheLoop` approval gate. Needs no backend declaration.                                                         |
| `/ms-agent-python/generative-ui/tool-rendering`               | `/generative-ui/tool-rendering`               | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/generative-ui/state-rendering`              | `/generative-ui/state-rendering`              | ✅ Working     | 🎬        | Uses `search_agent`.                                                                                                     |
| `/ms-agent-python/generative-ui/a2ui/styling`                 | `/generative-ui/a2ui/styling`                 | 🚧 Not started | —        | Tracked for drift. No A2UI surface is mapped here to style.                                                              |
| `/ms-agent-python/generative-ui/a2ui/advanced`                | `/generative-ui/a2ui/advanced`                | 🚧 Not started | —        | Tracked for drift. Builds on Dynamic Schema A2UI, which is unmapped here.                                                |
| `/ms-agent-python/frontend-tools`                             | `/frontend-tools`                             | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/webmcp`                                     | `/webmcp`                                     | 🚧 Not started | —        | Tracked for drift. Needs Chrome 149+ and the WebMCP origin trial.                                                        |
| `/ms-agent-python/human-in-the-loop/governed-actions`         | `/human-in-the-loop/governed-actions`         | ✅ Working     | 🎬        | Tool-call variant. `useInterrupt` half needs a backend that pauses a run; published zod 3 schema retranslated for zod 4. |
| `/ms-agent-python/shared-state/in-app-agent-read`             | `/shared-state/in-app-agent-read`             | ✅ Working     | 🎬        | Seeded via server `default_state` — see §9.                                                                              |
| `/ms-agent-python/shared-state/in-app-agent-write`            | `/shared-state/in-app-agent-write`            | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/agent-app-context`                          | `/readables`                                  | ✅ Working     | 🎬        | Runs the page's `ContextAwareAgent` on `/context_agent` — see §9 #10.                                                    |
| `/ms-agent-python/auth`                                       | `/auth`                                       | ✅ Working     | 🎬        | Demo reports live auth state on both sides and sends a request through it.                                               |
| `/ms-agent-python/threads`                                    | `/threads`                                    | ⚠️ Partial    | —        | Overview + credentials. Free-tier license expires 2026-09-12.                                                            |
| `/ms-agent-python/prebuilt-components/copilot-threads-drawer` | `/threads/drawer`                             | ⚠️ Partial    | 🎬        | Slots escape hatch unusable in 1.68.2 — see §9 #12. Rename absent by design.                                             |
| `/ms-agent-python/headless-threads`                           | `/threads/headless`                           | ⚠️ Partial    | 🎬        | All four doc steps. Mutations need the license.                                                                          |
| `/ms-agent-python/threads-lifecycle`                          | `/threads/lifecycle`                          | ⚠️ Partial    | 🎬        | "Thread via your own API on first message" not implemented — see §9 #11.                                                 |
| `/ms-agent-python/copilot-runtime`                            | `/copilot-runtime`                            | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/ag-ui`                                      | `/ag-ui`                                      | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/intelligence/quickstart`                    | `/intelligence/quickstart`                    | ⚠️ Partial    | 🎬        | Single-route transport implemented and exercised; the hosted-project steps still need `CPK_INTELLIGENCE_API_KEY`.        |
<!-- status-table:end -->

**Legend:** ✅ Working · ⚠️ Partial · 📖 Reference · 🚧 Not started · ❌ Broken · 🎬 driven by the autorecorder. Generated by `npm run readme:status` from `frontend/src/lib/nav-config.ts` and `autorecorder/config/pages.config.ts`; only the Notes column is edited here.

Out of scope by request: CLI, Build with agents, MCP Apps, the rest of A2UI, the rest of Intelligence Platform, Troubleshooting. Also out of scope: `/ms-agent-python/threads-import` (Import & Synchronize Thread History) — it migrates existing LangGraph/ADK conversations into the platform store, and there is nothing here to migrate from.

**Tracked without a demo.** Three pages carry a route, a nav entry and a snapshot so drift is watched, but nothing is implemented behind them and the recorder does not touch them: `/ms-agent-python/webmcp` and both `/generative-ui/a2ui/*` pages. The reason is on each route’s page and in §7. The A2UI parents and the rest of `/ms-agent-python/intelligence/` stay in `doc-snapshot/manifest.json`’s `knownUnmapped` list.

---

## 9. Known issues / doc-vs-implementation discrepancies

Found while building against `@copilotkit/react-core` 1.69.2 and `agent-framework-ag-ui` 1.1.0 (`agent-framework-openai` 1.13.0).

**1. `useAgent` has no `initialState` prop**
Both Shared State pages seed the starting value with `useAgent({ agentId, initialState: { language: "english" } })`. `UseAgentProps` has no such field — passing it is a type error. This repo seeds server-side with `default_state` on `add_agent_framework_fastapi_endpoint`, which is a real parameter. The read page also shows a `render` prop on `useAgent`, likewise absent from the shipped type.

**2. `AzureOpenAIChatClient` is not importable — resolved upstream (doc sync 2026-08-27)**
Frontend Tools, Tool Rendering, State Rendering and Auth used to `from agent_framework.azure import AzureOpenAIChatClient`, a symbol `agent-framework-azure-ai` 1.0.0rc6 does not export. Those pages have now been rewritten to the `OpenAIChatClient(..., azure_endpoint=...)` form this repo already used, so the discrepancy is gone. The same sync added a `credential=None if azure_api_key else DefaultAzureCredential()` fallback (Azure via `az login` when no key is set), which `backend/chat_client.py` now matches.

**3. `useDefaultRenderTool` sample destructures `args`**
The wildcard sample on Tool Rendering reads `({ name, args, status, result })`. The shipped `DefaultRenderProps` provides `name`, `toolCallId`, `parameters`, `status`, and `result` — there is no `args`. (The _named_ `useRenderTool` sample on the same page is correct and already uses `parameters`, which is worth noting since the equivalent page for some other frameworks still shows the older form.)

**4. The Inspector's on/off prop depends on which provider you use**
The doc says the inspector is on by default and `enableInspector={false}` disables it. That is true of `<CopilotKit>`. `<CopilotKitProvider>` has no `enableInspector` prop — it reads `showDevConsole`, which **defaults to false**. Also, the provider already mounts the inspector itself; a hand-mounted `<CopilotKitInspector />` forwards `core ?? null` and renders "CopilotKit core not attached".

**5. Slots: a plain component is not assignable to most slots**
`SlotValue<C> = C | string | Partial<ComponentProps<C>>`, so a replacement must match the default component's type including its statics. The doc's level-3 example passes a bare function component, which fails to typecheck. It works on slots whose default is an ordinary function (e.g. `cursor`), which is what this repo demonstrates.

**6. Headless UI: `msg.content` is not a `ReactNode`**
The sample renders `<p>{msg.content}</p>`. `content` is typed `string | ContentPart[] | Record<…> | undefined` — a multimodal union — so that line does not compile. This repo guards it to a string first. The sample also imports `randomUUID` from `@copilotkit/shared`, a transitive package rather than a declared dependency; `crypto.randomUUID()` is used instead.

**7. Model id inconsistency in the Quickstart**
The env block sets `OPENAI_CHAT_MODEL_ID=gpt-5.4-mini` while the Python code directly beneath defaults to `gpt-4o-mini`. This repo keeps the code's default.

**8. `@copilotkit/react-ui` in the install line**
The Quickstart installs `@copilotkit/react-ui`, which is the v1 package. Every component used on that same page comes from `@copilotkit/react-core/v2`, so this repo does not depend on it.

**9. The agent-framework packages are pre-release**
`uv add` fails without `--prerelease=allow`; the docs' install commands omit it.

**10. Readables: the forwarded context was never reaching the agent** — *resolved 2026-09-04*
This was logged here as "intermittent, not yet traced to either side". It was neither. `agent_framework_ag_ui` 1.1.0 — the version `backend/uv.lock` pins — never reads `input_data["context"]` at all, so the colleagues list was dropped on **every** run. The apparent intermittency was the model sometimes inventing a plausible answer instead of saying it had nothing, which with placeholder names like *John Doe* is hard to tell from a correct one.

The docs reversed themselves on 2026-09-04: the Python sample used to be a plain agent commented "frontend context is forwarded automatically", and is now a `ContextAwareAgent` subclass that folds the context into a system message itself. This repo runs that subclass on its own endpoint, `/context_agent`, and `/readables` binds to it.

Measured, same payload and question against both endpoints: `/sample_agent` (the old sample) names 0 of 3 colleagues; `/context_agent` names 3 of 3. Full write-up in `QA-FINDINGS-2026-09-04.md` §1.

**11. Thread serving requires CopilotKit Intelligence and multi-route configuration**
Upstream docs have transitioned runtime examples to `@copilotkit/runtime/v2` with `createCopilotRuntimeHandler` on catch-all `[[...slug]]` routes. For full thread features, `<CopilotThreadsDrawer>` requires a license status of `valid` or `expiring`, and `/info` only reports `licenseStatus` when the runtime is constructed with a `CopilotKitIntelligence` instance. An in-memory runtime therefore leaves the drawer locked even though its own thread-list routes answer 200. This repo isolates thread configurations in `/api/copilotkit-threads/[[...slug]]`.

Also not implemented: the lifecycle page's "create a thread with your own API on the first message". It needs a backend that mints thread rows, which this harness does not have, so it is left out rather than faked.

**12. The Threads Drawer's `slot` customization does not work through the React wrapper**
[The drawer page](https://docs.copilotkit.ai/ms-agent-python/prebuilt-components/copilot-threads-drawer) documents three escape hatches, the first being "project children with a `slot` attribute (`header`, `empty`, `footer`, `memories`, `launcher-icon`)" with this sample:

```tsx
<CopilotThreadsDrawer>
  <span slot="header">My conversations</span>
</CopilotThreadsDrawer>
```

The underlying `<copilotkit-threads-drawer>` web component does declare all five slots. But the React wrapper in `@copilotkit/react-core` 1.68.2 declares no `children` on `CopilotThreadsDrawerProps` (so the sample is a type error) and renders the element as `React.createElement(TAG, props, rowChildren)` — where `rowChildren` is derived solely from `renderRow`. Any other child is dropped. `renderRow`, `limit`, `label`, and `recentLabel` all work; `/threads/drawer` uses those four and reports the omission rather than working around it.

Verified against `@copilotkit/runtime` and `@copilotkit/react-core` 1.68.2.

---

**13. `@ag-ui/client` is installed twice**
The Quickstart install line adds `@ag-ui/client` as a direct dependency, but `@copilotkit/runtime` and `@copilotkit/react-core` 1.69.2 both pin their own `@ag-ui/client@0.0.57`. With the doc's `npm install @ag-ui/client` resolving 0.0.58, the tree holds two copies, and `new HttpAgent(...)` from the outer copy is not assignable to the runtime's `AbstractAgent` ("separate declarations of a private property `_debug`") — the runtime route fails to typecheck. `npm ls @ag-ui/client` shows the split. This repo pins the direct dependency to `0.0.57`, exactly what the CopilotKit packages resolve, so one copy is shared; bumping it independently reintroduces the error.

---

## 10. Troubleshooting

| Symptom                                       | Cause                                                     | Fix                                                                            |
| --------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Chat sends, nothing streams back              | Agent process down, or `MS_AGENT_URL` wrong               | Check the home page connection panel; run `uv run --prerelease=allow main.py`. |
| Every chat fails with 401                     | `AUTH_BEARER_TOKEN` set without a matching frontend token | Set `NEXT_PUBLIC_AUTH_BEARER_TOKEN` too and restart both, or unset both.       |
| Tool runs but custom UI never renders         | Renderer name ≠ tool name                                 | `useRenderTool({ name })` must equal the Python tool name exactly.             |
| State panel stays empty                       | State key and tool argument disagree                      | Check `predict_state_config` maps the tool argument onto the state key.        |
| `uv add` fails on pre-release markers         | Pre-releases not enabled                                  | Add `--prerelease=allow`.                                                      |
| Backend exits: "No model provider configured" | No key set                                                | Copy `.env.example` → `backend/.env`. Failing fast is intentional.             |
| Inspector never appears                       | Production build                                          | It is disabled unconditionally in production. Use `npm run dev`.               |
| Connection errors mentioning `localhost`      | DNS resolving to IPv6 while the server binds IPv4         | Use `127.0.0.1` in `MS_AGENT_URL`.                                             |

---

## Doc drift detection

`/doc-sync` keeps this repo honest about the docs it mirrors. Press **Sync docs now** (on the landing page or on `/doc-sync`) and it fetches the markdown source behind all 27 tracked doc pages, diffs each against the copy stored in `doc-snapshot/`, replaces that copy, and reports what moved — ranked by whether the change can actually break an implementation.

Doc pages are fetched by appending `.md` to their URL, which returns the authored MDX rather than 250 KB of rendered HTML. Every response is checked for `text/markdown` before it is allowed near the snapshot: a URL that misses the markdown handler still answers `200` with the HTML app shell, and writing that in would destroy the baseline and report the whole corpus as rewritten on the next run. A run commits all pages or none.

**Severity is decided by where the edit landed**, not how big it was:

| Level | Trigger |
|---|---|
| **High** | a changed line inside a fenced code block, a changed fence count, or a page that now 404s and is gone from the sitemap |
| **Medium** | a changed heading, changed frontmatter `title`/`description`, or prose in the same section as changed code |
| **Low** | other prose |

**Sections checked** lists every tracked page in nav order with a mark — `✓` unchanged, `!` changed, `+` stored, `✗` 404, `~` unstable, `·` not checked. Expanding a row shows the comparison: for a changed page the diff (`−` existing snapshot, `+` newly fetched), and for an unchanged one the two matching hashes, which is the evidence the check ran.

**`doc-snapshot/CHANGELOG.md`** is the record that survives a re-sync. Because syncing replaces the copy it just compared against, the run *after* a change reports nothing — so the changelog is written at the moment of discovery and never rewritten later. Only changed pages are recorded; a clean run does not touch the file. It keeps the three most recent dated entries, counted rather than aged, so a change from six weeks ago still shows if nothing has happened since.

**One sync date.** `syncedAt` in `doc-snapshot/manifest.json`, rewritten on every run and shown on `/`, `/status` and `/doc-sync`. There is no hand-maintained date to keep in step with it.

**To test it**, edit any `doc-snapshot/pages/*.md` file and press the button — a line inside a code fence for High, a `##` heading for Medium, a sentence for Low. The comparison reads the stored file itself, so nothing else needs changing. Both `/doc-sync` and the changelog label the result as a local snapshot edit rather than upstream drift.

Commit `doc-snapshot/` — `pages/`, `manifest.json` and `CHANGELOG.md` are the baseline every diff is taken against. `reports/` is gitignored derived data.

---

## 11. Project structure

```
CPK-MS-Agent-Python/
├── CLAUDE.md
├── README.md
├── project-context.md         # how docs/ and code relate; rules for changing either
├── .env.example
│
├── frontend/                  # Next.js 16 app — also hosts the Copilot Runtime
│   └── src/
│       ├── app/
│       │   ├── layout.tsx             # providers + chrome; imports v2 styles
│       │   ├── page.tsx               # / — intro + connection check
│       │   ├── status/page.tsx        # status overview table
│       │   ├── api/copilotkit/[[...slug]]/route.ts   # ★ CopilotRuntime + 3 HttpAgents (as documented)
│       │   ├── api/copilotkit-threads/[[...slug]]/route.ts
│       │   │                          # ★ 2nd runtime: multi-route + Intelligence, /threads only
│       │   ├── threads/               # ★ 4 routes: overview, drawer, headless, lifecycle
│       │   └── <doc route>/
│       │       ├── page.tsx           # notes + exact source (server component)
│       │       └── demo-chat/page.tsx # ★ the running feature, chrome-free
│       ├── components/
│       │   ├── providers.tsx          # ★ CopilotKitProvider, inspector, auth header
│       │   ├── threads-provider.tsx   # ★ /threads provider: threads runtime + REST transport
│       │   ├── source-code.tsx        # ★ renders a repo file verbatim
│       │   ├── app-chrome.tsx         # sidebar layout, skipped on /demo-chat
│       │   ├── demo-frame.tsx         # thin bar + back link for demo routes
│       │   ├── nav-sidebar.tsx        # nav built from nav-config
│       │   ├── route-header.tsx       # title + status badge + doc + demo link
│       │   ├── backend-health.tsx     # server component; probes the agent
│       │   └── ui.tsx                 # Panel, Callout, CodeBlock, TryIt
│       └── lib/
│           ├── nav-config.ts          # ★ single source of truth: routes, docs, status
│           ├── source.ts              # ★ server-only reader behind SourceCode
│           └── health.ts              # server-only agent probe
│
├── backend/                   # Python — FastAPI + agent-framework-ag-ui
│   ├── pyproject.toml
│   ├── main.py                # ★ app, CORS, auth middleware, 3 endpoint mounts
│   ├── agents.py              # ★ the 3 doc-defined agents, tools, state schemas
│   └── chat_client.py         # OpenAI / Azure OpenAI client construction
│
├── doc-snapshot/              # synced copy of the live docs; the drift baseline
│   ├── pages/                 # one .md per doc page
│   ├── manifest.json          # ★ syncedAt — the doc-sync date in the header above
│   └── CHANGELOG.md           # what changed upstream, written at discovery
│
├── autorecorder/              # portable screen-recording suite (Node/TS)
│   ├── ADAPT.md               # ★ how to port this folder to another framework
│   ├── config/                # ★ the entire adaptation surface (3 files)
│   ├── actions/               # ★ per-page interaction scripts + registry
│   │   └── threads.action.ts  # ★ the 3 Rich Threads handlers
│   ├── core/                  # frozen: engine, IDE simulator, overlays, doctor
│   └── videos/                # exported .webm, one per doc page
│
└── 1-cli-testing/              # scratch space for CopilotKit CLI experiments
```

The nav, every route header, the demo links, and the status table all derive from `frontend/src/lib/nav-config.ts`.

---

## 12. References

**Getting Started** — [Quickstart (bring your own agent)](https://docs.copilotkit.ai/ms-agent-python/quickstart?agent=bring-your-own)

**Basics** — [Prebuilt Components](https://docs.copilotkit.ai/ms-agent-python/prebuilt-components)

**Custom Look and Feel** — [Slots](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/slots) † · [Headless UI](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/headless-ui) † · [Programmatic Control](https://docs.copilotkit.ai/ms-agent-python/programmatic-control) · [Inspector](https://docs.copilotkit.ai/ms-agent-python/inspector)

**Generative UI** — [Your Components · Display-only](https://docs.copilotkit.ai/ms-agent-python/generative-ui/your-components/display-only) · [Your Components · Interactive](https://docs.copilotkit.ai/ms-agent-python/generative-ui/your-components/interactive) · [Tool Rendering](https://docs.copilotkit.ai/ms-agent-python/generative-ui/tool-rendering) · [State Rendering](https://docs.copilotkit.ai/ms-agent-python/generative-ui/state-rendering) · [A2UI · Styling](https://docs.copilotkit.ai/ms-agent-python/generative-ui/a2ui/styling) ‡ · [A2UI · Advanced](https://docs.copilotkit.ai/ms-agent-python/generative-ui/a2ui/advanced) ‡

**App Control** — [Frontend Tools](https://docs.copilotkit.ai/ms-agent-python/frontend-tools) · [WebMCP](https://docs.copilotkit.ai/ms-agent-python/webmcp) ‡ · [Governed Actions](https://docs.copilotkit.ai/ms-agent-python/human-in-the-loop/governed-actions) ‡

**Shared State** — [Reading agent state](https://docs.copilotkit.ai/ms-agent-python/shared-state/in-app-agent-read) · [Writing agent state](https://docs.copilotkit.ai/ms-agent-python/shared-state/in-app-agent-write) · [Readables](https://docs.copilotkit.ai/ms-agent-python/agent-app-context)

**Microsoft Agent Framework** — [Authentication](https://docs.copilotkit.ai/ms-agent-python/auth)

**Rich Threads** — [Overview](https://docs.copilotkit.ai/ms-agent-python/threads) · [Threads Drawer](https://docs.copilotkit.ai/ms-agent-python/prebuilt-components/copilot-threads-drawer) · [Headless Threads](https://docs.copilotkit.ai/ms-agent-python/headless-threads) · [Thread & History Lifecycle](https://docs.copilotkit.ai/ms-agent-python/threads-lifecycle) · [Import & Synchronize History](https://docs.copilotkit.ai/ms-agent-python/threads-import) ‡

**Backend** — [Copilot Runtime](https://docs.copilotkit.ai/ms-agent-python/copilot-runtime) · [AG-UI](https://docs.copilotkit.ai/ms-agent-python/ag-ui)

**Intelligence** — [Quickstart](https://docs.copilotkit.ai/ms-agent-python/intelligence/quickstart) ‡

**External** — [Microsoft Agent Framework docs](https://learn.microsoft.com/en-us/agent-framework/) · [AG-UI protocol](https://ag-ui.com) · [AG-UI event types](https://docs.ag-ui.com/concepts/events)

† Resolves but is absent from the doc sidebar as of the sync date.

‡ Tracked for reference but not implemented — see §8.
