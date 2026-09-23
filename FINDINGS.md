# Findings — MsPy-react
Current open doc defects only. A finding is added here only after a human reviews and approves it; page failures in a run are never written here automatically. Resolved or superseded findings are removed (see git history).
Stack: `@copilotkit/react-core`/`runtime` 1.73.3 (`^1.73.3`), `@ag-ui/client` 0.0.59, `agent-framework-ag-ui` 1.1.0, `agent-framework-openai` 1.13.0 (`1-cli-testing/*/app` declares 1.70.2).

## [Quickstart](https://docs.copilotkit.ai/ms-agent-python/quickstart)

7. **Model id mismatch**: the env sets `OPENAI_CHAT_MODEL_ID=gpt-5.4-mini` but the code default is `gpt-4o-mini`. The repo keeps the code default.
8. **Installs `@copilotkit/react-ui`** (v1), but every component comes from `@copilotkit/react-core/v2`.
9. **agent-framework packages are pre-release**: `uv add` needs `--prerelease=allow`, and the docs leave it out.
13. **`@ag-ui/client` installed twice**: the unpinned `npm install @ag-ui/client` differs from CopilotKit's pinned copy, so `HttpAgent` is not assignable to `AbstractAgent` ("separate declarations of a private property '_debug'"). No page says which version to install. Not yet checked against npm latest 1.0.0.
18. **`project select` has no `login` step, and the key file is renamed**: `npx copilotkit@latest project select` needs a CLI session and aborts with "not logged in" (CLI 4.9.24). The key file changes from `.env.local` to `.env`, which clashes with `agent/.env`. Learning, Intelligence Quickstart and Skill delivery all run `login` first; Quickstart does not. The repo keeps `frontend/.env.local`.

## [Landing page](https://docs.copilotkit.ai/ms-agent-python)

15. **`route.ts` can't serve its handler and reads an undefined `AGENT_URL`**: the file is titled `app/api/copilotkit/route.ts`, but Quickstart and Copilot Runtime require `[[...slug]]/route.ts`. The plain route returns `{"error":"Not found"}`, yet `next build` passes. No page defines `process.env.AGENT_URL!`. Repo: `frontend/src/app/api/copilotkit-landing/route.ts`.

## [Copilot Runtime](https://docs.copilotkit.ai/ms-agent-python/copilot-runtime)

17. **Names the wrong agent-discovery error**: `CopilotKitAgentDiscoveryError` is not exported from `react-core/v2` (TS2305). `useAgent` throws a plain `Error`: `useAgent: Agent 'X' not found after runtime sync ...`. Demo: `/copilot-runtime/demo-chat`.

## Shared State pages

1. **`useAgent` has no `initialState`**: it is not in `UseAgentProps` (type error). The `render` prop on the Read page does not exist either. The repo seeds state via `default_state` on `add_agent_framework_fastapi_endpoint`.

## Tool rendering (`useDefaultRenderTool`)

3. **Sample destructures `args`**: `DefaultRenderProps` has `name, toolCallId, parameters, status, result` and no `args`.

## Inspector

4. **Toggle depends on the provider**: `enableInspector={false}` works only on `<CopilotKit>`. `<CopilotKitProvider>` reads `showDevConsole` and mounts the inspector itself. A hand-mounted `<CopilotKitInspector />` shows "CopilotKit core not attached".

## Slots

5. **Plain component not assignable**: `SlotValue<C> = C | string | Partial<ComponentProps<C>>` requires the default component's statics, so the level-3 example fails typecheck at 1.73.3.

## Headless UI

6. **`msg.content` is not a `ReactNode`**: it is typed `string | ContentPart[] | Record<…> | undefined`, so `<p>{msg.content}</p>` fails. The page also imports `randomUUID` from `@copilotkit/shared`, which is not a declared dependency.

## [Markdown Rendering](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/markdown)

20. **Surrounding setup incomplete**: the `my-link`/`my-heading` classes are defined nowhere, and the snippet strips the Streamdown classes and `data-streamdown`. The prescribed unused `node` destructure triggers `@typescript-eslint/no-unused-vars`. An unknown key gives an undocumented `TS7031` alongside `TS2353`. The page is missing from the sidebar.

## A2UI

14. **Catalog works with zod 3 only; zod 4 fails silently**: `@copilotkit/a2ui-renderer` depends on `zod@^3.25`. A zod 4 schema with a type cast builds, but `GenericBinder` reads `_def.typeName`/`_def.shape()`, so the card renders blank with no error. The repo uses `"zod-v3": "npm:zod@^3.25.75"`.

## Threads

11. **Needs Intelligence and a catch-all route**: `<CopilotThreadsDrawer>` needs `licenseStatus` `valid`/`expiring`, which `/info` reports only when `CopilotKitIntelligence` is set up. With the in-memory runtime the drawer stays locked. "Create thread with your own API on first message" is not implemented. The repo uses `/api/copilotkit-threads/[[...slug]]`.

## [Threads Drawer](https://docs.copilotkit.ai/ms-agent-python/prebuilt-components/copilot-threads-drawer)

12. **React wrapper drops `slot` children**: the page shows `<span slot="header">`, but `CopilotThreadsDrawerProps` has no `children` (type error) and the wrapper renders only the `renderRow` output.
23. **Sidebar snippet uses an undefined `<YourMainContent />`**: the repo supplies a placeholder at `/threads/drawer/demo-chat`.

## [Threads lifecycle](https://docs.copilotkit.ai/ms-agent-python/threads-lifecycle)

22. **`existingId` is never defined**: the page calls `setActiveThreadId(existingId, { explicit: true })`. The demo passes the first thread id as a prop.

## [Message history](https://docs.copilotkit.ai/ms-agent-python/backend/message-history)

25. **Wrong claim about MAF history, plus snippet gaps**: the page says MAF keeps its own history, but the trimmed runtime answered `UNKNOWN` where the untrimmed one answered `Sam` (`agent-framework-ag-ui` 1.1.0, `-core` 1.14.0). The page never explains how MAF keeps history. `process.env.AGENT_URL!` is undefined (see #15), and the check script gives `TS2339` on `trimmedParallel[i].toolCallId`.

## [Jev generative UI](https://docs.copilotkit.ai/ms-agent-python/cookbook/jev-generative-ui)

21. **Pinned stack doesn't match, and needs a third-party key**:
   - It pins 10 exact versions (CopilotKit 1.73.0, `zod@4.6.5`, `@typesafe-ai/sdk@0.6.0`, `@langchain/openai@1.5.13`, ...), and `@copilotkit/intelligence-langgraph@1.71.2` does not match the rest.
   - It requires `TYPESAFE_API_KEY`.
   - `@copilotkit/core` and `@langchain/core` are pinned but never imported. `rxjs` and `@ag-ui/core` are imported but not declared.
   - `PickerAgent` `.catch(() => {…})` discards the cause, which breaks the page's own rule.
   - `model: "jev-1.13.0"` is never explained.
   - The page is missing from the sidebar.

## [Automatic Learning](https://docs.copilotkit.ai/ms-agent-python/learning)

19. **Container naming contradiction**: the manual path uses the env var `CPK_INTELLIGENCE_LEARNING_CONTAINER_ID`, but Skill delivery says that omitting the config disables skill requests even when env vars are set. So a `BuiltInAgent` configured by env alone silently requests nothing. See #27.
29. **Prose puts `getLearningContainerId` "on the CopilotKit runtime"**, while the snippet and table use `CopilotKitIntelligence`. The runtime-level method is `@deprecated` at 1.73.3.

## [Skill delivery](https://docs.copilotkit.ai/ms-agent-python/intelligence/learned-skills)

26. **Every snippet contains the placeholder `revision: "exact-revision-id"`** (BuiltInAgent ×2, LangGraph Py/TS, Mastra, ADK, .NET, SDK client). The note to replace it appears only once.
27. **"Omit them to use environment variables" contradicts "Omitting the configuration disables all skill requests"**: at runtime 1.73.3, `skillRegistry` is undefined when `learnedSkills === undefined`. The env fallback applies only with `learnedSkills: {}`.
28. **SDK-client snippet sets `apiUrl` without `wsUrl`**: the runtime warns that wsUrl falls back to the managed default, so self-hosted realtime traffic goes to the cloud host.
32. **Two different placeholders for `CPK_INTELLIGENCE_API_KEY`**: `"your-project-key"` and `cpk-...` (the second also appears in Automatic Learning and Quickstart). The first drops the `cpk-` prefix.

## [Plans](https://docs.copilotkit.ai/ms-agent-python/intelligence/plans)

30. **Says the free Developer plan includes User Memory**: sibling harnesses got `403 MEMORY_NOT_ENTITLED`. Not reproduced in this repo; needs a re-test.

## Connect your runtime (removed)

31. **`/ms-agent-python/intelligence/connect-your-runtime` returns 404 with no redirect**: the repo's links now point to `/intelligence/quickstart`.
