/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ADAPT THIS FILE — 4 of 4
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This framework's command-line flows: the scaffolding CLI and the installs
 * that follow it, each driven through a real terminal and captured to a cast
 * file that the recorder later replays on camera.
 *
 * Adapting means rewriting the prompts below to match *this* framework's CLI.
 * Every CopilotKit repo runs the same `copilotkit create`, but the answers
 * differ — the framework row, the Intelligence project, whether a chat-channel
 * prompt appears at all — and some frameworks' quickstarts use a different tool
 * entirely.
 *
 * ── The one rule ───────────────────────────────────────────────────────────
 * Name rows, do not count them. `select: { label: '...' }` walks the list until
 * the highlight is on that row. The alternative — "press Down twelve times" —
 * works until the CLI adds a menu entry, and then it scaffolds the wrong
 * framework while reporting success. The framework list has 23 entries today
 * and grows with every integration CopilotKit ships.
 *
 * ── Before the first run ───────────────────────────────────────────────────
 * `npm run capture -- --login` once. Sign-in opens a browser and cannot be
 * automated; doing it up front turns the mid-run auth pause into a precondition
 * and makes everything after it deterministic. It is also why these flows are
 * local-only and are not part of CI.
 *
 * The prompts encoded here were read off a real run — see
 * `1-cli-testing/CLI-FLOW.md`, which documents each one, what it expects, and
 * which of them are conditional.
 */
import { type DistributionConfig } from '../core/cli/distribute';
import { defineCliFlows, defineCliVideos } from '../core/cli/flow';

/** Names the generated app and its directory. Lowercase, digits, hyphens, ≤30. */
const APP_NAME = 'app';

/**
 * The row to select in `Select agent framework`.
 *
 * Must match this repo's backend. Matched as a case-insensitive substring, so
 * it needs to be unique in the list — 'Microsoft Agent Framework' alone would
 * also match the .NET row, which sits directly above it.
 */
const FRAMEWORK_ROW = 'Microsoft Agent Framework (Python)';

/** Existing CopilotKit Intelligence project to bind the app to. */
const INTELLIGENCE_PROJECT = 'myapp';

/** Where the CLI runs, relative to the repo root. The app lands inside it. */
const SCAFFOLD_DIR = '1-cli-testing';

/**
 * This repo's own Next app, relative to the repo root.
 *
 * Where `project select` is run for the Intelligence quickstart, because that
 * command writes its key into the current directory and this is the directory
 * whose dev server reads it. `.env` here is covered by `frontend/.gitignore`
 * (`.env*`), so the provisioned key is not committable by accident.
 */
const INTELLIGENCE_APP_DIR = 'frontend';

/**
 * Sign-in can take minutes when the CLI session has expired: the operator has
 * to complete a browser round trip before the project picker appears. Waiting
 * that long for one step is correct; it is the only step a human touches.
 */
const AUTH_TIMEOUT_MS = 6 * 60_000;

/**
 * The sign-in window, which is a person noticing a browser tab and typing a
 * password — not a machine doing something slow.
 *
 * Six minutes proved too short in practice: the run died while the operator was
 * still signing in, and a timeout there reads as "sign-in failed" when nothing
 * failed at all. This is the one step whose limit should be set by human
 * attention rather than by how long the work takes.
 */
const LOGIN_TIMEOUT_MS = 15 * 60_000;

/** Package managers the scaffold is installed with, one flow each. */
const PACKAGE_MANAGERS: readonly { id: string; command: string }[] = [
  { id: 'npm', command: 'npm' },
  { id: 'pnpm', command: 'pnpm' },
  { id: 'yarn', command: 'yarn' },
  { id: 'bun', command: 'bun' },
] as const;

/**
 * One scaffold, copied into four directories, with the model key seeded in.
 *
 * The CLI runs once. Running it four times would make the scaffold itself a
 * variable in a test whose only subject is the install, so a difference between
 * managers could not be attributed to the manager.
 *
 * The key is seeded here rather than typed into the CLI: the scaffold is created
 * without one on purpose, so no recording ever contains a secret, and placing it
 * once before the copy means it cannot be typo'd into three directories of four.
 */
export const CLI_DISTRIBUTION: DistributionConfig = {
  source: `${SCAFFOLD_DIR}/${APP_NAME}`,
  targets: PACKAGE_MANAGERS.map((pm) => `${SCAFFOLD_DIR}/${pm.id}/${APP_NAME}`),
  exclude: ['node_modules', '.next', '.git', '.turbo'],
  envFiles: [
    // The repo root .env is the one with a real key in it. Both destinations are
    // needed: the Next app reads the first, the agent process the second.
    { from: '.env', to: '.env' },
    { from: '.env', to: 'agent/.env' },
  ],
};

export const CLI_FLOWS = defineCliFlows([
  {
    id: 'login',
    name: 'CopilotKit CLI — sign in',
    castName: 'Login',
    cwd: '.',
    command: 'npx',
    args: ['copilotkit@latest', 'login'],
    // Manual because it hands off to a browser: the operator finishes the round
    // trip, and nothing here can wait on that meaningfully. Run it once, then
    // the scaffold flow needs no human at all.
    manual: true,
    timeoutMs: LOGIN_TIMEOUT_MS,
    stepTimeoutMs: LOGIN_TIMEOUT_MS,
    steps: [
      {
        // npx's own prompt, not CopilotKit's, and the same conditional as in
        // the scaffold flow below: it appears only when `copilotkit@latest` is
        // not already in the npx cache. The captured 01-Login cast has no
        // trace of it because the package was warm that day.
        //
        // Optional matters for more than tolerance: an unmatched optional step
        // sends nothing at all, so a warm run cannot leak a stray `y` into the
        // browser hand-off prompt sitting behind it.
        label: 'npx package install',
        waitFor: /Ok to proceed/i,
        optional: true,
        timeoutMs: 45_000,
        type: 'y',
        keys: ['Enter'],
      },
      {
        // `login` does not open the browser until this is acknowledged. Without
        // the keypress it sits on the prompt until the timeout, which reads as
        // "sign-in never completed" when in fact it never started.
        label: 'Acknowledge browser hand-off',
        waitFor: /Press Enter to continue/i,
        // Optional because the prompt only appears when there is no cached CLI
        // session. Signed in already, `login` reports the existing account and
        // exits without ever asking — and a required step would then sit here
        // for its full minute and fail a command that did nothing wrong.
        // Optional still answers the prompt whenever it does appear.
        optional: true,
        keys: ['Enter'],
        timeoutMs: 60_000,
      },
    ],
    // Nothing on disk to assert: the session is cached wherever the CLI keeps
    // it, and the proof it worked is the scaffold no longer pausing for auth.
    expectFiles: [],
  },

  {
    id: 'scaffold',
    name: 'CopilotKit CLI — create app',
    castName: 'Scaffold',
    docPath: 'quickstart?agent=bring-your-own',
    cwd: SCAFFOLD_DIR,
    command: 'npx',
    // `--project` names the Intelligence project instead of showing the picker.
    //
    // Not a shortcut for its own sake: with a valid CLI session already saved,
    // the interactive picker still sat on "Verifying authentication…" until the
    // step timed out, twice, on a network where `copilotkit project list`
    // answers instantly. Naming the project skips the step that hangs and
    // leaves every other prompt interactive and driven.
    args: ['copilotkit@latest', 'create', '--project', INTELLIGENCE_PROJECT],
    cols: 120,
    rows: 32,
    timeoutMs: 12 * 60_000,
    // The scaffold clones a template over the network, and that fails in ways
    // the CLI reports and then stops making progress on. Naming those here
    // turns a six-minute wait for a prompt that is never coming into an
    // immediate failure that quotes the actual error.
    abortOn: [/Init failed/i, /fatal: /i, /RPC failed/i],
    // Git's default HTTP/2 transport is what produced
    // "schannel: server closed abruptly" on this network. Scoped to this
    // command's children via git's own env-var config, so nothing global
    // changes for the machine.
    env: {
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'http.version',
      GIT_CONFIG_VALUE_0: 'HTTP/1.1',
    },
    steps: [
      {
        // npx's own prompt, not CopilotKit's — it appears only when the package
        // is not already cached. Optional, so a second run does not fail here,
        // and so the `y` is never typed into whatever prompt came instead.
        label: 'npx package install',
        waitFor: /Ok to proceed/i,
        optional: true,
        timeoutMs: 15_000,
        type: 'y',
        keys: ['Enter'],
      },
      {
        label: 'App name',
        waitFor: /App name/i,
        timeoutMs: 120_000,
        type: APP_NAME,
        keys: ['Enter'],
        settleMs: 600,
      },
      {
        label: 'Agent framework',
        waitFor: /Select agent framework/i,
        timeoutMs: 120_000,
        select: { label: FRAMEWORK_ROW, max: 40 },
        keys: ['Enter'],
        settleMs: 600,
      },
      {
        // `login` does not open its browser until Enter is pressed, and this
        // screen carries the same "…to continue" wording. Optional and cheap:
        // if it is only a spinner, the keypress is harmless; if it is waiting
        // for acknowledgement, nothing else was ever going to send it.
        label: 'Acknowledge account link (only if it asks)',
        waitFor: /Sign in with your browser|Verifying authentication/i,
        optional: true,
        timeoutMs: 30_000,
        keys: ['Enter'],
        settleMs: 2000,
      },
      {
        // Optional because `--project` above normally means this never appears.
        // Kept so that dropping the flag — or a CLI version that ignores it —
        // still produces a driven run rather than a hang.
        label: 'Intelligence project (skipped when --project is given)',
        waitFor: /Select a project/i,
        optional: true,
        timeoutMs: 15_000,
        select: { label: INTELLIGENCE_PROJECT },
        keys: ['Enter'],
        settleMs: 600,
      },
      {
        // Only frameworks whose starter ships a managed Channel host ask this —
        // 18 of the 23. Optional so this same config survives being pointed at
        // one of the five that do not.
        label: 'Chat platform',
        waitFor: /chat platform/i,
        optional: true,
        // Minutes, not seconds: the template is cloned between the account link
        // and this prompt. A 45s window expired mid-clone, so the prompt arrived
        // after this step had already given up — and then sat unanswered while
        // the next step waited for something behind it.
        timeoutMs: 5 * 60_000,
        select: { label: 'Not now' },
        keys: ['Enter'],
        settleMs: 600,
      },
      {
        // Single keypress: this prompt acts on the character, with no Enter.
        // Sending one would leak a stray Enter into the key prompt below and
        // answer it before it had painted.
        label: 'Decline dependency install',
        waitFor: /Want me to install the dependencies|install the dependencies/i,
        optional: true,
        timeoutMs: 60_000,
        type: 'n',
      },
      {
        // The model key is placed into the project afterwards, deliberately, so
        // it never appears in a recording. Enter leaves it empty and the CLI
        // exits. Optional because the exact wording is unconfirmed.
        label: 'Skip model API key',
        waitFor: /_API_KEY now|press Enter to skip|API key/i,
        optional: true,
        timeoutMs: 60_000,
        keys: ['Enter'],
      },
    ],
    // The CLI prints its success banner and then holds the terminal open rather
    // than exiting, so waiting for an exit fails a run whose own last line says
    // it worked.
    doneWhen: /created successfully/i,
    // Answering every prompt is not the same as producing an app. Without this,
    // a CLI that exits 0 having written nothing counts as a pass.
    expectFiles: [
      `${SCAFFOLD_DIR}/${APP_NAME}/package.json`,
      `${SCAFFOLD_DIR}/${APP_NAME}/agent`,
    ],
    // Light compression only. The pauses in an interactive session are someone
    // reading the prompt before answering it, and cutting them makes the video
    // unreadable — which is the one thing this clip exists to show.
    render: { maxGapSec: 1.6, speed: 1.15, title: 'Windows PowerShell' },
  },

  // One install per package manager. The scaffold is generated once and copied
  // into each of these directories, so the app is identical in all four and the
  // install path is the only variable under test.
  //
  // These have no steps: a package install asks nothing. They are here for the
  // cast — the install is a segment of the demo video — and for the durations,
  // which are the matrix's actual finding.
  ...PACKAGE_MANAGERS.map(({ id, command }) => ({
    id: `install-${id}`,
    name: `Install dependencies — ${id}`,
    castName: `Install-${id}`,
    cwd: `${SCAFFOLD_DIR}/${id}/${APP_NAME}`,
    command,
    args: ['install'],
    // Cold installs on a slow network genuinely take this long; a tighter cap
    // reports a failure for a command that was working fine.
    timeoutMs: 15 * 60_000,
    expectFiles: [`${SCAFFOLD_DIR}/${id}/${APP_NAME}/node_modules`],
    // The demo leads with resolved versions, and they can only be read once
    // something is installed.
    versionsFor: `${SCAFFOLD_DIR}/${id}/${APP_NAME}`,
    // An install is minutes of a spinner. Nobody watches that, but cutting it
    // entirely loses what the segment is evidence of — that it completed, and
    // roughly how long it took. Cap the dead air, then play what is left fast.
    render: { maxGapSec: 0.4, speed: 3, title: `${command} install` },
  })),

  // Last on purpose, even though it runs between two pnpm installs: cast files
  // are numbered by position in this list, so putting it anywhere earlier
  // renames every install cast after it and orphans the ones already captured.
  //
  // pnpm needs this extra command before its install can succeed, and that is a
  // finding rather than a workaround. pnpm 10+ refuses to run dependency build
  // scripts it has not been told to trust, then exits 1 for having skipped them
  // — so `pnpm install` "fails" on a scaffold that is otherwise fine. One of the
  // skipped scripts is esbuild's, which is how esbuild fetches its platform
  // binary, so this is not cosmetic.
  //
  // `--all` because the interactive form is a checkbox list, and the decision
  // being recorded is "this starter's dependencies may build", not a per-package
  // judgement. Approving writes `pnpm-workspace.yaml` into the app; the manifest
  // is untouched, so the four copies stay comparable.
  //
  // Run order for pnpm:
  //   --install-pnpm   exits 1, having skipped the builds
  //   --approve-pnpm   runs them, records the approval
  //   --install-pnpm   clean
  {
    id: 'approve-pnpm',
    name: 'pnpm — approve dependency build scripts',
    castName: 'Approve-pnpm',
    cwd: `${SCAFFOLD_DIR}/pnpm/${APP_NAME}`,
    command: 'pnpm',
    args: ['approve-builds', '--all'],
    timeoutMs: 5 * 60_000,
    expectFiles: [`${SCAFFOLD_DIR}/pnpm/${APP_NAME}/pnpm-workspace.yaml`],
    render: { maxGapSec: 0.4, speed: 2, title: 'pnpm approve-builds' },
  },

  // ── Intelligence quickstart, step 1 ──────────────────────────────────────
  //
  // Appended rather than grouped with `login` above, and that is load-bearing
  // rather than untidy: casts are numbered by position in this array
  // (`defineCliFlows`), so a flow placed any earlier renames every cast after
  // it and orphans what is already captured — the 12-minute Scaffold run
  // included. New flows go at the end, always.
  //
  // The doc's step 1 is two commands, and they are two flows because a flow is
  // one spawned process. `login` above is the first; this is the second. The
  // video below stitches them back into one clip.
  {
    id: 'project-select',
    name: 'CopilotKit CLI — select the Intelligence project',
    castName: 'Project-Select',
    docPath: 'intelligence/quickstart',

    // Run inside the Next app, not at the repo root.
    //
    // `project select` provisions its key into `<cwd>/.env`, and the process
    // that has to read it is the frontend dev server. `intelligence-runtime.ts`
    // resolves `CPK_INTELLIGENCE_API_KEY` first — the exact name the CLI
    // writes — so landing the file in `frontend/` closes the loop with no copy
    // step. Point this at the repo root instead and the command still reports
    // success while the app goes on using `InMemoryAgentRunner`, which is the
    // failure this whole recording exists to rule out.
    cwd: INTELLIGENCE_APP_DIR,
    command: 'npx',
    args: ['copilotkit@latest', 'project', 'select'],

    // Manual for the same reason as `login`: it needs a CLI session that only
    // exists once a human has finished a browser round trip. Excluded from
    // `capture --all`; addressed by id.
    manual: true,
    timeoutMs: 5 * 60_000,

    // `create` was seen to sit on "Verifying authentication…" until its step
    // timed out, twice, on a network where the API answered instantly — which
    // is why the scaffold flow names the project with `--project` instead of
    // driving this picker. This flow drives it deliberately, because the
    // picker is what the doc's step 1 actually shows. If it hangs here, that
    // is the same defect reproduced against the documented command, and the
    // cast is the evidence.
    abortOn: [/not (?:logged|signed) in/i, /session (?:has )?expired/i],
    steps: [
      {
        label: 'npx package install',
        waitFor: /Ok to proceed/i,
        optional: true,
        timeoutMs: 45_000,
        type: 'y',
        keys: ['Enter'],
      },
      {
        // Rendered as "Select a project (↑/↓ to move, Enter to choose, Esc to
        // cancel):" with `❯ ` on the highlighted row and `- ` on the rest.
        //
        // `markers` is pinned instead of left to DEFAULT_SELECTION_MARKERS
        // because `>` is one of those defaults, and this CLI prints
        // `> paste code and press Enter` as a plain hint line — which would
        // read as a highlighted row and make the walk chase a target that
        // never moves.
        // `exact` because this account has both `myapp` and `myapp1`, and the
        // default substring match would bind whichever the list orders first
        // while reporting success — a wrong-project key, a green run, and
        // nothing on camera to show which backend answered.
        label: 'Pick the Intelligence project',
        waitFor: /Select a project/i,
        timeoutMs: 90_000,
        select: { label: INTELLIGENCE_PROJECT, exact: true, markers: ['❯'] },
        keys: ['Enter'],
        settleMs: 600,
      },
    ],

    // The real assertion. Every step can match and the key can still not have
    // been provisioned — the CLI has a documented partial-success path that
    // records the selection and writes no key. This is what tells the two
    // apart, and it is why there is no `doneWhen`: the success notice is
    // printed only when the key lands OUTSIDE the app directory, so running
    // this correctly means the banner never appears.
    expectFiles: [`${INTELLIGENCE_APP_DIR}/.env`],

    // Same pacing as the scaffold: the pauses are someone reading a prompt
    // before answering it, and cutting them makes the clip unreadable.
    render: { maxGapSec: 1.6, speed: 1.15, title: 'Windows PowerShell' },
  },
]);

/**
 * The deliverable: one CLI clip, then three clips per package manager.
 *
 *   1. `CLI-Create`        the CLI scaffolding the app — once, shared by all
 *                          four, because the CLI ran once and the result was
 *                          copied; four clips of it would be the same footage
 *   2. `<pm>-2-Install`    that manager installing the copy, pass or fail —
 *                          this is the clip that shows whether the install
 *                          command works, so it is always filmed
 *   3. `<pm>-3-Demo`       the app running and answering a prompt, when the
 *                          install succeeded (a page recording, see
 *                          `pages.config.ts`)
 *      `<pm>-3-Finding`    the failure explained, when it did not: the doc
 *                          page, the versions it resolved, the manifest line,
 *                          the command failing, and a note written out
 *
 * Which of the two third clips a manager gets is decided by its install
 * report, not by hand: `npm run cli:videos` reads `casts/*.report.json` and
 * films the finding for a failed install or records the demo for a working
 * one. A failure nobody has analysed yet still gets a clip — the note is
 * generated from the report (command, exit code, last screen) and the
 * hand-written `analysis` below is appended when there is one.
 *
 * `project-context.md`: a broken thing keeps its broken implementation and
 * the recording exists to show the defect; every finding pins installed
 * against declared versions. That is what the finding clip's IDE tabs are.
 */

/**
 * Hand-written analysis for a failure that has been understood. Keyed by
 * package manager; a manager with no entry gets the generated note alone.
 */
const INSTALL_ANALYSIS: Partial<Record<string, string>> = {
  bun: [
    'why: package.json line 13 reads',
    '  "install:agent": "./scripts/setup-agent.sh || scripts\\setup-agent.bat"',
    "bun's shell eats the backslash, so scripts\\setup-agent.bat becomes",
    "scriptssetup-agent.bat - you can see the slash missing in bun's own",
    'error. both scripts are there on disk. npm runs the same line through',
    'cmd.exe where \\ is just a path separator, so npm never hits this.',
    '',
    'so agent/.venv never gets created, the python agent has no deps, and',
    'bun run dev cant start it.',
    '',
    'fix: scripts/setup-agent.bat - forward slash works in both shells.',
  ].join('\n'),
};

/** Narration for a finding that has been recorded, relative to this folder. */
const FINDING_AUDIO: Partial<Record<string, string>> = {
  bun: 'audio/mspy bun  cli.m4a',
};

export const CLI_VIDEOS = defineCliVideos([
  {
    id: 'cli',
    name: 'CopilotKit CLI — creating the app',
    videoName: 'CLI-Create',
    docPath: 'quickstart?agent=bring-your-own',
    flows: ['scaffold'],
  },

  /**
   * Step 1 of the Intelligence quickstart, which is the only step of that page
   * that happens in a terminal.
   *
   * Two flows, one clip: `flows` is an ordered list of segments, so the sign-in
   * and the project pick play back-to-back as two terminal windows. They stay
   * separate casts because they are separate processes, and because separate
   * casts can be paced separately — the sign-in is mostly a human reading a
   * browser tab and compresses hard, while the picker has to run near real time
   * to be readable.
   *
   * `login` has been captured since 2026-09-03 and until now was filmed by
   * nothing: no video referenced it. This is what puts it on camera.
   *
   * Steps 2-5 are not here and cannot be. They are the app itself, and a live
   * browser take and a replayed cast are different recorders — `onSuccess`
   * hands off to the page recording, which lands as its own file.
   */
  {
    id: 'intelligence-cli',
    name: 'Intelligence — connecting a project',
    videoName: 'Intelligence-1-Connect',
    docPath: 'intelligence/quickstart',
    flows: ['login', 'project-select'],

    // Only meaningful once the key is actually provisioned, which is what
    // `project-select`'s `expectFiles` decides. A failed capture skips this
    // and the page recording never runs against a fallback runtime.
    onSuccess: { recordPage: 'intelligence-quickstart' },
  },

  ...PACKAGE_MANAGERS.map(({ id }) => {
    const app = `${SCAFFOLD_DIR}/${id}/${APP_NAME}`;
    return {
      id: `install-video-${id}`,
      name: `${id} · 2 · Installing dependencies`,
      videoName: `${id}-2-Install`,
      docPath: 'quickstart?agent=bring-your-own',
      flows: [`install-${id}`],

      // Video 3 when the install worked: the app, live. `demo-<pm>` in
      // pages.config.ts boots that copy's dev server and drives it.
      onSuccess: { recordPage: `demo-${id}` },

      // Video 3 when it did not: the finding.
      onFailure: {
        id: `finding-${id}`,
        name: `${id} · 3 · Finding — install failed`,
        videoName: `${id}-3-Finding`,
        ideTabs: [
          // Installed, not declared: what this run actually resolved to.
          // Written by the install flow even when it fails partway, as long
          // as something landed in node_modules.
          { filePath: `${app}/VERSIONS.md`, startLine: 1, endLine: 20 },
          // What the starter declares — the CopilotKit packages under test.
          { filePath: `${app}/package.json`, startLine: 1, endLine: 30 },
        ],
        ideDwellMs: 4200,
        analysis: INSTALL_ANALYSIS[id],
        notepadFile: `${id}-install-finding.txt`,
        // Faster than the 62ms default: a finding note is several times
        // longer than a one-line jotting, and at the default it would spend
        // two minutes typing while the viewer has already read it.
        charDelayMs: 22,
        audio: FINDING_AUDIO[id],
      },
    };
  }),
]);
