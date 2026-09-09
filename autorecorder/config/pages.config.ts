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
    prompt: 'Clear the temp cache for me by running rm -rf /tmp/cache',
    waitAfterPromptMs: 4000,
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
        filePath: 'frontend/src/app/threads/headless/demo-chat/page.tsx',
        startLine: 150,
        endLine: 200,
      },
    ],
    prompt: 'Summarize what an AG-UI agent is, in one line.',
    waitAfterPromptMs: 4000,
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
  },
  {
    id: 'intelligence-quickstart',
    name: 'Intelligence - Connect Intelligence in 5 minutes',
    videoName: 'IntelligenceQuickstart',
    docPath: 'intelligence/quickstart',
    route: 'intelligence/quickstart',
    // The doc's step 3. A plain `route.ts` with `mode: "single-route"` and one
    // verb, where the page used to publish `[[...slug]]` and four.
    ideFile: 'frontend/src/app/api/copilotkit-single/route.ts',
    startLine: 1,
    endLine: 38,
    extraTabs: [
      // Step 4: the matching provider flag.
      {
        filePath: 'frontend/src/components/single-endpoint-provider.tsx',
        startLine: 26,
        endLine: 48,
      },
    ],
    prompt: 'What is the weather in Karachi?',
    // The only page in this suite whose runtime route is never touched by any
    // other take, so its first request is also the first time `next dev`
    // compiles `/api/copilotkit-single`. On a cold CI runner that lands past
    // the 30s default and the take fails with the agent apparently silent.
    // `core/timeouts.ts` says the defaults suit a warm dev server and that a
    // legitimately slow page should say so here; this is that page.
    timeouts: { replyStartMs: 90_000 },
    waitAfterPromptMs: 4000,
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
    waitAfterPromptMs: 6000,
  },

  // The scaffolded app, once per package manager — video 3 of each set.
  // `generated: true`: these files do not exist until the CLI pipeline has run,
  // so the doctor reports them rather than failing, and an unfiltered run skips
  // them with a note.
  ...DEMO_PAGES,
]);
