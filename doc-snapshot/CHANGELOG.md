# Doc drift changelog

What the CopilotKit docs changed under this repo, written by whichever sync
ran — the `/doc-sync` page or `npm run drift:sync`. Only pages that actually
moved are recorded — a sync that finds everything unchanged writes nothing
here at all.

Holds the 3 most recent dated entries. When a change lands on a fourth
date, the oldest entry is dropped. Entries are counted, not aged, so a gap of
weeks between changes does not expire anything.

## 2026-09-21

### 07:26 UTC — 11 pages, highest severity high · _npm run drift:sync_

**High — /ms-agent-python**

`/ms-agent-python` · routes `/`, `/doc-sync` · `ms-agent-python.md`

Code fence count changed. Hash 17f42214 ➔ a3b003be.

````diff
- frameworkIcon={<MicrosoftIcon className="h-10 w-10 text-primary" width={40} height={40} />}
- header="Bring your Microsoft Agent Framework agents to your users"
- subheader="Give your Microsoft Agent Framework agents real user-interactivity using CopilotKit and AG-UI. Build rich, interactive, agent-powered applications."
- bannerVideo="https://cdn.copilotkit.ai/docs/copilotkit/videos/coagents/overview.mp4"
+ frameworkIcon={<MicrosoftIcon className="h-12 w-12" />}
+ header="Bring your Microsoft Agent Framework agents to your users"
+ subheader="The Microsoft Agent Framework runs your agents. CopilotKit gives them a surface your users can see, interrupt and steer."
+ guideLink="/microsoft-agent-framework/quickstart"
  … region truncated
````

**Low — /ms-agent-python/custom-look-and-feel/slots**

`/ms-agent-python/custom-look-and-feel/slots` · route `/custom-look-and-feel/slots` · `ms-agent-python__custom-look-and-feel__slots.md`

Prose / text phrasing updated. Hash b03880ee ➔ 736c9e9a.

````diff
- | `markdownRenderer` | The markdown rendering component.  |
+ | `markdownRenderer` | The markdown rendering component. See [Markdown Rendering](/ms-agent-python/custom-look-and-feel/markdown). |
````

**Low — /ms-agent-python/inspector**

`/ms-agent-python/inspector` · route `/inspector` · `ms-agent-python__inspector.md`

Prose / text phrasing updated. Hash d03ea755 ➔ a750872b.

````diff
- `NEXT_PUBLIC_COPILOTKIT_LICENSE_KEY` is a browser-visible publishable key. It is
- different from the server-side `CPK_INTELLIGENCE_API_KEY` that
- `copilotkit project select` writes into your `.env`. The Runtime consumes the
- server-side key; never expose it to the browser.
+ For managed Intelligence, `copilotkit project select` writes
+ `CPK_INTELLIGENCE_API_KEY` to your server-side `.env`. The Runtime uses that key
+ and reports Intelligence access to the browser. Never expose the project API
+ key to the browser. See [Runtime endpoints](/ms-agent-python/backend/runtime-endpoints) for the
  … region truncated
````

**Medium — /ms-agent-python/prebuilt-components/copilot-threads-drawer**

`/ms-agent-python/prebuilt-components/copilot-threads-drawer` · route `/threads/drawer` · `ms-agent-python__prebuilt-components__copilot-threads-drawer.md`

Headings / Structure changed. Hash 4d95bba9 ➔ b9592d3d.

````diff
- server-side). <SignupLink surface="docs_drawer">Get a free developer account</SignupLink> to set that up.
- For multi-user applications, configure the Runtime to
- [scope Rich Threads to the signed-in user](/ms-agent-python/threads-lifecycle#scope-rich-threads-to-the-signed-in-user).
- <OpsPlatformCTA
+ server-side). <SignupLink surface="docs_drawer">Start managed onboarding</SignupLink> to create or select a project.
+ For multi-user applications, configure the Runtime to
+ [scope Rich Threads to the signed-in user](/ms-agent-python/threads-lifecycle#scope-rich-threads-to-the-signed-in-user).
+ <OpsPlatformCTA
  … region truncated
````

**High — /ms-agent-python/quickstart**

`/ms-agent-python/quickstart` · route `/quickstart` · `ms-agent-python__quickstart.md`

Code fence count changed. Hash f9e92c68 ➔ 107840f5.

````diff
- ### Create a free account
- <SignupLink surface="docs_microsoft_agent_framework_quickstart_step1">Sign up for a free developer account</SignupLink> for CopilotKit Intelligence to get a license key. You'll use it later to enable persistent threads and the inspector.
- </Step>
- <Step>
+ ### Set up CopilotKit Intelligence
+ <SignupLink surface="docs_microsoft_agent_framework_quickstart_step1">Sign in to managed Intelligence</SignupLink>. Managed setup uses a server-side project API key and does not issue `COPILOTKIT_LICENSE_TOKEN`. You will connect the app after you create it below.
+ </Step>
+ <Step>
  … region truncated
````

**High — /ms-agent-python/copilot-runtime**

`/ms-agent-python/copilot-runtime` · route `/copilot-runtime` · `ms-agent-python__copilot-runtime.md`

Code fence count changed. Hash 117f965b ➔ d3b00150.

````diff
- The Copilot Runtime is the backend layer that connects your frontend application to your AI agents. It's set up during the [quickstart](/ms-agent-python/quickstart) and is the recommended way to use CopilotKit.
- ## Setting Up the Runtime
- The runtime is a lightweight server endpoint that you add to your backend:
- ```npm
+ The Copilot Runtime is the backend layer that connects your frontend application to your AI agents. It's set up during the [quickstart](/ms-agent-python/quickstart) and is the recommended way to use CopilotKit.
+ ## Setting Up the Runtime
+ The runtime is a lightweight server endpoint that you add to your backend:
+ ```npm
  … region truncated
````

**High — /ms-agent-python/learning**

`/ms-agent-python/learning` · route `/learning` · `ms-agent-python__learning.md`

Code fence count changed. Hash 9ccfc319 ➔ 1f896eca.

````diff
- ## Start with your coding agent
- Copy this prompt into your coding agent to inspect your existing app and configure Automatic Learning for one focused workflow. Prefer to work through the setup yourself? Follow the manual steps below.
- #### Copy this prompt into your coding agent
- ```text
+ Automatic Learning checks eligible containers on a daily schedule. After you approve a Skill, automatic skill delivery makes it available to connected agents. Scheduling, publication, and delivery are separate: a scheduled run does not approve Skills, and enabling delivery does not connect your agent for you.
+ ## Start with your coding agent
+ Copy this prompt into your coding agent to inspect your existing app and configure Automatic Learning for one focused workflow. Prefer to work through the setup yourself? Follow the manual steps below.
+ #### Copy this prompt into your coding agent
  … region truncated
````

**Low — /ms-agent-python/intelligence/memories**

`/ms-agent-python/intelligence/memories` · route `/intelligence/memories` · `ms-agent-python__intelligence__memories.md`

Prose / text phrasing updated. Hash 9315f7ed ➔ 2c764691.

````diff
- import { useMemories } from "@copilotkit/react-core";
+ import { useMemories } from "@copilotkit/react-core/v2";
````

**High — /ms-agent-python/intelligence/learned-skills**

`/ms-agent-python/intelligence/learned-skills` · route `/intelligence/learned-skills` · `ms-agent-python__intelligence__learned-skills.md`

Code fence count changed. Hash bd49a781 ➔ 2e5b4fe2.

````diff
- ## Choose an adapter
- | Framework                 | Package                                  | Native extension                                                     |
- | ------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
- | LangGraph Python          | `copilotkit-intelligence-langgraph`      | `create_skill_registry_middleware`                                   |
+ <Callout type="info">
+ Start with the [Learning guide](/ms-agent-python/learning) to collect Threads, configure daily runs, and review Skills. Before connecting an adapter, check that **Skill delivery** is enabled in the container's **Skills** tab. For guided setup, select **Set up skill delivery** there and copy the prompt into your coding agent.
+ </Callout>
+ ## Choose an adapter
  … region truncated
````

**New — https://docs.copilotkit.ai/ms-agent-python/cookbook/jev-generative-ui**

Listed upstream, tracked nowhere in this repo. Not snapshotted by this run.

**New — https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/markdown**

Listed upstream, tracked nowhere in this repo. Not snapshotted by this run.

---

## 2026-09-18

### 08:13 UTC — 1 page, highest severity medium · _npm run drift:sync_

**Medium — /ms-agent-python/threads**

`/ms-agent-python/threads` · route `/threads` · `ms-agent-python__threads.md`

Headings / Structure changed. Hash a4464977 ➔ 5de8e463.

````diff
+ ## Persistent, rich conversations for your agents
+ CopilotKit Intelligence provides the persistence and conversation management behind Rich Threads: rich history, continuity across devices, reconnection to active runs, and ready-made thread controls.
+ **Starting fresh?** Intelligence stores your conversation history and restores messages, generative UI, tool interactions, and multimodal inputs when users return.
+ **Already using LangGraph or ADK persistence?** Keep it. Rich Threads complement your existing setup with a consistent, interactive conversation experience for your users.
+ Use [Threads Drawer](/ms-agent-python/prebuilt-components/copilot-threads-drawer) for conversation switching, pagination, and archive/delete controls, or [Headless Threads](/ms-agent-python/headless-threads) to build your own UI. For how Intelligence and framework persistence work together, see [Threads & Persistence Architecture](/ms-agent-python/intelligence/threads-explained#how-rich-threads-complement-framework-persistence).
````

---

---

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

---
