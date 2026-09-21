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
| `COPILOTKIT_LICENSE_TOKEN`          | `frontend/.env.local` | `/threads`, self-hosted/OSS only. Signed license, verified offline. Not issued for managed projects. |
| `CPK_INTELLIGENCE_API_KEY`          | `frontend/.env.local` | `/threads` only. Project key for the managed thread store. `INTELLIGENCE_API_KEY` still read. |
| `INTELLIGENCE_API_URL`              | `frontend/.env.local` | `/threads` only. Managed Intelligence REST endpoint.                                        |
| `INTELLIGENCE_GATEWAY_WS_URL`       | `frontend/.env.local` | `/threads` only. Managed realtime endpoint — a different host from the REST one.             |

> Next.js does not read the repo-root `.env`. Frontend variables belong in `frontend/.env.local`. In practice you only need `OPENAI_API_KEY`.


The `/threads` variables are the only credentials in this repo that are not optional for the feature they serve — thread storage lives in CopilotKit's managed Intelligence platform, not in the agent or the runtime. `npx copilotkit@latest init` mints them; this repo's values were copied from the project it scaffolded under `1-cli-testing/`. Leave them unset and `/threads` degrades rather than breaking: the read-only thread routes still answer from the runtime's in-memory fallback, mutations return 422, and the prebuilt drawer renders locked.

As of the 2026-09-15 sync the drawer page splits these by deployment: `CPK_INTELLIGENCE_API_KEY` is the credential for a managed project, and `COPILOTKIT_LICENSE_TOKEN` is for self-hosted or offline licensing only — managed setup does not issue one, and it does not substitute for the project key. The runtime gate here follows that split: the project key alone wires Intelligence, and the license token is passed only when set.

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

**`/custom-look-and-feel/markdown`** _(live but absent from the sidebar)_ — The `markdownRenderer` slot, in the three forms the page publishes plus one probe of ours. **Try:** ask for a reply containing an h2, a link, a `<kbd>`, a `<sup>` and a `<reference-chip>`, then press **Read the rendered HTML**. **Pass:** tab 1 renders the link and heading in the amber `my-link` / `my-heading` styles and the readout carries no `node="[object Object]"`; tab 2 is the default renderer, so the readout does carry `data-streamdown="link"`; tab 3 shows the raw markdown in a `<pre>`; tab 4, which is ours and not doc code, does write `node="[object Object]"`. No tab shows a `<reference-chip>` — it is stripped and its text kept. **Fail:** all four tabs look alike, meaning the slot object never reached the renderer. See §9 #20.

**`/custom-look-and-feel/headless-ui`** _(live but absent from the sidebar)_ — A chat with zero CopilotKit chrome. **Try:** `Tell me a joke`. **Pass:** messages stream into hand-written bubbles. **Fail:** Send does nothing.

**`/programmatic-control`** — Drives the agent with no chat component. **Pass:** status flips to Running, the transcript grows, Stop halts it mid-stream.

**`/inspector`** — The debugging overlay, mounted by the provider. **Pass:** the event list fills and Available Agents lists all four ids. **Fail:** no inspector — it is force-disabled in production builds, so use `npm run dev`.

### Generative UI

**`/generative-ui/your-components/display-only`** — `useComponent`. **Try:** `Show the weather card for Tokyo: 77 degrees, clear`. **Pass:** a bordered card renders inline. **Fail:** plain text with no card.

**`/generative-ui/your-components/interactive`** — `useHumanInTheLoop` approval gate. **Try:** `Run the command rm -rf /tmp/cache`. **Pass:** an approval card renders with the command in a code block and **nothing further streams** until you click Approve or Deny; the agent's next message reflects your choice. **Fail:** plain text with no buttons, or it continues without waiting.

**`/generative-ui/tool-rendering`** — A named renderer for `get_weather` plus a wildcard fallback. **Try:** `What's the weather in Tokyo?` **Pass:** "Calling weather API..." becomes "Called the weather API for Tokyo." **Fail:** raw JSON, or nothing.

**`/generative-ui/state-rendering`** — `searches` state streamed from `search_agent`. **Try:** `Search for the tallest mountains`, then `Now also search for the deepest oceans`. **Pass:** a checked item appears as the tool call streams; the second prompt adds a second item while keeping the first. **Fail:** the list stays empty.

**`/generative-ui/a2ui/fixed-schema`** — The agent draws a *surface*, not a sentence. `display_flight` returns an `a2ui_operations` container (`createSurface` → `updateComponents` → `updateDataModel`); the component tree is hand-authored in `backend/a2ui_schemas/flight_schema.json` and the tool supplies only the data model. **Try:** `Find me one flight from JFK to LHR — just the single best option`. **Pass:** a flight card renders in the stream — two airport codes either side of an arrow, an airline pill, a total. **Fail:** a prose answer (the tool was not called), or a wall of JSON beginning `a2ui_operations` (the A2UI middleware is not applied to this agent), or a card with every value blank (the `{ path }` bindings did not resolve — see Known issues #14). Ask for *one* flight: offered a plain "find me flights", the model calls the tool once per airline and all of them draw over the same `surfaceId`.

**`/generative-ui/a2ui/styling`** — 🚧 **Tracked, not implemented.** Theming A2UI surfaces through CSS custom properties scoped to `.a2ui-surface`. Fixed Schema A2UI above now paints a real surface here, so this page became implementable — the theme variables it documents are simply not wired up yet. DeepAgentspy-react implements it.

**`/generative-ui/a2ui/advanced`** — 🚧 **Tracked, not implemented.** Replacing the built-in progress indicator shown while the `render_a2ui` tool call is in flight. That only happens on the Dynamic Schema A2UI path, which this repo does not map — only the fixed-schema half — so a custom renderer would never mount. DeepAgentspy-react implements this page too.

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

### Cookbook

**`/cookbook/jev-generative-ui`** _(live but absent from the section sidebar)_ — ⚠️ **Half of it runs, and the page says which half.** The recipe's own division is that your application owns the schemas, the catalog, the prepared controls and the confirmed actions, while Jev decides which control fits and how the rooms rank. The first half is shipped verbatim: `lib/workspaces.ts` and the published `readAction`, driving the published `Picker` render block. The second half is quoted and not shipped, because `@typesafe-ai/sdk` is not installed and `TYPESAFE_API_KEY` is issued by TypeSafe, a third-party vendor. **Try:** type `I need somewhere to work`, then place the comparison panel by hand and click Studio. **Pass:** free text answers with a note naming the missing module and key rather than a panel; clicking Studio writes `Selected Studio. No booking was made.` and sets the Selected workspace line, which is `readAction` running. **Fail:** a panel appears on its own after free text — nothing here can choose one, so that would mean something is standing in for the Jev call. The two panel-placing buttons are labelled on screen as a stand-in, and the option order is the catalog's, not a Jev ranking. See §9 #21.

---

## 8. Testing checklist / current status

<!-- status-table:begin — generated by ci/write-readme-status.mjs; edit Notes here, everything else in nav-config.ts -->
| Doc page                                                      | Route                                         | Status        | Recorded | Notes                                                                                                                    |
| ------------------------------------------------------------- | --------------------------------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/ms-agent-python`                                            | `/`                                           | 📖 Reference   | —        | Server-side agent probe.                                                                                                 |
| `/ms-agent-python/quickstart?agent=bring-your-own`            | `/quickstart`                                 | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/prebuilt-components`                        | `/prebuilt-components`                        | ✅ Working     | 🎬        | Doc page is a 191-byte component stub.                                                                                   |
| `/ms-agent-python/custom-look-and-feel/slots`                 | `/custom-look-and-feel/slots`                 | ✅ Working     | 🎬        | **Not in the doc sidebar**, but resolves.                                                                                |
| `/ms-agent-python/custom-look-and-feel/markdown`              | `/custom-look-and-feel/markdown`              | ✅ Working     | 🎬        | All three snippets verbatim; all three typecheck. **Not in the doc sidebar** — see §9 #20.                               |
| `/ms-agent-python/custom-look-and-feel/headless-ui`           | `/custom-look-and-feel/headless-ui`           | ✅ Working     | 🎬        | **Not in the doc sidebar**; resolves.                                                                                    |
| `/ms-agent-python/programmatic-control`                       | `/programmatic-control`                       | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/inspector`                                  | `/inspector`                                  | ✅ Working     | 🎬        | Dev-only by design.                                                                                                      |
| `/ms-agent-python/generative-ui/your-components/display-only` | `/generative-ui/your-components/display-only` | ✅ Working     | 🎬        | Needs no backend declaration.                                                                                            |
| `/ms-agent-python/generative-ui/your-components/interactive`  | `/generative-ui/your-components/interactive`  | ✅ Working     | 🎬        | `useHumanInTheLoop` approval gate. Needs no backend declaration.                                                         |
| `/ms-agent-python/generative-ui/tool-rendering`               | `/generative-ui/tool-rendering`               | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/generative-ui/state-rendering`              | `/generative-ui/state-rendering`              | ✅ Working     | 🎬        | Uses `search_agent`.                                                                                                     |
| `/ms-agent-python/generative-ui/a2ui/fixed-schema`            | `/generative-ui/a2ui/fixed-schema`            | ✅ Working     | 🎬        | Own agent, own provider, own catalog. Catalog schemas are zod 3 — see Known issues #14.                                  |
| `/ms-agent-python/generative-ui/a2ui/styling`                 | `/generative-ui/a2ui/styling`                 | 🚧 Not started | —        | Tracked for drift. Implementable now that fixed-schema paints a surface; theme variables not wired.                      |
| `/ms-agent-python/generative-ui/a2ui/advanced`                | `/generative-ui/a2ui/advanced`                | 🚧 Not started | —        | Tracked for drift. Builds on Dynamic Schema A2UI, which is unmapped here.                                                |
| `/ms-agent-python/generative-ui/frontend-cards`               | `/generative-ui/frontend-cards`               | 🚧 Not started | —        | Tracked for drift only — no demo yet.                                                                                    |
| `/ms-agent-python/frontend-tools`                             | `/frontend-tools`                             | ✅ Working     | 🎬        |                                                                                                                          |
| `/ms-agent-python/webmcp`                                     | `/webmcp`                                     | 🚧 Not started | —        | Tracked for drift. Needs Chrome 149+ and the WebMCP origin trial.                                                        |
| `/ms-agent-python/human-in-the-loop/governed-actions`         | `/human-in-the-loop/governed-actions`         | ✅ Working     | 🎬        | Tool-call variant. `useInterrupt` half needs a backend that pauses a run; published zod 3 schema retranslated for zod 4. |
| `/ms-agent-python/human-in-the-loop/interrupt-flow`           | `/human-in-the-loop/interrupt-flow`           | 🚧 Not started | —        | Tracked for drift only — no demo yet.                                                                                    |
| `/ms-agent-python/human-in-the-loop/tool-based`               | `/human-in-the-loop/tool-based`               | 🚧 Not started | —        | Tracked for drift only — no demo yet.                                                                                    |
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
| `/ms-agent-python/intelligence/memories`                      | `/intelligence/memories`                      | 🚧 Not started | —        | Tracked for drift only — no demo yet.                                                                                    |
| `/ms-agent-python/learning`                                   | `/learning`                                   | 🚧 Not started | —        | Tracked for drift only — no demo yet.                                                                                    |
| `/ms-agent-python/cookbook/jev-generative-ui`                 | `/cookbook/jev-generative-ui`                 | ⚠️ Partial    | 🎬        | Prepared controls only. The Jev decision layer needs a vendor key and three absent packages — see §9 #21.                |
<!-- status-table:end -->

**Legend:** ✅ Working · ⚠️ Partial · 📖 Reference · 🚧 Not started · ❌ Broken · 🎬 driven by the autorecorder. Generated by `npm run readme:status` from `frontend/src/lib/nav-config.ts` and `autorecorder/config/pages.config.ts`; only the Notes column is edited here.

Out of scope by request: CLI, Build with agents, MCP Apps, Dynamic Schema A2UI, the rest of Intelligence Platform, Troubleshooting. Also out of scope: `/ms-agent-python/threads-import` (Import & Synchronize Thread History) — it migrates existing LangGraph/ADK conversations into the platform store, and there is nothing here to migrate from.

**Tracked without a demo.** Three pages carry a route, a nav entry and a snapshot so drift is watched, but nothing is implemented behind them and the recorder does not touch them: `/ms-agent-python/webmcp`, `/generative-ui/a2ui/styling` and `/generative-ui/a2ui/advanced`. The reason is on each route’s page and in §7. Fixed Schema A2UI is implemented and recorded; the A2UI overview and `dynamic-schema`, along with the rest of `/ms-agent-python/intelligence/`, stay in `doc-snapshot/manifest.json`’s `knownUnmapped` list.

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

**14. The A2UI catalog API is zod 3 only, and failing it is silent**
`@copilotkit/a2ui-renderer` 1.69.2 depends on `zod@^3.25` and leaks that through its public types: `CatalogDefinitions` is declared against zod 3's `ZodObject`, so a zod 4 schema is not assignable. This repo is on zod 4 everywhere else, including the schemas its frontend tools are declared with.

Casting past the type error builds and then fails quietly, which is the part worth knowing — the props schema is not documentation. `GenericBinder` in `@a2ui/web_core` walks it with `_def.typeName` and `_def.shape()` to decide which props are `{ path }` data-model bindings, and zod 4 moved both. A zod 4 catalog therefore paints a surface whose bindings are never resolved: the card renders with every value blank, no error in the console and none in the run.

`frontend/package.json` carries `"zod-v3": "npm:zod@^3.25.75"` and only `generative-ui/a2ui/fixed-schema/a2ui/definitions.ts` imports it. Two copies of zod 3 in one tree is fine here: the binder matches on `typeName` strings rather than `instanceof` specifically so a schema built by another module instance still reads correctly, and says so in its own comment.

**15. The landing page's new `route.ts` cannot serve the handler it mounts, and reads an env var nothing defines**
The 2026-09-21 sync gave [`/ms-agent-python`](https://docs.copilotkit.ai/ms-agent-python) a runtime snippet of its own, titled `app/api/copilotkit/route.ts`. Two things in it are wrong, and neither fails loudly.

The filename contradicts every other page that mounts the same handler. [Quickstart](https://docs.copilotkit.ai/ms-agent-python/quickstart) and [Copilot Runtime](https://docs.copilotkit.ai/ms-agent-python/copilot-runtime) both title the identical `createCopilotRuntimeHandler` snippet `app/api/copilotkit/[[...slug]]/route.ts`, and the latter states the reason in its own prose: the route "lives at a **catch-all** path ... so the runtime can serve its sub-routes (`/info`, agent runs, threads) rather than a single URL". A plain `route.ts` in Next.js 16.3.2 receives its exact path only. Calling the landing snippet's handler in-process at `@copilotkit/runtime` 1.69.2, `GET /api/copilotkit/info` answers 200 with the agents map, but that path is never routed to a plain `route.ts`; the one path that is, the bare base, answers `{"error":"Not found"}` on both `GET` and `POST`. A reader who follows the landing page gets a 404 on every request while `next build` succeeds.

The agent URL is `process.env.AGENT_URL!`. No tracked page under `/ms-agent-python` sets `AGENT_URL`: the Quickstart hardcodes `"http://localhost:8000/"` in the same position, and its env blocks carry model provider keys only. The non-null assertion satisfies the compiler and `new HttpAgent({ url: undefined })` constructs without complaint, so the gap surfaces as a failed run rather than a startup error. This repo's own variable is `MS_AGENT_URL`, a name the docs never publish.

Implemented verbatim at `frontend/src/app/api/copilotkit-landing/route.ts`, with `AGENT_URL` left unset. One deviation, the mount path: `basePath` is `/api/copilotkit-landing` rather than the published `/api/copilotkit`, because Next.js refuses a plain `route.ts` beside the optional catch-all that Quickstart and Copilot Runtime need ("You cannot define a route with the same specificity as a optional catch-all route"). The published line is quoted in a comment above the shipped one. No provider in this harness points at the mount; it exists so the snippet is compiled as published instead of described.

Verified against `@copilotkit/runtime` 1.69.2 (declared `^1.69.2`), `@copilotkit/react-core` 1.69.2 (declared `^1.69.2`), `@ag-ui/client` 0.0.57 (declared `0.0.57`), `next` 16.3.2 (declared `16.3.2`).

**16. `BuiltInAgent`'s `learnedSkills` option does not exist in the installed runtime**
The 2026-09-21 sync added a `BuiltInAgent` row to the adapter table on [Automatic learned skill delivery](https://docs.copilotkit.ai/ms-agent-python/intelligence/learned-skills), against `@copilotkit/runtime/v2` with "no wrapper or separate adapter package is required". It is the first adapter on that page this repo could host, since it runs in the Next runtime rather than in the Python agent. Neither of its two snippets compiles.

Classic mode: `learnedSkills` is not a property of `BuiltInAgentConfiguration` (TS2353). Factory mode: the same error against `BuiltInAgentClassicConfig | BuiltInAgentAISDKFactoryConfig`, plus `Property 'learnedSkills' does not exist on type 'AgentFactoryContext'` (TS2339) on the destructured factory argument. The prose then says to "Import `BuiltInAgentFactoryContext` from `@copilotkit/runtime/v2` to annotate a factory context"; that name is not exported and the compiler suggests `AgentFactoryContext` (TS2724), which is what the factory is actually handed. Only `convertMessagesToVercelAISDKMessages` resolves.

Both snippets are quoted on `/intelligence/learned-skills` with the compiler output beside them, rather than shipped as a file: an uncompilable module takes the whole frontend typecheck down, and the snippet is the finding either way. The page's own "Deployment requirements" section still sits at the bottom, so nothing warns a reader before the setup steps.

Verified against `@copilotkit/runtime` 1.69.2 (declared `^1.69.2`), `ai` 6.0.256, `@ai-sdk/openai` 3.0.97. The CLI scaffold under `1-cli-testing/app` declares 1.70.2, which is not installed here.

**17. The agent-discovery error the Copilot Runtime page names is not the one raised**
The same sync added ["Which name identifies an agent"](https://docs.copilotkit.ai/ms-agent-python/copilot-runtime) to the Copilot Runtime page. Its warning callout says that asking for an unregistered name "resolves no agent, and the frontend raises `CopilotKitAgentDiscoveryError`".

At `@copilotkit/react-core` 1.69.2 that class is not exported from `@copilotkit/react-core/v2` at all (importing it is TS2305). `useAgent` throws a plain `Error` during render: ``useAgent: Agent 'X' not found after runtime sync (runtimeUrl=...). Known agents: [...]``. The class does exist in the v1 surface, where `useCoAgentStateRender` raises it as a banner error, so the page describes v1 behaviour in a v2 section. The rest of the callout holds: the message does list the keys the runtime returned.

The section is otherwise accurate against this repo, which is a live instance of the case it describes. `backend/agents.py` builds the quickstart agent as `Agent(name="MyAgent")`, the runtime registers it under `my_agent`, and `GET /api/copilotkit/info` advertises the map key as the agent's `name`. `/copilot-runtime/demo-chat` runs both halves: the `/info` key readout the section closes on, and a hook asking for `MyAgent` behind an error boundary.

Verified against `@copilotkit/react-core` 1.69.2 (declared `^1.69.2`), `@copilotkit/runtime` 1.69.2 (declared `^1.69.2`).

**18. The Quickstart's new `project select` step has no sign-in before it, and moved the key to a file Next.js may not read**
Step 1 stopped issuing a license key this sync: it is now "Sign in to managed Intelligence" through a web signup link. The runtime step then tells you to run `npx copilotkit@latest project select` from the frontend app directory. Nothing between them runs `copilotkit login`, and `project select` needs a CLI session rather than a browser one. This repo's own recorder config encodes that prerequisite: the `project-select` flow is ordered after a `login` flow and aborts on `/not (?:logged|signed) in/i`, observed against `copilotkit@4.9.24`.

The env file also changed name without changing scope. The key used to be shown as `.env.local`; it is now `.env`, described as what `project select` writes. Both are read by Next.js in a Next app, so the instruction works there, but the same page's agent steps use `agent/.env` for the Python process, and a reader with one `.env` per repo now has two files with the same name and different owners. This repo keeps its copy in `frontend/.env.local`.

Verified against `copilotkit` CLI 4.9.24 (invoked as `@latest`, so unpinnable by construction), `@copilotkit/runtime` 1.69.2 (declared `^1.69.2`).

**19. Learning and Learned skills disagree about how a container is named**
[Learning](https://docs.copilotkit.ai/ms-agent-python/learning) gained a "Set up automatic skill delivery" section this sync whose manual path is an env block: `CPK_INTELLIGENCE_API_KEY` plus `CPK_INTELLIGENCE_LEARNING_CONTAINER_ID=expense-review`, "in the agent's server environment". [Learned skills](https://docs.copilotkit.ai/ms-agent-python/intelligence/learned-skills) says the opposite for its newest adapter: "Omitting the configuration disables all skill requests, even when delivery environment variables exist." For `BuiltInAgent` the container id has to be written in code, so following Learning's manual steps alone produces an agent that requests nothing and reports no error.

Learning's manual list also names "LangGraph Python, LangGraph TypeScript, Mastra, Google ADK, or Microsoft Agent Framework" while linking to the adapter section whose first row is now `BuiltInAgent`.

Neither page is implemented here beyond drift tracking: both routes are stubs, and the workflow needs a provisioned Learning container with published Skills. Verified by reading the two snapshots at `doc-snapshot/pages/ms-agent-python__learning.md` and `...__intelligence__learned-skills.md` as synced 2026-09-21.

**20. Markdown Rendering: the page is accurate, and three things around it are not**
[Markdown Rendering](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/markdown) was tracked on 2026-09-21 and implemented at `/custom-look-and-feel/markdown`. Unusually for this repo, every claim on it held: the `components` map, the class string and the replacement renderer all ship verbatim at `frontend/src/app/custom-look-and-feel/markdown/published-snippets.tsx`, all three typecheck, and the published `error TS2353` for a custom tag key reproduces word for word. Four things are still worth recording.

*The published "Replace the renderer" snippet does compile here, which #5 above would predict it does not.* #5 is about `SlotValue<C> = C | string | Partial<ComponentProps<C>>` pinning a replacement to the default component's statics, and it is why the Slots page's level-3 sample fails. `CopilotChatAssistantMessage.MarkdownRenderer` is declared `React.FC<Omit<ComponentProps<typeof Streamdown>, "children"> & { content: string }>` with no statics at all, unlike `CopilotChatMessageView`, which carries a required `Cursor`. So the bare `PlainText` is assignable and `npx tsc --noEmit` reports nothing on it. Recorded because the inverse would have been the finding.

*`my-link` and `my-heading` are named and never defined.* The `components` snippet's only visible effect is `className="my-link"` and `className="my-heading"`. Neither class is defined anywhere on the page, and neither is a Tailwind utility. Followed exactly, the snippet is a net loss: it strips Streamdown's own classes and its `data-streamdown` attribute (which the page's own third warning says it will) and puts an undefined class in their place, so the override looks like it did nothing. Both classes are defined in `frontend/src/app/globals.css`, with the reason in a comment there, so the swap is visible on camera. The snippet itself is untouched.

*The published idiom for dropping `node` is an ESLint warning.* Destructuring `node` and not using it is the fix the page prescribes and is exactly what `@typescript-eslint/no-unused-vars` reports — two warnings per overridden tag, at `published-snippets.tsx(77,21)` and `(82,22)`. Shipped as published, warning and all. The rule's `ignoreRestSiblings` default would have spared this if `node` were spread rather than named, but naming it is the whole point. Unmentioned on the page. Note also that the compiler does not catch the mistake the page warns about: a JSX spread carrying `node` typechecks clean, so the only signal is the rendered DOM, which is why `/custom-look-and-feel/markdown/demo-chat` carries a **Read the rendered HTML** button and a fourth tab, ours and not doc code, that spreads `node` on purpose.

*The page publishes one of the two errors a reader will see.* Adding `"reference-chip"` to the map produces the documented `TS2353` **and** a `TS7031` on the callback, because an unknown key also loses its contextual typing. Both are quoted on the route page.

Two deviations, both marked in place in `published-snippets.tsx`: `agentId="my_agent"` is added to each snippet, because no snippet on the page (or on Slots) binds its chat to an agent and this harness registers five named agents and no `default`, so the published form throws in `useAgent` during render; and a `labels={{ welcomeMessageText }}` is set on two of them so the active tab is named on screen. The published snippets are quoted directly above each shipped one. The file itself is a deviation of a kind: the first snippet is published as `export function Chat()` inside `page.tsx`, and this repo does not hang extra named exports off an App Router route module, so it lives in a sibling module and the `export` survives.

Finally, the page is live, in `sitemap.xml`, and absent from the section's own sidebar tree, which lists only `Slots` and `Fully Headless UI` under Custom Look and Feel. It is reachable by URL, search or sitemap only. (Read from the sidebar JSON the docs site server-renders. The same read shows that `slots` and `headless-ui`, which `nav-config.ts` still marks `offNav: true`, *are* in that sidebar now — a stale marking in this repo rather than a doc defect, left alone here.)

Verified against `@copilotkit/react-core` 1.69.2 (declared `^1.69.2`), `streamdown` 1.6.11 (transitive, undeclared), `typescript` 5.9.3, `eslint-config-next` 16.3.2, `next` 16.3.2, `react` 19.2.8.

**21. Jev: fast generative UI pins a stack this repo does not have, and needs a third-party key for the half that matters**
[Jev: fast generative UI](https://docs.copilotkit.ai/ms-agent-python/cookbook/jev-generative-ui) was tracked on 2026-09-21 and implemented as far as it goes at `/cookbook/jev-generative-ui`. Nothing was installed, upgraded or added for it.

*The install line.* Ten exact pins: `@copilotkit/core@1.73.0 @copilotkit/react-core@1.73.0 @copilotkit/runtime@1.73.0 @ag-ui/client@0.0.59 @ag-ui/core@0.0.59 @typesafe-ai/sdk@0.6.0 rxjs@7.8.1 zod@4.6.5 @langchain/openai@1.5.13 @langchain/core@1.2.11`. Against this repo: CopilotKit is 1.69.2 (declared `^1.69.2`, published 2026-08-26; 1.73.0 published 2026-09-19), `@ag-ui/client` is 0.0.57 (declared `0.0.57`, pinned exactly for the reason in #13), `@ag-ui/core` resolves 0.0.58 hoisted and 0.0.57 under `@ag-ui/client`, `zod` is 4.4.3 (declared `^4.4.3`), `rxjs` is 7.8.1 (transitive, undeclared), `@langchain/core` is 1.2.8 (transitive, undeclared). `@typesafe-ai/sdk` and `@langchain/openai` are absent, as is `@copilotkit/intelligence-langgraph` from the optional section. All three exist on npm at the pinned versions; they are simply not installed here, and `npx tsc --noEmit` on a throwaway probe reports three `TS2307`s and nothing else.

*The vendor key.* `TYPESAFE_API_KEY` is issued through the TypeSafe quickstart at `docs.typesafe.ai`, outside CopilotKit. It is the one credential on the page with no local substitute: `choosePanel` is the whole decision layer, so without it the recipe has no generative UI left in it.

*Two of the ten pins are never imported by any snippet on the page* — `@copilotkit/core` and `@langchain/core`. Both are legitimate as a transitive and a peer, but a reader cannot tell which of the ten lines correspond to code the page is about to show them. The reverse also happens: `rxjs` and `@ag-ui/core` *are* imported by name and are undeclared in this repo, resolving only because CopilotKit hoists them.

*The page pins its own extension against a stack it cannot match.* The Automatic Learning section says to install `@copilotkit/intelligence-langgraph@1.71.2` "alongside the pinned stack above", which is 1.73.0. That package has exactly two published versions, 0.1.0 and 1.71.2, so the skew cannot be closed by bumping it, and the page never says whether a 1.71.2 registry client is expected to work against 1.73.0 runtime types.

*The run-error handler discards the cause the same section tells you to surface.* Automatic Learning: "Let initialization failures reach the run-error handler; do not silently claim the learned configuration ran with empty guidance." That handler is `PickerAgent`'s `.catch(() => { … })`, which takes no argument, logs nothing, and emits one fixed string. A failed `registry.initialize()` reaches the user as "The picker could not finish. Try again." and reaches the developer as nothing. Every other throw in the recipe carries a distinct message and all of them are flattened there.

*It mounts the runtime with an API no other page in this section uses.* `createCopilotEndpoint` plus `endpoint.fetch(request)`. Quickstart, Copilot Runtime and the section landing page all publish `createCopilotRuntimeHandler` for the same job, and Copilot Runtime names a third, `createCopilotEndpointSingleRoute`, for the plain `route.ts` case. Three mounting APIs in one section, with no page relating any of them. This one does compile at the installed 1.69.2.

*Its published paths collide with the harness and no alternative is given.* "Before you start" says to use an App Router project with the `@/*` alias and to place everything inside `src/` if the project has one, which this repo does. Followed literally that puts the recipe's `app/page.tsx` over the harness landing page and its `app/api/copilotkit/[[...slug]]/route.ts` over the runtime route every other page in this section shares, and `basePath: "/api/copilotkit"` is hardcoded in the snippet with a matching `runtimeUrl` on the frontend. The recipe is written for a fresh project and never says so in those words.

*Model ids.* `client.systemOne({ model: "jev-1.13.0" })` pins a Jev model in code with no note on how to find a current one and no link to a model list. On the OpenAI side the reverse: `.env.local` sets `OPENAI_MODEL=gpt-5.4` and the code reads `process.env.OPENAI_MODEL || "gpt-5.4"`, so the variable can be deleted with no effect — the mirror image of #7.

*A negative result worth recording.* The AG-UI adapter (`PickerAgent` and `runPicker`), the runtime route, and the whole published `Picker` component all typecheck **unchanged** against the installed 1.69.2 tree. So nothing demonstrated on the page is known to *need* the 1.73.0 floor the install line sets; only the three absent modules fail, and they fail for being absent rather than for being wrong. Probe files, deleted after the run.

*What is shipped.* The two published files that need nothing absent: `lib/workspaces.ts` verbatim at `frontend/src/app/cookbook/jev-generative-ui/workspaces.ts`, and the published `readAction` verbatim at `read-action.ts`. `readAction` is published inside `lib/picker-agent.ts`; the rest of that file imports `./choose-panel` and `@langchain/openai` and cannot compile here, so the one function that depends on nothing but the catalog is split out and the split is noted in the file. The published `Picker` render block runs at `demo-chat/page.tsx` with three substitutions, each quoted and marked in place: `agent.state` becomes a local `useState` because no `picker` agent exists, `send` runs `readAction` and stops where the recipe would run the agent, and `agent.abortRun()` becomes a no-op that is unreachable while `busy` is false. `choose-panel.ts`, `picker-agent.ts`, `route.ts` and `learned-guidance.ts` are quoted on the route page and not shipped.

*The demo does not fake a Jev decision.* A panel has to come from somewhere, and the only honest answer is the tester: two buttons place either prepared control by hand, labelled on screen as a stand-in, with the option order stated as the catalog's rather than a Jev ranking. Free text answers with a note naming the missing module and key instead of producing a panel.

Live, in `sitemap.xml`, and absent from the section sidebar, which has no Cookbook folder at all — only a top-level link to `/cookbook`, outside the section.

Verified against `@copilotkit/react-core` 1.69.2 (declared `^1.69.2`), `@copilotkit/runtime` 1.69.2 (declared `^1.69.2`), `@ag-ui/client` 0.0.57 (declared `0.0.57`), `@ag-ui/core` 0.0.58 (transitive), `rxjs` 7.8.1 (transitive), `zod` 4.4.3 (declared `^4.4.3`), `@langchain/core` 1.2.8 (transitive), `typescript` 5.9.3, `next` 16.3.2, `react` 19.2.8, `node` 26.7.0.

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

`/doc-sync` keeps this repo honest about the docs it mirrors. Press **Sync docs now** (on the landing page or on `/doc-sync`) and it fetches the markdown source behind all 35 tracked doc pages, diffs each against the copy stored in `doc-snapshot/`, replaces that copy, and reports what moved — ranked by whether the change can actually break an implementation.

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

**Custom Look and Feel** — [Slots](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/slots) † · [Markdown Rendering](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/markdown) † · [Headless UI](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/headless-ui) † · [Programmatic Control](https://docs.copilotkit.ai/ms-agent-python/programmatic-control) · [Inspector](https://docs.copilotkit.ai/ms-agent-python/inspector)

**Generative UI** — [Your Components · Display-only](https://docs.copilotkit.ai/ms-agent-python/generative-ui/your-components/display-only) · [Your Components · Interactive](https://docs.copilotkit.ai/ms-agent-python/generative-ui/your-components/interactive) · [Tool Rendering](https://docs.copilotkit.ai/ms-agent-python/generative-ui/tool-rendering) · [State Rendering](https://docs.copilotkit.ai/ms-agent-python/generative-ui/state-rendering) · [A2UI · Fixed Schema](https://docs.copilotkit.ai/ms-agent-python/generative-ui/a2ui/fixed-schema) · [A2UI · Styling](https://docs.copilotkit.ai/ms-agent-python/generative-ui/a2ui/styling) ‡ · [A2UI · Advanced](https://docs.copilotkit.ai/ms-agent-python/generative-ui/a2ui/advanced) ‡

**App Control** — [Frontend Tools](https://docs.copilotkit.ai/ms-agent-python/frontend-tools) · [WebMCP](https://docs.copilotkit.ai/ms-agent-python/webmcp) ‡ · [Governed Actions](https://docs.copilotkit.ai/ms-agent-python/human-in-the-loop/governed-actions) ‡

**Shared State** — [Reading agent state](https://docs.copilotkit.ai/ms-agent-python/shared-state/in-app-agent-read) · [Writing agent state](https://docs.copilotkit.ai/ms-agent-python/shared-state/in-app-agent-write) · [Readables](https://docs.copilotkit.ai/ms-agent-python/agent-app-context)

**Microsoft Agent Framework** — [Authentication](https://docs.copilotkit.ai/ms-agent-python/auth)

**Rich Threads** — [Overview](https://docs.copilotkit.ai/ms-agent-python/threads) · [Threads Drawer](https://docs.copilotkit.ai/ms-agent-python/prebuilt-components/copilot-threads-drawer) · [Headless Threads](https://docs.copilotkit.ai/ms-agent-python/headless-threads) · [Thread & History Lifecycle](https://docs.copilotkit.ai/ms-agent-python/threads-lifecycle) · [Import & Synchronize History](https://docs.copilotkit.ai/ms-agent-python/threads-import) ‡

**Backend** — [Copilot Runtime](https://docs.copilotkit.ai/ms-agent-python/copilot-runtime) · [AG-UI](https://docs.copilotkit.ai/ms-agent-python/ag-ui)

**Cookbook** — [Jev: fast generative UI](https://docs.copilotkit.ai/ms-agent-python/cookbook/jev-generative-ui) †

**External** — [Microsoft Agent Framework docs](https://learn.microsoft.com/en-us/agent-framework/) · [AG-UI protocol](https://ag-ui.com) · [AG-UI event types](https://docs.ag-ui.com/concepts/events)

† Resolves but is absent from the doc sidebar as of the sync date.

‡ Tracked for reference but not implemented — see §8.
