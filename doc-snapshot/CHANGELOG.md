# Doc drift changelog

What the CopilotKit docs changed under this repo, written by whichever sync
ran — the `/doc-sync` page or `npm run drift:sync`. Only pages that actually
moved are recorded — a sync that finds everything unchanged writes nothing
here at all.

Holds the 3 most recent dated entries. When a change lands on a fourth
date, the oldest entry is dropped. Entries are counted, not aged, so a gap of
weeks between changes does not expire anything.

## 2026-09-17

### 07:24 UTC — 6 pages, highest severity high · _npm run drift:sync_

**Low — /ms-agent-python/intelligence/quickstart**

`/ms-agent-python/intelligence/quickstart` · route `/intelligence/quickstart` · `ms-agent-python__intelligence__quickstart.md`

Prose / text phrasing updated. Hash b543235d ➔ 1ee917aa.

````diff
- If it requires a CopilotKit CLI session check, you have permission to run it. Never reveal credentials or send optional diagnostic feedback reports.
+ If it requires a CopilotKit CLI session check, you have permission to run it. Never reveal credentials.
````

**Medium — /ms-agent-python/quickstart**

`/ms-agent-python/quickstart` · route `/quickstart` · `ms-agent-python__quickstart.md`

Headings / Structure changed. Hash e78d5538 ➔ f9e92c68.

````diff
- <IntelligenceOnboardingPrompt
- feature="learning"
- surface="docs_microsoft_agent_framework_quickstart"
- />
+ ## Start with your coding agent
+ Use this prompt to connect your Microsoft Agent Framework agent to CopilotKit and verify a working conversation. Your coding agent will follow this guide in your project, or you can work through the manual steps below.
+ Ask your coding agent to follow the setup steps on this page for your selected framework and frontend.
````

**High — /ms-agent-python/threads**

`/ms-agent-python/threads` · route `/threads` · `ms-agent-python__threads.md`

Code block content changed. Hash 4edfb6f1 ➔ a4464977.

````diff
- <IntelligenceOnboardingPrompt
- feature="threads"
- surface="docs_threads_overview"
- />
+ <div
+ aria-label="A support workspace using Threads Drawer to move between customer conversations while CopilotChat renders the selected case details."
+ className="shell-docs-radius-surface relative mb-4 overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)] shadow-[0px_16px_24px_-8px_rgba(1,5,7,0.12)] ring-1 ring-inset ring-white/70 dark:shadow-[0px_16px_32px_-10px_rgba(0,0,0,0.45)] dark:ring-white/10"
+ >
  … region truncated
````

**Medium — /ms-agent-python/webmcp**

`/ms-agent-python/webmcp` · route `/webmcp` · `ms-agent-python__webmcp.md`

Headings / Structure changed. Hash 72a287bd ➔ 84883e8a.

````diff
- ## Setup with a coding agent
+ ## Start with your coding agent
````

**High — /ms-agent-python/intelligence/memories**

`/ms-agent-python/intelligence/memories` · route `/intelligence/memories` · `ms-agent-python__intelligence__memories.md`

Code fence count changed. Hash bc87ba1e ➔ 9315f7ed.

````diff
- > How long-term memory works in CopilotKit Intelligence: what a memory is, the three kinds, user and project scope, how activation is entitled, and how to read and write memories from React, Angular, REST, or MCP.
- <IntelligenceOnboardingPrompt
- feature="learning"
- surface="docs_learn_memories"
+ > Give your agents long-term memory across conversations.
+ Threads remember a conversation. Memories remember a person. This page explains
+ what a memory is, how recall selects them, and what has to be true of your
+ deployment before the memory surfaces exist at all.
  … region truncated
````

**High — /ms-agent-python/learning**

`/ms-agent-python/learning` · route `/learning` · `ms-agent-python__learning.md`

Code block content changed. Hash 170ceed0 ➔ 9ccfc319.

````diff
- ## Set up Learning
- When you are done, your Runtime will send selected Threads to a Learning container, ready to be analyzed and turned into reviewed Skills.
- <Steps>
- <Step>
+ ## Start with your coding agent
+ Copy this prompt into your coding agent to inspect your existing app and configure Automatic Learning for one focused workflow. Prefer to work through the setup yourself? Follow the manual steps below.
+ #### Copy this prompt into your coding agent
+ ```text
  … region truncated
````

---

## 2026-09-04

### 08:09 UTC — 8 pages, highest severity high

**High — Readables**

`/ms-agent-python/agent-app-context` · route `/readables` · under “Consume the data in your AG-UI server” · in a `python` block

59 code lines changed.

````diff
- from agent_framework import Agent, SupportsChatGetResponse
- from agent_framework.ag_ui import AgentFrameworkAgent
+ import json
+ from collections.abc import AsyncGenerator
+ from typing import Any
+ from uuid import uuid4
+ from ag_ui.core import BaseEvent
+ from agent_framework import Agent, BaseChatClient
````

**High — Headless Threads**

`/ms-agent-python/headless-threads` · route `/threads/headless` · under “Configure your Runtime with CopilotKit Intelligence”

2 code lines, 22 prose lines changed.

````diff
- Your `CopilotRuntime` must be connected to CopilotKit Intelligence before the thread UI can list and resume conversations. That connection is the `intelligence` option below — a `CopilotKitIntelligence` instance. If your app came from a CLI starter, this Runtime configuration is generated for you. Otherwise, follow [Connect your runtime to Intelligence](/ms-agent-python/premium/connect-your-runtime) for the full constructor, then return here to add the headless UI. Thread names are automatically generated by the LLM after the first message — you can disable this with `generateThreadNames: false`.
+ Your `CopilotRuntime` must be connected to CopilotKit Intelligence before the thread UI can list and resume conversations. That connection is the `intelligence` option below — a `CopilotKitIntelligence` instance. If your app came from a CLI starter, this Runtime configuration is generated for you. Otherwise, follow [Connect your runtime to Intelligence](/ms-agent-python/intelligence/connect-your-runtime) for the full constructor, then return here to add the headless UI. Thread names are automatically generated by the LLM after the first message — you can disable this with `generateThreadNames: false`.
- apiKey: process.env.INTELLIGENCE_API_KEY!,
+ apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
- CLI-created starters write the cloud-hosted platform URLs and project-scoped `INTELLIGENCE_API_KEY` to `.env`; keep that key server-side. Existing Intelligence-enabled apps should keep their current server-side Runtime configuration. Production self-hosting uses the same React APIs and is deployed with CopilotKit Engineering through [Self-host CopilotKit Intelligence](/ms-agent-python/premium/self-hosting).
+ CLI `init` and its `create` alias write the cloud-hosted platform URLs,
+ `SL_ENABLED`, project-scoped `CPK_INTELLIGENCE_API_KEY`, and optional
+ `CPK_TELEMETRY_ID` to `.env`.
````

**Low — Inspector**

`/ms-agent-python/inspector` · route `/inspector` · under “Showing or hiding the Inspector”

2 prose lines changed.

````diff
- a **different credential** from the server-side `INTELLIGENCE_API_KEY` that
+ a **different credential** from the server-side `CPK_INTELLIGENCE_API_KEY` that
````

**High — Quickstart**

`/ms-agent-python/quickstart` · route `/quickstart` · under “Setup Copilot Runtime” · in a `tsx` block

4 code lines, 4 prose lines changed.

````diff
- apiKey: process.env.INTELLIGENCE_API_KEY!,
+ apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
- The runtime reads the license key from step 1. Add it to the app that serves
+ The runtime reads the project API key from step 1. Add it to the app that serves
- INTELLIGENCE_API_KEY=your_license_key
+ CPK_INTELLIGENCE_API_KEY=cpk-...
- [Connect your runtime to Intelligence](/ms-agent-python/premium/connect-your-runtime) for the
+ [Connect your runtime to Intelligence](/ms-agent-python/intelligence/connect-your-runtime) for the
````

**High — Reading agent state**

`/ms-agent-python/shared-state/in-app-agent-read` · route `/shared-state/in-app-agent-read` · under “Use the `useAgent` Hook”

27 code lines, 2 headings, 7 prose lines changed.

````diff
- optionally provide an initial state.
+ initialize missing UI-owned state after the connected agent is ready.
+ import { useEffect } from "react";
+ import { useAgent } from "@copilotkit/react-core/v2";
- const { agent } = useAgent({
+ const { agent, isReady } = useAgent({
- initialState: { language: "english" }  // optionally provide an initial state
+ const state = (agent.state ?? {}) as Partial<AgentState>;
````

**High — Writing agent state**

`/ms-agent-python/shared-state/in-app-agent-write` · route `/shared-state/in-app-agent-write` · under “Call `agent.setState` from the `useAgent` hook” · in a `tsx` block

12 code lines changed.

````diff
+ import { useEffect } from "react";
- const { agent } = useAgent({ // [!code highlight]
+ const { agent, isReady } = useAgent({
- initialState: { language: "english" }  // optionally provide an initial state
+ const state = (agent.state ?? {}) as Partial<AgentState>;
+ useEffect(() => {
+ if (!isReady || state.language !== undefined) return;
+ agent.setState({ ...(agent.state ?? {}), language: "english" });
````

**High — Thread & History Lifecycle**

`/ms-agent-python/threads-lifecycle` · route `/threads/lifecycle` · under “The lifecycle at a glance”

2 code lines, 8 prose lines changed.

````diff
- 2. **Run.** Messages and tool calls stream under that `threadId`. If a server-side store is configured (CopilotKit Intelligence, or a persisting `AgentRunner`), they are persisted as they happen so the thread can be replayed later. A runtime with no persistence layer keeps nothing server-side. See [Threads & Persistence Architecture](/ms-agent-python/premium/threads-explained) for the full server-side model.
+ 2. **Run.** Messages and tool calls stream under that `threadId`. If a server-side store is configured (CopilotKit Intelligence, or a persisting `AgentRunner`), they are persisted as they happen so the thread can be replayed later. A runtime with no persistence layer keeps nothing server-side. See [Threads & Persistence Architecture](/ms-agent-python/intelligence/threads-explained) for the full server-side model.
- Replay requires a **server-side store to replay from**: CopilotKit Intelligence, or a persisting `AgentRunner` (e.g. the SQLite runner). A self-hosted runtime with no persistence layer has nothing to replay, so `connectAgent()` returns an empty stream and the conversation starts blank. If history isn't restoring, check that a store is configured, not the client code. The [Persistence Architecture](/ms-agent-python/premium/threads-explained) page covers how replay works server-side.
+ Replay requires a **server-side store to replay from**: CopilotKit Intelligence, or a persisting `AgentRunner` (e.g. the SQLite runner). A self-hosted runtime with no persistence layer has nothing to replay, so `connectAgent()` returns an empty stream and the conversation starts blank. If history isn't restoring, check that a store is configured, not the client code. The [Persistence Architecture](/ms-agent-python/intelligence/threads-explained) page covers how replay works server-side.
- apiKey: process.env.INTELLIGENCE_API_KEY!,
+ apiKey: process.env.CPK_INTELLIGENCE_API_KEY!,
- [Connect your runtime to Intelligence](/ms-agent-python/premium/connect-your-runtime) covers the
+ [Connect your runtime to Intelligence](/ms-agent-python/intelligence/connect-your-runtime) covers the
````

**Low — Overview**

`/ms-agent-python/threads` · route `/threads` · under “Next steps”

6 prose lines changed.

````diff
- - **Understand the architecture:** [Threads & Persistence Architecture](/ms-agent-python/premium/threads-explained) — event replay, live reconnection, synchronization, locking, and lifecycle behavior
- - **Use the hosted platform:** [Cloud-hosted CopilotKit Intelligence](/ms-agent-python/premium/managed-intelligence-platform) — create and manage the project where your app stores threads and runtime credentials
- - **Plan production self-hosting:** [Self-host CopilotKit Intelligence](/ms-agent-python/premium/self-hosting) — work with CopilotKit Engineering to run the Threads platform in your Kubernetes environment
+ - **Understand the architecture:** [Threads & Persistence Architecture](/ms-agent-python/intelligence/threads-explained) — event replay, live reconnection, synchronization, locking, and lifecycle behavior
+ - **Use the hosted platform:** [Cloud-hosted CopilotKit Intelligence](/ms-agent-python/intelligence/managed-intelligence-platform) — create and manage the project where your app stores threads and runtime credentials
+ - **Plan production self-hosting:** [Self-host CopilotKit Intelligence](/ms-agent-python/intelligence/self-hosting) — work with CopilotKit Engineering to run the Threads platform in your Kubernetes environment
````

---

---

## 2026-08-30

### 13:44 UTC — 8 pages, highest severity high

**High — Readables**

`/ms-agent-python/agent-app-context` · route `/readables` · under “Consume the data in your AG-UI server”

45 code lines, 6 prose lines changed.

````diff
- The `context` you register on the frontend is forwarded to your AG-UI server in `ChatOptions.AdditionalProperties["ag_ui_context"]`. Use middleware to access this context and inject it into the agent's conversation.
+ The `context` you register on the frontend is forwarded in the AG-UI `RunAgentInput`. Use middleware to read it and inject it into the agent's conversation.
- using Azure.AI.OpenAI;
- using Azure.Identity;
+ using AGUI.Abstractions;
+ using AGUI.Server;
+ using OpenAI;
+ using OpenAI.Chat;
````

**High — Authentication**

`/ms-agent-python/auth` · route `/auth` · under “Backend Setup” · in a `csharp` block

21 code lines, 3 prose lines changed. The number of fenced code blocks changed.

````diff
+ using OpenAI.Chat;
+ builder.Services.AddAGUIServer();
- string githubToken = builder.Configuration["GitHubToken"]!;
- var openAI = new OpenAIClient(
- new System.ClientModel.ApiKeyCredential(githubToken),
- new OpenAIClientOptions { Endpoint = new Uri("https://models.inference.ai.azure.com") }
- );
+ string openAiApiKey = builder.Configuration["OPENAI_API_KEY"]
````

**High — Frontend Tools**

`/ms-agent-python/frontend-tools` · route `/frontend-tools` · under “Create your AG-UI server” · in a `csharp` block

18 code lines changed.

````diff
- using Azure.AI.OpenAI;
- using Azure.Identity;
+ using OpenAI;
+ using OpenAI.Chat;
- builder.Services.AddAGUI();
+ builder.Services.AddAGUIServer();
- string endpoint = builder.Configuration["AZURE_OPENAI_ENDPOINT"]!;
- string deployment = builder.Configuration["AZURE_OPENAI_CHAT_DEPLOYMENT_NAME"]!;
````

**High — State Rendering**

`/ms-agent-python/generative-ui/state-rendering` · route `/generative-ui/state-rendering` · under “Stream state from your agent” · in a `csharp` block

92 code lines changed.

````diff
- using Azure.AI.OpenAI;
- using Azure.Identity;
+ using AGUI.Abstractions;
+ using AGUI.Server;
+ using OpenAI;
+ using OpenAI.Chat;
+ using AIChatMessage = Microsoft.Extensions.AI.ChatMessage;
+ using AIChatResponseFormat = Microsoft.Extensions.AI.ChatResponseFormat;
````

**High — Tool Rendering**

`/ms-agent-python/generative-ui/tool-rendering` · route `/generative-ui/tool-rendering` · under “Give your agent a tool to call” · in a `csharp` block

23 code lines changed.

````diff
- using Azure.AI.OpenAI;
- using Azure.Identity;
+ using Microsoft.Extensions.AI;
+ using OpenAI;
+ using OpenAI.Chat;
- builder.Services.AddAGUI();
+ builder.Services.AddAGUIServer();
- string endpoint = builder.Configuration["AZURE_OPENAI_ENDPOINT"]!;
````

**High — Quickstart**

`/ms-agent-python/quickstart` · route `/quickstart` · under “Quickstart”

37 code lines, 30 prose lines changed. The number of fenced code blocks changed.

````diff
- <OpsPlatformCTA
- variant="card"
- title="Ship Microsoft Agent Framework to production"
- body="Add persistent threads and the inspector with CopilotKit Intelligence."
- ctaLabel="Create a free account"
+ <IntelligenceOnboardingPrompt
+ feature="learning"
- - A GitHub Personal Access Token (for GitHub Models API - free AI access)
````

**Low — Headless Threads**

`/ms-agent-python/headless-threads` · route `/threads/headless` · under “What is this?”

6 prose lines changed.

````diff
- <OpsPlatformCTA
- variant="inline"
- title="Threads run in CopilotKit Intelligence"
- body="Get persistent threads and realtime sync on the free Developer tier."
+ <IntelligenceOnboardingPrompt
+ feature="threads"
````

**Low — Overview**

`/ms-agent-python/threads` · route `/threads` · under “Rich Threads”

14 prose lines changed.

````diff
+ <IntelligenceOnboardingPrompt
+ feature="threads"
+ surface="docs_threads_overview"
+ />
+ 
+ Open a real thread and use **Try from here** to copy it into a Playground scratch session. The stored thread does not change.
- 
- <OpsPlatformCTA
````

---

---
