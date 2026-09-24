# Findings — MsPy-react
Open doc defects only. An entry is added only after the user approves it. Numbers are stable IDs (code cites `FINDINGS.md #N`), so gaps are removed findings.
Stack: `@copilotkit/react-core`/`runtime` 1.73.3, `@ag-ui/client` 0.0.59, `next` 16.3.2, `agent-framework-ag-ui` 1.4.0, `agent-framework-core` 1.19.0, `agent-framework-openai` 1.14.4. Docs: https://docs.copilotkit.ai/ms-agent-python

## Dev blockers (seen with `npm run dev` and normal use of the page)

### [Quickstart](https://docs.copilotkit.ai/ms-agent-python/quickstart)
**#33 Agent server crashes on start: `azure-identity` is missing.**
- **Doc:** `uv add agent-framework-ag-ui python-dotenv uvicorn agent-framework-openai`, then `main.py` does `from azure.identity import DefaultAzureCredential` at the top of the file.
- **Error:** `ModuleNotFoundError: No module named 'azure'`. It crashes even on the plain OpenAI path. Reproduced from a clean `uv init`. The harness hides it: `backend/pyproject.toml:10` declares `azure-identity`.

### [Landing page](https://docs.copilotkit.ai/ms-agent-python)
**#15 Runtime route returns Not found, and the agent URL is undefined.**
- **Doc:** the file is `app/api/copilotkit/route.ts`, not `[[...slug]]/route.ts`. It uses `basePath: "/api/copilotkit"` and `new HttpAgent({ url: process.env.AGENT_URL! })`.
- **Error:** `POST /api/copilotkit` returns `404 {"error":"Not found"}`, and `AGENT_URL` is `undefined` because no page defines it. The `!` hides this from the compiler.

## Minor notes
- #18 Quickstart: `npx copilotkit@latest project select` aborts with "You are not signed in" because the page has no `login` step. This is on the optional Intelligence path, and the error tells you the fix.
- #13 Quickstart: `@ag-ui/client` is installed unpinned. A fresh install resolves a single copy today.
- #17 Copilot Runtime: names `CopilotKitAgentDiscoveryError`, which isn't exported (prose only).
- #4 Inspector: `enableInspector` applies only to `<CopilotKit>`.
- #11 Threads: the drawer stays locked without Intelligence. The page now says Intelligence is required.
- #22 Threads lifecycle: `existingId` is undefined (a placeholder).
- #23 Threads Drawer: `<YourMainContent />` is undefined (a placeholder).
- #21 Jev: the `intelligence-langgraph@1.71.2` pin doesn't match, and it needs `TYPESAFE_API_KEY`.
- #19/#27 Learning/Skill delivery: leaving out `learnedSkills` silently turns skills off. Now documented at learned-skills:132.
- #28 Skill delivery: `apiUrl` without `wsUrl` sends realtime traffic to the cloud.
- #31 `/intelligence/connect-your-runtime` returns 404 with no redirect.
- #7 Quickstart: the env uses `gpt-5.4-mini`, but the code default is `gpt-4o-mini`.
- #8 Quickstart installs the unused `@copilotkit/react-ui`.
- #20 Markdown: `my-link`/`my-heading` classes are undefined, and `node` is unused.
- #26 Skill delivery: every example has `revision: "exact-revision-id"`.
- #29 Learning: the prose says "on the CopilotKit runtime", but the table says `CopilotKitIntelligence`.
- #30 Plans: says Developer includes User Memory. Not re-tested (needs a key).
- #32 Skill delivery: `"your-project-key"` vs `cpk-...`.

## Build-only (`tsc` / `next build`; `npm run dev` runs fine)
- **#3 [Tool rendering](https://docs.copilotkit.ai/ms-agent-python/generative-ui/tool-rendering):** `useDefaultRenderTool({ render: ({ name, args, status, result }) => … })` fails with `TS2339: Property 'args' does not exist on type 'DefaultRenderProps'`. The prop is `parameters`, and in dev `args` is just undefined.
- **#6 [Headless UI](https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/headless-ui):** `<p>{msg.content}</p>` fails with `TS2322: Type 'Record<string, any>' is not assignable to type 'ReactNode'`. In dev plain text works. It throws only on non-string content (images, activity messages). `randomUUID` comes from the undeclared `@copilotkit/shared`.
- **#12 [Threads Drawer](https://docs.copilotkit.ai/ms-agent-python/prebuilt-components/copilot-threads-drawer):** `<CopilotThreadsDrawer><span slot="header">…</span>` fails with `TS2559: Type '{ children: Element; }' has no properties in common with type 'CopilotThreadsDrawerProps'`. In dev the header is silently dropped. Only `label` changes it.
- **#25 [Message history](https://docs.copilotkit.ai/ms-agent-python/backend/message-history):** `answers.add(trimmedParallel[i].toolCallId)` fails with `TS2339: Property 'toolCallId' does not exist`. It runs fine. `AGENT_URL!` is undefined (#15).
