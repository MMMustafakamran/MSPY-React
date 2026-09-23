# Findings — MsPy-react
Current open doc defects only. A finding is added here only after a human reviews and approves it; page failures in a run are never written here automatically. Resolved or superseded findings are removed (see git history).
Stack: `@copilotkit/react-core`/`runtime` 1.73.3 (`^1.73.3`), `@ag-ui/client` 0.0.59, `agent-framework-ag-ui` 1.1.0, `agent-framework-openai` 1.13.0 (`1-cli-testing/*/app` declares 1.70.2).
Major = blocks a reader (doesn't compile, crashes/throws, silently broken behaviour, step impossible to follow, missing required step/package, 404 target). Minor = one-line notes.

## Major

### [Quickstart](https://docs.copilotkit.ai/ms-agent-python/quickstart)

9. **`uv add` fails without `--prerelease=allow`**: the agent-framework packages are pre-release, and the docs leave the flag out.
13. **`@ag-ui/client` installed twice, so types clash**: the unpinned `npm install @ag-ui/client` differs from CopilotKit's pinned copy, so `HttpAgent` is not assignable to `AbstractAgent` ("separate declarations of a private property '_debug'"). No page says which version to install. Not yet checked against npm latest 1.0.0.
18. **`project select` aborts without a `login` step**: it fails with "not logged in" (CLI 4.9.24). It also renames the key file from `.env.local` to `.env`, which clashes with `agent/.env`. The repo keeps `frontend/.env.local`.

### [Landing page](https://docs.copilotkit.ai/ms-agent-python)

15. **`route.ts` returns Not found and reads an undefined `AGENT_URL`**: the file is `app/api/copilotkit/route.ts`, not `[[...slug]]/route.ts`, so it returns `{"error":"Not found"}` even though `next build` passes. No page defines `process.env.AGENT_URL!`. Repo: `frontend/src/app/api/copilotkit-landing/route.ts`.

### [Copilot Runtime](https://docs.copilotkit.ai/ms-agent-python/copilot-runtime)

17. **Wrong error name**: `CopilotKitAgentDiscoveryError` is not exported from `react-core/v2` (TS2305). `useAgent` throws a plain `Error` (`useAgent: Agent 'X' not found after runtime sync ...`). Demo: `/copilot-runtime/demo-chat`.

### Shared State pages

1. **`useAgent` has no `initialState`**: it is not in `UseAgentProps` (type error), and the Read page's `render` prop does not exist either. The repo seeds state via `default_state` on `add_agent_framework_fastapi_endpoint`.

### Tool rendering (`useDefaultRenderTool`)

3. **Sample destructures `args`, which doesn't exist**: `DefaultRenderProps` has `name, toolCallId, parameters, status, result` and no `args`.

### Inspector

4. **Toggle works only with one provider**: `enableInspector={false}` works only on `<CopilotKit>`. `<CopilotKitProvider>` reads `showDevConsole` instead, and a hand-mounted `<CopilotKitInspector />` shows "CopilotKit core not attached".

### Slots

5. **Level-3 example fails typecheck**: `SlotValue<C>` requires the default component's statics, so a plain component can't be assigned (1.73.3).

### Headless UI

6. **`<p>{msg.content}</p>` doesn't compile**: `msg.content` is `string | ContentPart[] | Record<…> | undefined`, not a `ReactNode`. The page also imports `randomUUID` from `@copilotkit/shared`, which is not a declared dependency.

### A2UI

14. **Catalog works with zod 3 only, and zod 4 fails silently**: `@copilotkit/a2ui-renderer` depends on `zod@^3.25`. A zod 4 schema with a type cast builds, but `GenericBinder` reads `_def.typeName`/`_def.shape()`, so the card renders blank with no error. The repo uses `"zod-v3": "npm:zod@^3.25.75"`.

### Threads

11. **Drawer stays locked without Intelligence**: `<CopilotThreadsDrawer>` needs `licenseStatus` `valid`/`expiring`, which `/info` reports only when `CopilotKitIntelligence` is set up. The flow "Create thread with your own API on first message" is not implemented. The repo uses `/api/copilotkit-threads/[[...slug]]`.

### [Threads Drawer](https://docs.copilotkit.ai/ms-agent-python/prebuilt-components/copilot-threads-drawer)

12. **`slot` children are a type error and are dropped**: `CopilotThreadsDrawerProps` has no `children`, and the wrapper renders only the `renderRow` output.
23. **Sidebar snippet uses an undefined `<YourMainContent />`**: the repo supplies a placeholder at `/threads/drawer/demo-chat`.

### [Threads lifecycle](https://docs.copilotkit.ai/ms-agent-python/threads-lifecycle)

22. **`existingId` is never defined**: the page calls `setActiveThreadId(existingId, { explicit: true })`. The demo passes the first thread id as a prop.

### [Message history](https://docs.copilotkit.ai/ms-agent-python/backend/message-history)

25. **Wrong claim that MAF keeps its own history**: the trimmed runtime answered `UNKNOWN` where the untrimmed one answered `Sam` (`agent-framework-ag-ui` 1.1.0, `-core` 1.14.0). `process.env.AGENT_URL!` is undefined (see #15), and the check script gives `TS2339` on `trimmedParallel[i].toolCallId`.

### [Jev generative UI](https://docs.copilotkit.ai/ms-agent-python/cookbook/jev-generative-ui)

21. **Pinned stack doesn't match and needs a third-party key**: it pins 10 exact versions (CopilotKit 1.73.0, `zod@4.6.5`, `@typesafe-ai/sdk@0.6.0`, ...), and `@copilotkit/intelligence-langgraph@1.71.2` does not match the rest. It requires `TYPESAFE_API_KEY`. `rxjs` and `@ag-ui/core` are imported but not declared.

### [Automatic Learning](https://docs.copilotkit.ai/ms-agent-python/learning)

19. **Env-only configuration silently requests nothing**: the manual path uses `CPK_INTELLIGENCE_LEARNING_CONTAINER_ID`, but omitting the config disables skill requests even when env vars are set (see #27).

### [Skill delivery](https://docs.copilotkit.ai/ms-agent-python/intelligence/learned-skills)

27. **"Omit them to use environment variables" is wrong**: at runtime 1.73.3, `skillRegistry` is undefined when `learnedSkills === undefined`. The env fallback applies only with `learnedSkills: {}`.
28. **SDK-client snippet sends self-hosted realtime traffic to the cloud**: it sets `apiUrl` without `wsUrl`, so wsUrl falls back to the managed default.

### Connect your runtime (removed)

31. **`/ms-agent-python/intelligence/connect-your-runtime` returns 404 with no redirect**: the repo's links now point to `/intelligence/quickstart`.

## Minor notes

- #7 [Quickstart](https://docs.copilotkit.ai/ms-agent-python/quickstart): the env sets `OPENAI_CHAT_MODEL_ID=gpt-5.4-mini`, but the code default is `gpt-4o-mini`. The repo keeps the code default.
- #8 [Quickstart](https://docs.copilotkit.ai/ms-agent-python/quickstart): the page installs `@copilotkit/react-ui` (v1), but every component comes from `@copilotkit/react-core/v2`.
- #20 [Markdown Rendering](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/markdown): the `my-link`/`my-heading` classes are defined nowhere. The snippet strips the Streamdown classes and `data-streamdown`. The unused `node` destructure triggers a lint error, and an unknown key gives an undocumented TS7031. The page is missing from the sidebar.
- #21 [Jev generative UI](https://docs.copilotkit.ai/ms-agent-python/cookbook/jev-generative-ui): `@copilotkit/core` and `@langchain/core` are pinned but never imported. `.catch(() => {…})` discards the cause, which breaks the page's own rule. `model: "jev-1.13.0"` is never explained. The page is missing from the sidebar.
- #26 [Skill delivery](https://docs.copilotkit.ai/ms-agent-python/intelligence/learned-skills): every snippet has the placeholder `revision: "exact-revision-id"`, and the note to replace it appears only once.
- #29 [Automatic Learning](https://docs.copilotkit.ai/ms-agent-python/learning): the prose puts `getLearningContainerId` "on the CopilotKit runtime" (`@deprecated` at 1.73.3), but the snippet and table use `CopilotKitIntelligence`.
- #30 [Plans](https://docs.copilotkit.ai/ms-agent-python/intelligence/plans): the page says the free Developer plan includes User Memory, but sibling harnesses got `403 MEMORY_NOT_ENTITLED`. Not reproduced in this repo, so it needs a re-test.
- #32 [Skill delivery](https://docs.copilotkit.ai/ms-agent-python/intelligence/learned-skills): the page uses two placeholders for `CPK_INTELLIGENCE_API_KEY`, `"your-project-key"` and `cpk-...`. The first drops the `cpk-` prefix.
