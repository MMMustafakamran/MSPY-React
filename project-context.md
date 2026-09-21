# Project Goal

QA on the CopilotKit React Microsoft Agent Framework (Python) docs
(<https://docs.copilotkit.ai/ms-agent-python>). The job is **finding bugs and
ambiguity in those doc pages**. The deliverable is a written QA report of the findings plus one
recording per page. Everything here is tooling for that; a clean run that finds
nothing when the docs are broken is a failed run, not a passing one.

## Layout

| Path | What it is |
|---|---|
| `doc-snapshot/` | Version-controlled copy of the upstream doc pages, plus `CHANGELOG.md` of drift |
| `frontend/`, `backend/` | The harness — each doc page is a live route running what that page teaches |
| `autorecorder/` | Per-page demo capture (doc → code → live feature), paced to look human |
| `ci/` | `automate.mjs`: drift → preflight → deps → servers → record → report |

## Cycle

```
drift check → implement changed pages into the harness → record → report
```

## Rules

1. Snippets go in **verbatim**, highlighted ones especially. A snippet that fails
   as published is the finding — do not fix it.
2. Broken pages keep their broken implementation; the clip exists to show the
   defect.
3. Ambiguity is a defect: missing steps, undefined identifiers, unstated
   prerequisites. Report it even if inference makes the page work.
4. Every finding pins installed vs declared versions.

## Pages excluded from recording

Standing instruction from the project owner. These stay **fully tracked**
(snapshot, drift, manifest, route, findings) and are **never filmed**:

| Page id | Why |
|---|---|
| `intelligence-learned-skills` | Owner instruction: not recorded. |
| `markdown` | No path to it from the docs sidebar, so not under test yet. |
| `jev-generative-ui` | Same, and its decision layer needs a third-party vendor key. |

The mechanism is `SKIP_RECORDING` in `autorecorder/config/pages.config.ts`,
which `cli.ts` subtracts before any selection or sharding, locally and in CI.
A listed page still answers `npm run ci:pages` and still counts for drift and
coverage. Only the camera is off.

**Do not re-enable one without asking.** Deleting an entry here is how a page
silently starts recording again with nobody having chosen that.

## Gaps the pipeline misses — check by hand

- **New pages** — no route, no recorder entry, no diff; snapshotted but untested.
- **Removed/renamed pages** — leave a live route and a passing recording behind.
- **Legacy code** — the old implementation surviving beside the new one and
  keeping a page falsely green.
- **Pages with no `/demo` route** — unregistered in the recorder, never recorded.
- **Silent failures** — clean console, no error; drift and recording both pass.
- **Divergence from the Angular build** of the same guide; nothing compares them.

## Done

Drift implemented · §gaps reconciled · superseded code deleted · all routes
recorded · report rebuilt · **clips actually watched**.
