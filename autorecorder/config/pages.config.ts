/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ADAPT THIS FILE — 3 of 4
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * One entry per doc page, in the order the doc nav lists them.
 *
 * Entries are deliberately short. `docUrl`, `demoUrl` and the output filename
 * are derived from `project.config.ts` plus the fields below, so no entry can
 * point at the wrong framework's docs and filenames stay in nav order without
 * anyone numbering them by hand.
 *
 * Adapting means: delete the pages this framework does not document, add the
 * ones it does, and fix the line ranges. `npm run doctor` then tells you which
 * ranges no longer point at real code.
 *
 * ── The line ranges ────────────────────────────────────────────────────────
 * `startLine`/`endLine` are what the simulated IDE highlights. They are
 * hardcoded, which means they drift the moment someone edits a demo page.
 * Doctor guards this: where a file carries `[!code highlight]` or `#region`
 * markers, it checks the range still covers one and names the marker's current
 * line when it does not. Keep those markers in the frontend and the guard keeps
 * working.
 */

import { SELECTORS } from './selectors.config';
import { definePages, type PageDefinition } from '../core/types';

/**
 * The scaffolded app, running — video 3 of each package manager's set.
 *
 * The other two are the CLI creating the project and that manager installing
 * it, both in `config/cli.config.ts`. This one is the payoff, and it is a
 * recording of the real app rather than a re-enactment: the dev server filmed
 * booting in the terminal is the same process that serves the page driven
 * immediately afterwards.
 *
 * The order on screen is how someone would actually check a fresh scaffold:
 *
 *   1. the doc page that told them to run the CLI
 *   2. `package.json` — what the starter declares
 *   3. the lockfile — what this manager actually resolved, pinned
 *   4. the app's own CopilotKit code, so the chat below has a source
 *   5. `<pm> run dev` booting, in a terminal
 *   6. the app open in a browser, asked a question, answering
 *
 * Steps 2 and 3 are the pair that matters. `package.json` carries RANGES, so on
 * its own it cannot answer "which versions is this?" — and the resolved set is
 * exactly where four package managers can differ. The lockfile is where that
 * difference is written down, which is why this tab is a different file in each
 * set. VERSIONS.md, the generated summary of the same thing, stays on the
 * install and finding clips: showing both here would say it twice before the
 * app has appeared.
 *
 * All four managers are listed, bun included, even though its install dies in
 * the postinstall script on Windows. That is deliberate: this is a test harness,
 * and the entry is what re-checks the finding on every run. When bun still
 * fails, `bun run dev` never prints its ready line, the recorder reports a dev
 * server that never started and writes no video — and bun's third deliverable
 * stays the finding clip in `cli.config.ts`. When a future bun stops failing,
 * this entry starts producing a demo without anyone having to remember to add
 * it back.
 *
 * Port 3121 and up, never 3000: the repo's own frontend usually holds 3000, and
 * a recording that quietly used *that* would look like a pass while proving
 * nothing about the scaffold.
 *
 * Not 3101–3104 either, and that is not superstition. This CLAUDE.md ships to
 * every framework repo, so every repo's copy of this file picked the same
 * ports — and a sibling repo's scaffold left running on 3101 is enough for the
 * dev server here to fail with EADDRINUSE while the browser happily records
 * *that other framework's app* answering nothing. It happened. Each framework
 * repo should move this block to its own port range rather than share one.
 *
 * `readyPattern` is what the dev server prints when it is serving. If a future
 * starter changes that wording, the recorder waits out the timeout and reports
 * that the server never started — the right failure, since it never became
 * reachable in a way this config recognises.
 */
// `agentPort` mirrors `port` in the 81xx range: one Python agent per copy, none
// of them on 8000, which this repo's own backend holds. Keep the two columns in
// step — `AGENT_URL` is built from `agentPort` below.
const DEMO_PAGES: PageDefinition[] = [
  { pm: 'npm', command: 'npm', args: ['run', 'dev'], lockfile: 'package-lock.json', port: 3121, agentPort: 8121 },
  { pm: 'pnpm', command: 'pnpm', args: ['run', 'dev'], lockfile: 'pnpm-lock.yaml', port: 3122, agentPort: 8122 },
  { pm: 'yarn', command: 'yarn', args: ['run', 'dev'], lockfile: 'yarn.lock', port: 3123, agentPort: 8123 },
  // bun 1.2 writes a text `bun.lock`; older bun wrote the binary `bun.lockb`,
  // which has nothing readable to put on screen. The doctor names this file if
  // the installed bun produced the other one.
  { pm: 'bun', command: 'bun', args: ['run', 'dev'], lockfile: 'bun.lock', port: 3124, agentPort: 8124 },
].map(({ pm, command, args, lockfile, port, agentPort }) => {
  const app = `1-cli-testing/${pm}/app`;
  return {
    id: `demo-${pm}`,
    name: `${pm} · 3 · Scaffolded app - manifest, lockfile, dev server and a live agent`,
    videoName: `Demo-${pm}`,
    // Names the file as the third of this manager's set rather than by doc-nav
    // position, so one manager's three clips sort together.
    videoFile: `${pm}-3-Demo`,
    docPath: 'quickstart?agent=bring-your-own',
    // Unused for these pages — the demo URL comes from devServer — but kept
    // meaningful so logs read sensibly.
    route: 'quickstart',
    generated: true,

    // What the starter declares. Also the file whose absence tells the runner
    // this manager's app has not been scaffolded and installed yet.
    ideFile: `${app}/package.json`,
    startLine: 1,
    endLine: 24,
    extraTabs: [
      // What it resolved to. A lockfile is long and mostly uninteresting; its
      // head is the part that identifies the tree — format version, then the
      // first resolved entries.
      { filePath: `${app}/${lockfile}`, startLine: 1, endLine: 26 },
      // The CopilotKit integration itself — the code behind the chat that
      // answers a few seconds later. Adjust once a real scaffold exists; the
      // doctor names this file if the path is wrong.
      { filePath: `${app}/src/app/page.tsx`, startLine: 1, endLine: 30 },
    ],

    prompt: 'The install just finished. Tell me a joke to celebrate.',
    waitAfterPromptMs: 5000,

    devServer: {
      cwd: app,
      command,
      args,
      // The Python agent needs a relocated port of its own, for the same reason
      // Next does — and it is the *agent* collision that is easy to miss.
      //
      // `agent/src/main.py` defaults to `AGENT_PORT` 8000, and this repo's own
      // backend already listens there (`backend/main.py`, running since the repo
      // was last worked on). The scaffolded agent therefore never binds, and the
      // runtime POSTs to that other FastAPI app instead — which mounts AG-UI on
      // a different path, so `POST /` returns `405 Method Not Allowed`. Observed
      // 2026-09-07: `/health` on 8000 answered with an `instantiated_at` three
      // days older than the run.
      //
      // `AGENT_URL` moves with it: `src/agent.ts` reads that to find the agent,
      // and the CLI writes `http://localhost:8000` into the app's `.env`. A real
      // env var wins over a `.env` entry in both Next and python-dotenv, so
      // setting it here is enough — the file is left as the CLI wrote it.
      env: {
        PORT: String(port),
        AGENT_PORT: String(agentPort),
        AGENT_URL: `http://localhost:${agentPort}`,
        BROWSER: 'none',
      },
      readyPattern: /Ready in|ready in|started server on|Local:\s+http/i,
      // A first `next dev` compiles the whole app; on a cold cache this is slow
      // and a tighter cap would report a failure for a server that was fine.
      readyTimeoutMs: 240_000,
      originUrl: `http://localhost:${port}`,
      demoPath: '/',
      title: `${command} run dev`,
    },
  };
});

export const PAGES = definePages([
  {
    id: 'quickstart',
    name: 'Quickstart',
    videoName: 'Quickstart',
    docPath: 'quickstart?agent=bring-your-own',
    route: 'quickstart',
    // Leads with the versions, not the manifest. package.json declares
    // RANGES, so this clip used to show a floor while the run it
    // documented had installed something newer. VERSIONS.md is generated
    // after install (ci/write-versions.mjs) and names what resolved.
    // package.json stays as the first tab: the range is still what a
    // reader would write in their own project.
    ideFile: 'frontend/VERSIONS.md',
    startLine: 6,
    endLine: 24,
    extraTabs: [
      {
        filePath: 'frontend/package.json',
        startLine: 12,
        endLine: 22,
      },
      {
        filePath: 'frontend/src/app/quickstart/demo-chat/page.tsx',
        startLine: 28,
        endLine: 38,
      },
    ],
    prompt: 'Hey, are you connected? Tell me a quick fun fact about kites.',
    waitAfterPromptMs: 4000,
  },
  {
    id: 'prebuilt-components',
    name: 'Prebuilt Components',
    videoName: 'PrebuiltComponents',
    docPath: 'prebuilt-components',
    route: 'prebuilt-components',
    ideFile: 'frontend/src/app/prebuilt-components/demo-chat/page.tsx',
    startLine: 58,
    endLine: 104,
    prompt: 'In two sentences, what does CopilotKit do?',
    prompts: ['In two sentences, what does CopilotKit do?'],
    waitAfterPromptMs: 1500,
  },
  {
    id: 'slots',
    name: 'Custom Look and Feel - Slots',
    videoName: 'Slots',
    docPath: 'custom-look-and-feel/slots',
    route: 'custom-look-and-feel/slots',
    ideFile: 'frontend/src/app/custom-look-and-feel/slots/demo-chat/page.tsx',
    startLine: 66,
    endLine: 116,
    prompt: 'Testing level one: the default slots. Say hi back.',
    prompts: [
      'Testing level one: the default slots. Say hi back.',
      'Level two now, with the props overridden. Still there?',
      'Level three, a fully custom message component. One line, please.',
    ],
    waitAfterPromptMs: 1500,
  },
  {
    id: 'headless-ui',
    name: 'Custom Look and Feel - Headless UI',
    videoName: 'HeadlessUI',
    docPath: 'custom-look-and-feel/headless-ui',
    route: 'custom-look-and-feel/headless-ui',
    ideFile: 'frontend/src/app/custom-look-and-feel/headless-ui/demo-chat/page.tsx',
    startLine: 28,
    endLine: 78,
    prompt: 'Suggest one good name for a headless chat UI.',
    waitAfterPromptMs: 4000,
  },
  {
    id: 'programmatic-control',
    name: 'Custom Look and Feel - Programmatic Control',
    videoName: 'ProgrammaticControl',
    docPath: 'programmatic-control',
    route: 'programmatic-control',
    ideFile: 'frontend/src/app/programmatic-control/demo-chat/page.tsx',
    startLine: 28,
    endLine: 102,
    prompt: 'Is it raining in Tokyo right now?',
    waitAfterPromptMs: 1500,
  },
  {
    id: 'inspector',
    name: 'Custom Look and Feel - Inspector',
    videoName: 'Inspector',
    docPath: 'inspector',
    route: 'inspector',
    ideFile: 'frontend/src/components/providers.tsx',
    startLine: 30,
    endLine: 47,
    prompt: 'Quick check: what is 17 times 23?',
    waitAfterPromptMs: 1500,
  },
  {
    id: 'display-only',
    name: 'Generative UI - Display Only Component',
    videoName: 'DisplayOnly',
    docPath: 'generative-ui/your-components/display-only',
    route: 'generative-ui/your-components/display-only',
    ideFile:
      'frontend/src/app/generative-ui/your-components/display-only/demo-chat/page.tsx',
    startLine: 27,
    endLine: 55,
    prompt: 'Show me a weather card for Tokyo. It is 77 degrees and clear today.',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 12000,
      render: {
        selector: 'div:has-text("Tokyo"), div:has-text("77°F")',
        last: true,
        timeoutMs: 25000,
        beatMs: 3500,
      },
      glideTo: [{ x: 960, y: 500, beatMs: 600 }],
    },
  },
  {
    id: 'interactive',
    name: 'Generative UI - Interactive Component (Approval Gate)',
    videoName: 'Interactive',
    docPath: 'generative-ui/your-components/interactive',
    route: 'generative-ui/your-components/interactive',
    ideFile:
      'frontend/src/app/generative-ui/your-components/interactive/demo-chat/page.tsx',
    startLine: 23,
    endLine: 64,
    // Was "Clear the temp cache for me by running rm -rf /tmp/cache". That
    // reads as a request to destroy something, and a model is free to answer
    // it in prose — refuse, ask what is in the directory, or explain the flag —
    // in which case `humanApprovedCommand` is never called and the clip shows a
    // chat turn where the gate should be. It did fire on 2026-09-09, but only
    // because the model happened to cooperate; nothing in the prompt required
    // the tool.
    //
    // This wording does. The command is harmless, so there is nothing to refuse,
    // and "check with me before it runs" names the approval step the tool
    // exists for — the same phrasing that makes the Governed Actions page fire
    // its gate on every take.
    prompt: 'Deploy the app for me by running npm run deploy, but check with me before it runs.',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 12000,
      render: {
        selector: 'button:has-text("Approve")',
        timeoutMs: 20000,
        beatMs: 1500,
        required:
          '[Human in the Loop] The Approve button never rendered — the approval card did not appear, so the gate was never exercised.',
      },
      click: {
        selector: 'button:has-text("Approve")',
        missing: '[Human in the Loop] The Approve button vanished before it could be clicked.',
      },
      checks: [
        {
          selector: 'button:has-text("Approve")',
          enabled: false,
          severity: 'warn',
          ok: '[Human in the Loop] Approval taken and a follow-up reply arrived.',
          message: '[Human in the Loop] Approve is still clickable after the reply — the decision may not have reached the agent.',
        },
      ],
    },
  },
  {
    id: 'tool-rendering',
    name: 'Generative UI - Tool Rendering',
    videoName: 'ToolRendering',
    docPath: 'generative-ui/tool-rendering',
    route: 'generative-ui/tool-rendering',
    ideFile: 'frontend/src/app/generative-ui/tool-rendering/demo-chat/page.tsx',
    startLine: 23,
    endLine: 63,
    prompt: 'Check the weather in Paris for me.',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 12000,
      render: {
        selector: 'p:has-text("weather API"), .copilotKitAssistantMessage',
        timeoutMs: 20000,
        beatMs: 2500,
      },
      checks: [
        {
          selector: 'text=Called the weather API for',
          severity: 'warn',
          ok: '[Tool Rendering] Custom renderer mounted ("Called the weather API for …").',
          message:
            '[Tool Rendering] "Called the weather API for" never appeared. The reply streamed, but the useRenderTool component did not mount — check that the tool name matches get_weather.',
        },
      ],
    },
  },
  {
    id: 'state-rendering',
    name: 'Generative UI - State Rendering',
    videoName: 'StateRendering',
    docPath: 'generative-ui/state-rendering',
    route: 'generative-ui/state-rendering',
    ideFile: 'frontend/src/app/generative-ui/state-rendering/demo-chat/page.tsx',
    startLine: 28,
    endLine: 53,
    prompt: 'Look up the longest rivers in the world, then the highest waterfalls.',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 12000,
      glideTo: [
        { selector: 'div:has-text("Searches (rendered outside the chat)") + div, h2:has-text("Searches")', offset: { x: 120, y: 40 } },
        'pre',
      ],
      checks: [
        {
          selector: 'text=No searches yet',
          absent: true,
          timeoutMs: 1000,
          severity: 'warn',
          ok: '[State Rendering] Searches panel populated from agent state.',
          message:
            '[State Rendering] Panel still reads "No searches yet" after the reply. agent.state.searches never populated — check update_searches and predict_state_config.',
        },
      ],
    },
  },
  {
    id: 'frontend-tools',
    name: 'App Control - Frontend Tools',
    videoName: 'FrontendTools',
    docPath: 'frontend-tools',
    route: 'frontend-tools',
    ideFile: 'frontend/src/app/frontend-tools/demo-chat/page.tsx',
    startLine: 20,
    endLine: 33,
    prompt: 'Can you say hello to Sara for me?',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 12000,
      alert: { missing: '[Frontend Tools] No browser alert fired -- the sayHello tool may not have run in the browser.' },
    },
  },
  {
    id: 'in-app-agent-read',
    name: 'Shared State - In-App Agent Read',
    videoName: 'SharedStateRead',
    docPath: 'shared-state/in-app-agent-read',
    route: 'shared-state/in-app-agent-read',
    ideFile: 'frontend/src/app/shared-state/in-app-agent-read/demo-chat/page.tsx',
    startLine: 20,
    endLine: 55,
    prompt: 'Please switch the language to Spanish.',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 12000,
      glideTo: [
        { selector: 'strong:has-text("spanish"), strong:has-text("english"), h1:has-text("Your main content")', offset: { x: 100, y: 15 } },
        'pre',
      ],
      checks: [
        {
          selector: 'strong',
          contains: 'spanish',
          severity: 'warn',
          ok: '[Shared State Read] Language panel reads "spanish" — state reached the page.',
          message:
            '[Shared State Read] Language panel reads {text} after the reply. The agent may have answered in text without calling update_language.',
        },
      ],
    },
  },
  {
    id: 'in-app-agent-write',
    name: 'Shared State - In-App Agent Write',
    videoName: 'SharedStateWrite',
    docPath: 'shared-state/in-app-agent-write',
    route: 'shared-state/in-app-agent-write',
    ideFile: 'frontend/src/app/shared-state/in-app-agent-write/demo-chat/page.tsx',
    startLine: 30,
    endLine: 54,
    prompt: 'Which language is set right now?',
    waitAfterPromptMs: 4000,
  },
  {
    id: 'readables',
    name: 'Readables',
    videoName: 'Readables',
    docPath: 'agent-app-context',
    route: 'readables',
    ideFile: 'frontend/src/app/readables/demo-chat/page.tsx',
    startLine: 18,
    endLine: 34,
    prompt: 'Who do I work with? Name them.',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 12000,
      glideTo: [{ selector: 'ul, li:has-text("John Doe")', offset: { x: 120, y: 40 }, beatMs: 2000 }],
      checks: [
        {
          selector: SELECTORS.assistantMessage,
          last: true,
          contains: ['John Doe', 'Jane Smith', 'Bob Wilson'],
          severity: 'warn',
          ok: '[Readables] Answer cites all 3 colleagues — the context reached the agent.',
          message:
            '[Readables] Answer cites only {found}/{total} of the shared colleagues. Check that the chat is bound to `context_agent` and not a plain agent.',
        },
      ],
    },
  },
  {
    id: 'auth',
    name: 'Authentication - Bearer Token',
    videoName: 'Auth',
    docPath: 'auth',
    route: 'auth',
    ideFile: 'backend/main.py',
    startLine: 66,
    endLine: 90,
    prompt: 'Quick ping: did this request come through authenticated?',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 12000,
      before: [
        {
          selector:
            'div[class*="border-emerald"], div[class*="border-amber"], div[class*="border-rose"], h2:has-text("Current configuration")',
          offset: { x: 100, y: 40 },
          beatMs: 2500,
        },
      ],
    },
  },
  {
    id: 'threads-drawer',
    name: 'Rich Threads - Threads Drawer',
    videoName: 'ThreadsDrawer',
    docPath: 'prebuilt-components/copilot-threads-drawer',
    route: 'threads/drawer',
    ideFile: 'frontend/src/app/threads/drawer/demo-chat/page.tsx',
    startLine: 80,
    endLine: 116,
    prompt: 'Tell me a short joke about programmers.',
    waitAfterPromptMs: 4000,
  },
  {
    id: 'threads-headless',
    name: 'Rich Threads - Headless Threads',
    videoName: 'ThreadsHeadless',
    docPath: 'headless-threads',
    route: 'threads/headless',
    ideFile: 'frontend/src/app/threads/headless/demo-chat/page.tsx',
    startLine: 30,
    endLine: 50,
    extraTabs: [
      {
        // "Driving one agent per thread": the three-prop useAgent call.
        filePath: 'frontend/src/app/threads/headless/demo-chat/page.tsx',
        startLine: 181,
        endLine: 205,
      },
    ],
    prompt: 'Summarize what an AG-UI agent is, in one line.',
    waitAfterPromptMs: 4000,
    demo: {
      // The panel mounts one `useAgent({ agentId, runtimeAgentId, threadId })`
      // per thread. Registering two private agents against one runtime agent is
      // the whole claim of the section, so a panel that never paints is the
      // defect.
      render: {
        selector: '[data-testid="per-thread-agents"]',
        required:
          'The per-thread agent panel never rendered — useAgent({ agentId, runtimeAgentId, threadId }) did not mount.',
      },
      checks: [
        {
          selector: '[data-testid="thread-agent-run"]',
          enabled: true,
          ok: 'Thread-scoped agent is ready; runAgent() would address its own thread.',
          message:
            'The thread-scoped agent never became ready (isReady stayed false), so runAgent() could not address its thread.',
        },
      ],
    },
  },
  {
    id: 'threads-lifecycle',
    name: 'Rich Threads - Thread & History Lifecycle',
    videoName: 'ThreadsLifecycle',
    docPath: 'threads-lifecycle',
    route: 'threads/lifecycle',
    ideFile: 'frontend/src/app/threads/lifecycle/demo-chat/page.tsx',
    startLine: 25,
    endLine: 40,
    extraTabs: [
      {
        filePath: 'frontend/src/app/threads/lifecycle/demo-chat/page.tsx',
        startLine: 70,
        endLine: 100,
      },
    ],
    prompt: 'Give me a one-line joke, then I will start a new thread.',
    waitAfterPromptMs: 4000,
  },
  {
    id: 'copilot-runtime',
    name: 'Backend - Copilot Runtime',
    videoName: 'CopilotRuntime',
    docPath: 'copilot-runtime',
    route: 'copilot-runtime',
    ideFile: 'frontend/src/app/api/copilotkit/[[...slug]]/route.ts',
    startLine: 19,
    endLine: 37,
    prompt: 'What is the weather in Berlin today?',
    prompts: ['What is the weather in Berlin today?', 'Now switch the language to Spanish.'],
    waitAfterPromptMs: 1500,
  },
  {
    id: 'ag-ui',
    name: 'Backend - AG-UI Protocol Stream',
    videoName: 'AgUi',
    docPath: 'ag-ui',
    route: 'ag-ui',
    ideFile: 'frontend/src/app/ag-ui/demo-chat/page.tsx',
    startLine: 70,
    endLine: 102,
    prompt: 'Any rain expected in Tokyo this week?',
    waitAfterPromptMs: 4000,
    demo: {
      sendTimeoutMs: 8000,
      glideTo: [
        { x: 450, y: 300, beatMs: 1500 },
        { x: 450, y: 550, beatMs: 1500 },
      ],
    },
  },
  {
    id: 'intelligence-learned-skills',
    name: 'Intelligence - Automatic learned skill delivery',
    videoName: 'LearnedSkills',
    docPath: 'intelligence/learned-skills',
    route: 'intelligence/learned-skills',
    // There is no adapter to show, so the IDE tab is the demo itself: the two
    // tool names the page reserves, listed as absent rather than registered.
    ideFile: 'frontend/src/app/intelligence/learned-skills/demo-chat/page.tsx',
    startLine: 7,
    endLine: 31,
    prompt: 'List the skills you can load, then load the refund-policy skill and follow it.',
    waitAfterPromptMs: 3000,
    knownIssue: {
      area: "Microsoft Agent Framework - Intelligence - Automatic learned skill delivery",
      problem:
        "The page is published in the Python section but its only Microsoft Agent Framework adapter is `CopilotKit.Intelligence.AgentFramework`, a C# package targeting net9.0, with a C# worked example. There is no Python path for this framework anywhere on the page. The base client the page says Python uses, `copilotkit-intelligence-runtime`, is not on PyPI (404 as of 2026-09-16), and neither are the two Python adapters it lists, `copilotkit-intelligence-langgraph` and `copilotkit-intelligence-adk`. The TypeScript siblings @copilotkit/intelligence-langgraph and -mastra are published at 1.71.2 (2026-09-14), so the gap is Python-side rather than the whole feature being unreleased. The 2026-09-21 sync added a BuiltInAgent row against @copilotkit/runtime/v2, which would run in this repo's own TypeScript runtime, but neither of its snippets compiles at the installed @copilotkit/runtime 1.69.2: `learnedSkills` is not a property of BuiltInAgentConfiguration in classic or factory mode (TS2353), the factory context has no `learnedSkills` (TS2339), and `BuiltInAgentFactoryContext`, which the prose says to import, is not exported (TS2724).",
      impact:
        "Nothing on the page can be followed from this backend. The two tools it reserves, `copilotkit_load_skill` and `copilotkit_read_skill_file`, are never registered, so the agent answers from its own instructions and the failure looks like an ordinary reply rather than a missing integration.",
      likelyCause:
        "The page's own closing section says \"The server migration and v1 delivery endpoint must deploy before adapters rely on them\", i.e. the feature may not be live yet -- but that is a deployment note at the bottom, not a prerequisite at the top, and nothing earlier is marked unavailable. The same page is published byte-identically under /agno, /ms-agent-python and /deepagents; of those three, Agno has no adapter row, Microsoft Agent Framework has only a .NET 9 one, and the LangGraph Python one 404s.",
      expectsNoResponse: false,
      note: "learned-skills - published under /ms-agent-python but the adapter is .NET\n\nthe only MS Agent Framework row is CopilotKit.Intelligence.AgentFramework\ntargets net9.0, worked example is C#. this repo is python\n\nthe generic python client it names doesnt exist either:\ncopilotkit-intelligence-runtime -> 404 on pypi\n\nTS ones are real (1.71.2, 14 Sep) so its the python side thats missing\n\n21 Sep: new BuiltInAgent row, @copilotkit/runtime/v2 - thats our runtime\nbut learnedSkills isnt on BuiltInAgentConfiguration at 1.69.2 (TS2353)\nand BuiltInAgentFactoryContext isnt exported (TS2724)\n\nso the two tools never get registered, agent just answers normally",
    },
  },
  {
    id: 'human-in-the-loop-governed-actions',
    name: 'App Control - Governed Action Approval',
    videoName: 'GovernedActions',
    docPath: 'human-in-the-loop/governed-actions',
    route: 'human-in-the-loop/governed-actions',
    // The tool registration -- the half that makes the run stop.
    ideFile: 'frontend/src/app/human-in-the-loop/governed-actions/demo-chat/page.tsx',
    startLine: 113,
    endLine: 152,
    extraTabs: [
      // The approval card the tool renders.
      {
        filePath: 'frontend/src/app/human-in-the-loop/governed-actions/demo-chat/page.tsx',
        startLine: 46,
        endLine: 107,
      },
    ],
    prompt:
      'Please send an invoice reminder to acme@example.com, but check with me before it goes out.',
    // Two turns, because the card has two answers and only one of them was
    // ever filmed. The first request is harmless and gets approved; the second
    // is destructive and gets rejected, which is the half that shows the
    // policy actually stopping something.
    prompts: [
      'Please send an invoice reminder to acme@example.com, but check with me before it goes out.',
      'Now permanently delete the acme@example.com customer record, but check with me before it goes through.',
    ],
    waitAfterPromptMs: 6000,
  },
  {
    // Appended rather than filed under Generative UI, where the doc nav puts
    // it. Filenames carry the position in this array, so slotting it at index 8
    // would renumber every clip after it and break the alignment with the
    // 01-22 files already published for earlier dates. New pages go at the end.
    id: 'a2ui-fixed-schema',
    name: 'Generative UI - A2UI - Fixed Schema',
    videoName: 'A2UIFixedSchema',
    docPath: 'generative-ui/a2ui/fixed-schema',
    route: 'generative-ui/a2ui/fixed-schema',
    // The catalog contract, not the page: these two components are the whole
    // vocabulary the agent's tree is allowed to name.
    ideFile: 'frontend/src/app/generative-ui/a2ui/fixed-schema/a2ui/definitions.ts',
    startLine: 46,
    endLine: 66,
    extraTabs: [
      // The tool that returns the operations container — the backend half.
      { filePath: 'backend/agents.py', startLine: 363, endLine: 403 },
      // And the two lines that make the middleware watch this agent alone.
      {
        filePath: 'frontend/src/app/api/copilotkit/[[...slug]]/route.ts',
        startLine: 47,
        endLine: 51,
      },
    ],
    // "one" and "just the single best option" are load-bearing. Asked for
    // flights plainly, the model offers three, calls `display_flight` once per
    // airline, and all three draw over the same `surfaceId` — the card that
    // survives is the last one, under a prose list naming two others it does not
    // show. Tightening the agent's instructions did not stop it; constraining
    // the question did.
    prompt: 'Find me one flight from JFK to LHR — just the single best option.',
    // The reply here is a tool call the model has to compose before anything is
    // drawn, and a run that weighed up several airlines before settling took 43s
    // end to end. The default 30s reply-start budget reports that as an agent
    // that never answered.
    timeouts: { replyStartMs: 90_000 },
    // Longer than the 4s most pages take: the surface paints after the tool
    // returns, which is one more round trip than a streamed text reply.
    waitAfterPromptMs: 6000,
  },

  {
    // Appended, not filed under Custom Look and Feel where the doc groups it,
    // for the reason a2ui-fixed-schema gives above: filenames carry the array
    // position, so inserting mid-array renumbers every clip after it.
    id: 'markdown',
    name: 'Custom Look and Feel - Markdown Rendering',
    videoName: 'MarkdownRendering',
    docPath: 'custom-look-and-feel/markdown',
    route: 'custom-look-and-feel/markdown',
    // The published snippets, not the demo that mounts them. All three are in
    // one file and each carries its own highlight marker; this range is the
    // first, the `components` map, which is the technique the page says to
    // reach for first.
    ideFile: 'frontend/src/app/custom-look-and-feel/markdown/published-snippets.tsx',
    startLine: 68,
    endLine: 97,
    extraTabs: [
      // The class string and the replacement renderer.
      {
        filePath: 'frontend/src/app/custom-look-and-feel/markdown/published-snippets.tsx',
        startLine: 108,
        endLine: 122,
      },
      {
        filePath: 'frontend/src/app/custom-look-and-feel/markdown/published-snippets.tsx',
        startLine: 143,
        endLine: 155,
      },
    ],
    // One prompt, sent once per tab. It has to provoke every tag the page
    // makes a claim about: a link (target/rel and data-streamdown), an h2, a
    // kbd and a sup (allowlisted tags that survive), and a reference-chip (a
    // custom tag, which must not). A reply with none of them leaves the four
    // claims unchecked, and the handler warns when that happens.
    prompt:
      'Reply in markdown with a level-2 heading, a sentence containing a link to https://copilotkit.ai, an inline <kbd>Ctrl</kbd>, a footnote marker written as <sup>1</sup>, and this exact sentence: Hi <reference-chip id="42">Doc 42</reference-chip>.',
    prompts: [
      'Reply in markdown with a level-2 heading, a sentence containing a link to https://copilotkit.ai, an inline <kbd>Ctrl</kbd>, a footnote marker written as <sup>1</sup>, and this exact sentence: Hi <reference-chip id="42">Doc 42</reference-chip>.',
      'Same again please: a level-2 heading and a sentence linking to https://copilotkit.ai.',
      'Same again please: a level-2 heading and a sentence linking to https://copilotkit.ai.',
      'Same again please: a level-2 heading and a sentence linking to https://copilotkit.ai.',
    ],
    waitAfterPromptMs: 2500,
  },
  {
    id: 'jev-generative-ui',
    name: 'Cookbook - Jev fast generative UI (prepared controls only)',
    videoName: 'JevGenerativeUI',
    docPath: 'cookbook/jev-generative-ui',
    route: 'cookbook/jev-generative-ui',
    // The published schemas and catalog. This and `read-action.ts` are the only
    // two files of the recipe that run here; `choose-panel.ts`,
    // `picker-agent.ts` and `learned-guidance.ts` are quoted on the route page
    // because @typesafe-ai/sdk, @langchain/openai and
    // @copilotkit/intelligence-langgraph are absent and the Jev key comes from
    // a third-party vendor. Nothing was installed to change that.
    ideFile: 'frontend/src/app/cookbook/jev-generative-ui/workspaces.ts',
    startLine: 27,
    endLine: 51,
    extraTabs: [
      // The one decision the recipe makes without Jev.
      {
        filePath: 'frontend/src/app/cookbook/jev-generative-ui/read-action.ts',
        startLine: 26,
        endLine: 43,
      },
      // The published render block, and the three substitutions above it.
      {
        filePath: 'frontend/src/app/cookbook/jev-generative-ui/demo-chat/page.tsx',
        startLine: 223,
        endLine: 245,
      },
    ],
    // Typed into the recipe's own `#request` form, not a chat composer. There
    // is no agent on this page, so `runJevAction` drives the form and the
    // prepared controls directly; the reply to this is the demo saying which
    // module and which key are missing.
    prompt: 'I need somewhere to work',
    waitAfterPromptMs: 2500,
  },

  // The scaffolded app, once per package manager — video 3 of each set.
  // `generated: true`: these files do not exist until the CLI pipeline has run,
  // so the doctor reports them rather than failing, and an unfiltered run skips
  // them with a note.
  ...DEMO_PAGES,
]);
