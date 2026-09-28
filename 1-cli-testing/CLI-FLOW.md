# `npx copilotkit@latest create` — interactive flow spec

Working map of every prompt the CLI shows, in order, with the exact keystroke that
answers it. This is the input contract for automating the CLI run (see
[Automation notes](#automation-notes)); it is not a doc summary.

The CLI is entirely keyboard-driven — no mouse anywhere in the flow.

**Status:** steps marked 🟢 are read off the recording frame-by-frame, confirmed by
the operator who ran it, or checked against the CLI's own help output; 🟡 are known
to exist but their screen text was never captured. See
[Open questions](#open-questions).

**Evidence:**
- `Screen Recording 2026-09-01 231321` (~2:45), frames at 0:06, 0:11, 0:20, 2:21, 2:33, 2:36
- Five frames of the framework picker mid-scroll
- Operator walkthrough of the full keystroke sequence
- `copilotkit create --help` and `copilotkit framework list`, run 2026-09-01

CLI version observed: **copilotkit@4.9.24**. Shell: PowerShell on Windows 11.

---

## The keystroke script

The whole run, in order. Details and screen text per step below.

| # | Prompt | Keys |
|---|---|---|
| 1 | *(shell)* | `npx copilotkit@latest create` `Enter` |
| 2 | `Ok to proceed? (y)` | `y` `Enter` — only if not npx-cached |
| 3 | banner | — |
| 4 | `App name` | `app` `Enter` |
| 5 | `Select agent framework` | `Down` × 12 `Enter` → Microsoft Agent Framework (Python) |
| 6 | sign-in | wait for auth to finish |
| 7 | `Select a project` | `Enter` — already on `myapp` |
| 8 | `Connect this project to a chat platform?` | `Down` × 2 `Enter` → Not now |
| 9 | `Want me to install the dependencies…? [Y/n]` | `n` — **no Enter** |
| 10 | OpenAI API key | `Enter` — leave empty, CLI exits |

The model key is **not** supplied through the CLI. It is placed into the generated
project by hand afterwards; the automation's job ends when the CLI exits.

---

## Preconditions

| Thing | Why it matters |
|---|---|
| Node + npx on PATH | The whole flow is `npx`-driven |
| Network | Downloads the `copilotkit` package and talks to Intelligence |
| A signed-in CopilotKit CLI session | `init` reuses an existing session and only opens browser sign-in when there is none — and **refuses outright in a shell with no terminal** rather than opening a browser it cannot finish with. This is why the flow needs a person at a real terminal |
| Working directory | The app folder is created *under the cwd*, named at step 4 |

---

## The flow

### 1 · Launch 🟢

```
PS C:\Users\QS\Desktop\Fiqros\MsPy-react> npx copilotkit@latest create
```

**Input:** the command, then `Enter`.
**Observed at:** 0:06. The terminal's shell indicator flips from `powershell` to
`node` once npx takes over — a usable signal that the process is live.

`create` is an alias of `init`; both are documented and behave identically.

---

### 2 · npx package-install confirmation 🟢 *(conditional)*

```
Need to install the following packages:
copilotkit@4.9.24
Ok to proceed? (y)
```

**Input:** `y`, then `Enter`.
**Observed at:** 0:11.
**Conditional:** this is npx's own prompt, not CopilotKit's. It only appears when
`copilotkit@latest` is not already in the npx cache. An automated driver must
treat it as optional — wait for *either* this prompt or the banner in step 3, never
send `y` unconditionally.

---

### 3 · Banner 🟢 *(no input)*

```
~ Welcome to CopilotKit! ~

Every app includes CopilotKit Intelligence:
 • Durable threads & session persistence
 • Interaction & event logging
 • Insights from real usage
```

ASCII logo above it. This block stays pinned at the top of the screen for the rest
of the run, so it is a poor anchor for "which step am I on" — always match on the
question text instead. A rotating `Tip:` line sits at the bottom of the screen, so
"the buffer stopped changing" is **not** a valid ready-signal either.

---

### 4 · App name 🟢

```
App name
Names your new app and its folder — lowercase, numbers, hyphens, max 30
> app
```

**Input:** type the name, then `Enter`. The field starts **empty** — `app` in the
recording was typed, not a prefilled default, so a driver types it directly with
no clearing step.
**Constraints:** lowercase letters, digits, hyphens; max 30 chars.
**Observed at:** 0:20. `app` is the name used throughout this repo, hence `<pm>/app`.

---

### 5 · Agent framework picker 🟢

Opens with the highlight already on **#1 LangGraph (Python)** — no repositioning
needed before counting down.

```
Select agent framework
❯ LangGraph (Python)
  LangGraph (JavaScript)
  LangGraph (Python, FastAPI)
  Claude Agent SDK (TypeScript)
  Claude Agent SDK (Python)
  Mastra
↑↓ to browse all 23 · ↵ select
```

**Input for this repo: `ArrowDown` × 12, then `Enter`** → #13, *Microsoft Agent
Framework (Python)*, CLI id `microsoft-agent-framework-py`. The framework must
match the repo — this is the MsPy-react harness, so any other selection scaffolds
the wrong backend.

**Full list — 23 entries, in picker order:**

| # | Entry | | # | Entry |
|---|---|---|---|---|
| 1 | LangGraph (Python) | | 13 | **Microsoft Agent Framework (Python)** ← this repo |
| 2 | LangGraph (JavaScript) | | 14 | MCP Apps |
| 3 | LangGraph (Python, FastAPI) | | 15 | CrewAI Flows |
| 4 | Claude Agent SDK (TypeScript) | | 16 | LlamaIndex |
| 5 | Claude Agent SDK (Python) | | 17 | Agno |
| 6 | Mastra | | 18 | AG2 |
| 7 | Pydantic AI | | 19 | A2A |
| 8 | AWS Strands (Python) | | 20 | AgentCore + LangGraph |
| 9 | AWS Strands (TypeScript) | | 21 | AgentCore + Strands |
| 10 | ADK | | 22 | A2UI |
| 11 | Angular + ADK | | 23 | Open Generative UI |
| 12 | Microsoft Agent Framework (.NET) | | | |

The count matches `copilotkit framework list`, which also prints each framework's
id and which flags it accepts.

Behaviour observed while scrolling:

- **Viewport is 6 rows.** The highlight walks to the bottom row, then the list
  scrolls under it — the selected entry is not at a fixed screen position.
- **The list wraps.** `ArrowDown` on #23 (*Open Generative UI*) returns to #1,
  confirmed by the last frame. A driver counting downs with no stop condition
  loops forever without ever erroring.
- **Highlight glyph is `❯`**; only the selected row is colored. Unselected rows
  carry a per-framework emoji that is not stable text to match on.
- Footer stays `↑↓ to browse all 23 · ↵ select` — useless as a position anchor,
  good as an "am I on this step" anchor.

Verify the highlighted label before pressing `Enter` rather than trusting the count
of 12 — the list grows as CopilotKit adds integrations, and one new entry above
#13 would silently scaffold a different framework.

---

### 6 · CopilotKit Intelligence sign-in 🟡

Fires **after** the framework is chosen and before the project picker. No input —
the operator waits for auth to complete. Screen text not captured; it falls in the
unrecorded 0:20 → 2:21 window and accounts for most of that ~2 minutes.

Per `--help`, `init` "reuses an existing CLI session or opens browser sign-in when
needed", so the wait is **conditional on cached credentials** and is what makes the
flow need a person at the keyboard.

There is **no** Intelligence yes/no question: `-i, --intelligence` is documented as
a *deprecated no-op* because Intelligence now ships with every supported framework.
The quickstart doc still presents it as a choice — see
[doc drift](#doc-vs-cli-drift).

**This is the step that decides whether the run can be unattended.** Everything
before and after it is deterministic keystrokes; this one may hand off to a
browser.

---

### 7 · Intelligence project picker 🟢

```
Connect this app to one of your existing projects, or create a new one.
An Intelligence project is where this app's threads, messages, and analytics are stored.

Select a project (↑/↓ to move, Enter to choose, Esc to cancel):
> myapp
- myapp1
- 2
- newproj
- Create a new project
```

**Input: `Enter` alone** — the highlight already sits on `myapp`, which is the
target. `>` marks the highlight, `-` the rest.
**Observed at:** 2:21.
**Account-specific:** those names are this account's, not fixtures, and `myapp` is
also the `projectSlug` in [.copilotkit/project.json](../.copilotkit/project.json).
A driver must confirm the highlighted row reads `myapp` before pressing `Enter`
rather than assuming — if the account's project list changes, a bare `Enter` binds
the app to whatever else is sitting at the top.
**Side effect:** the `app/` folder is already in the Explorer tree by this frame —
scaffolding starts before this answer, not after.
**Esc:** appears to do nothing in practice; not relied on.

---

### 8 · Chat platform 🟢

```
Connect this project to a chat platform?

> 1. Slack
  2. Microsoft Teams
  3. Not now

You can add one later with `copilotkit channels add`
```

**Input:** `ArrowDown` × 2, then `Enter` → **3. Not now**.
**Observed at:** 2:33.
Entries are numbered, so a digit keypress may select directly; unconfirmed, and
arrow-navigation is the safe path either way.

**Portability note:** this prompt only appears for frameworks whose starter ships a
managed Channel host (`framework list` marks them `--channel`) — 18 of 23.
Microsoft Agent Framework (Python) is one, so it always appears here; but `ag2`,
`adk-angular`, `agentcore-langgraph`, `agentcore-strands` and `langgraph-fastapi`
skip it. Matters when this spec is copied into another framework's repo, where a
fixed keystroke script would land these two arrows in step 9's prompt.

---

### 9 · Install dependencies 🟢

```
Want me to install the dependencies for you now? (npm install) [Y/n]
```

**Input: `n` — a single keypress, no `Enter`.** This prompt acts on the keystroke
immediately, unlike the text fields at steps 4 and 10. A driver that sends `n\r`
here leaks a stray `Enter` into step 10 and skips the key prompt before it renders.

`Y` is the default, so a bare `Enter` would install. Dependencies are installed
separately afterwards, per package manager — that is the point of this folder, and
letting the CLI run `npm install` here defeats it.

**Observed at:** 2:36.

---

### 10 · OpenAI API key 🟢 *(text uncaptured)*

The CLI asks for a model API key as its last question.

**Input: `Enter` on an empty field.** The CLI then exits. The key is extracted and
placed into the generated project **by hand afterwards** — the automation supplies
nothing here and does not touch the key.

Exact prompt wording not captured; needed as the driver's final anchor.

---

## Non-interactive flag surface

Every prompt above has a flag, so the same scaffold can be produced with no TUI at
all:

```bash
copilotkit create -n app -f microsoft-agent-framework-py \
  --project <slug> --channel none --no-install
```

| Flag | Answers |
|---|---|
| `-n, --name <name>` | Step 4 |
| `-f, --framework <id>` | Step 5 (`microsoft-agent-framework-py`) |
| `--project <slug\|id>` / `--create <name>` | Step 7 — pass one, never both |
| `--channel slack\|teams\|none` | Step 8; with the flag the offer is never shown |
| `-y` / `--install` / `--no-install` | Step 9 |
| `--no-banner` | Step 3 |

Sign-in (step 6) is the one answer no flag supplies.

These are **not** a replacement for the interactive run — typing through the menus
is the thing being QA'd. They are useful as a control: if the flag run scaffolds
cleanly and the TUI run does not, the bug is in the prompts, not the templates.
The `--channel` help says as much outright — with the flag, "a scripted run cannot
land on a provider by mistiming a keystroke."

---

## Automation notes

**This flow is implemented.** The steps above are encoded in
[cli.config.ts](../autorecorder/config/cli.config.ts) and driven by
[core/cli/](../autorecorder/core/cli/):

```bash
cd autorecorder
npm run selftest                  # prove the driver works on this machine
npm run selftest:demo             # prove the whole demo path works

npm run capture -- --login        # once; sign-in opens a browser
npm run capture -- --scaffold     # run the CLI, once
npm run capture -- --distribute   # copy it ×4, seed the model key
npm run capture -- --install-npm  # install per manager (…pnpm, yarn, bun)

npm run render -- --all           # videos 1 and 2 of all four sets
npm run record -- --demo-npm      # video 3, per manager
```

That produces twelve videos — three per package manager: the CLI creating the
app, that manager installing it, and its copy running and answering.

Video 3 films the real thing: `<pm> run dev` booting in a terminal, then the
browser opening that server and getting a live answer out of the agent. As of
the 2026-09-03 run only npm gets one — yarn's cold turbopack compile overruns
the recorder's demo navigation budget, and pnpm and bun never finish installing.
The reasons are in
[autorecorder/README.md](../autorecorder/README.md#video-3-what-only-npm-survives).

The notes below are why it is built the way it is — keep them in mind when
editing the config.

- **Playwright cannot drive a terminal directly.** The CLI runs under a PTY
  (`node-pty`, native ConPTY on Windows) and the captured session is replayed in
  an `xterm.js` window for the camera. Capture and render are separate commands
  so a re-shoot never re-runs the CLI.
- **Gate every keystroke on its prompt text**, never on a timer. Steps 2 and 6 vary
  in duration by minutes (cache state, sign-in).
- **Know which prompts consume `Enter` and which don't.** Steps 4 and 10 are text
  fields that need it; step 9 is a single-keypress y/n that does not. Getting this
  wrong shifts every later keystroke by one.
- **Match labels, not counts or positions.** Applies to steps 5, 7 and 8.
- **Poll the rendered buffer, not the DOM**, if driving through xterm.js — it
  virtualizes rows, so off-screen text is not in the DOM.
- **Strip ANSI** before matching. Prompts are colored and lists redraw in place on
  every arrow key.
- **Arrow keys must reach the PTY as escape sequences** (`\x1b[B` for down). A
  literal string write will not move the highlight.
- **`@latest` moves under you.** Each run may fetch a newer CLI than the 4.9.24
  recorded here, changing the framework list and prompt wording without warning.
  Log the resolved version with every run so a failure can be attributed to a CLI
  change rather than to the driver; pin an exact version when a run must be
  reproducible.
- **Needs a person at the keyboard.** Step 6 needs interactive browser sign-in, and
  the CLI refuses to run in a shell with no terminal.
- **Post-conditions to assert:** `app/` exists, contains `package.json` + `agent/`,
  and no dependencies are installed. The project ships **without** a model key —
  that is expected, not a failure.

---

## Doc vs CLI drift

The [MS Agent Framework quickstart](https://docs.copilotkit.ai/ms-agent-python/quickstart)
describes the CLI as asking **Project name → CopilotKit Intelligence (Yes/No) →
Framework**. As of copilotkit@4.9.24 there is no Intelligence yes/no —
`--intelligence` is a deprecated no-op and Intelligence ships with every framework.
The actual order is name → framework → sign-in → project → channel → install → key.
Worth carrying into the README's known-issues section.

---

## Open questions

1. What does step 6 actually print, and does it still appear when a CLI session is
   already cached?
2. What is the exact wording of the key prompt at step 10, and does it appear at all
   when install is accepted with `Y` instead of declined?
3. Do digit keys select directly in the numbered menu at step 8?
4. What happens when the target folder already exists — overwrite, error, or
   re-prompt?
