/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ADAPT THIS DIRECTORY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * What the recorder *does* on each demo page once it is open.
 *
 * The registry lives here rather than in `core/` on purpose: adding or removing
 * a page must never mean editing frozen code. A page with no entry falls back
 * to `runStandardAction` — type the prompt, submit, wait for the reply — which
 * is right for most pages. Write a handler only when a page needs more than
 * that: switching tabs, clicking an approval button, opening a panel.
 *
 * Handlers should build on the helpers in `core/actions.ts`:
 *
 *   sendPrompt(page, prompt, opts)          types and submits, returns the
 *                                           assistant-message count from before
 *                                           submitting
 *   waitForAgentResponseCompletion(...)     waits for the reply to finish, and
 *                                           throws if none ever arrives
 *   promptsFor(config)                      the page's prompts[] , or [prompt]
 *
 * Pass that returned count into waitForAgentResponseCompletion on multi-turn
 * pages, or the previous turn's reply is mistaken for this one's.
 *
 * The fourth argument, `ctx`, is how a handler reports what it saw:
 *
 *   ctx.warn('Language panel still reads "english"')   -> [PASS*] with the note
 *   ctx.fail('Approve button never rendered')           -> [FAIL], clip still saved
 *
 * A `console.log` reaches nobody: the summary and the CI report only see what
 * goes through `ctx`.
 */

import { type ActionContext, type PageActionHandler, type PageRecordConfig } from '../core/types';
import { runStandardAction } from '../core/actions';
import { type Page } from 'playwright';

import { runA2uiAction } from './a2ui.action';
import { runGovernedActionsAction } from './governed-actions.action';
import { runHeadlessUiAction } from './headless-ui.action';
import { runInspectorAction } from './inspector.action';
import { runIntelligenceAction } from './intelligence.action';
import { runPrebuiltAction } from './prebuilt.action';
import { runProgrammaticAction } from './programmatic.action';
import { runRuntimeAction } from './runtime.action';
import { runSharedStateWriteAction } from './shared-state.action';
import { runSlotsAction } from './slots.action';
import {
  runThreadsDrawerAction,
  runThreadsHeadlessAction,
  runThreadsLifecycleAction,
} from './threads.action';

/** Keys are page ids from `config/pages.config.ts`. Doctor flags any orphans. */
/**
 * Pages that need code. Every page not listed here runs `runStandardAction`,
 * driven by its `demo` block in pages.config.ts -- which is where the glide
 * targets and the render checks for display-only, interactive, tool/state
 * rendering, frontend tools, shared-state read, readables, auth and ag-ui now
 * live.
 */
export const ACTION_MAP: Record<string, PageActionHandler> = {
  'prebuilt-components': runPrebuiltAction,
  slots: runSlotsAction,
  'headless-ui': runHeadlessUiAction,
  'programmatic-control': runProgrammaticAction,
  inspector: runInspectorAction,
  'human-in-the-loop-governed-actions': runGovernedActionsAction,
  'in-app-agent-write': runSharedStateWriteAction,
  'threads-drawer': runThreadsDrawerAction,
  'threads-headless': runThreadsHeadlessAction,
  'threads-lifecycle': runThreadsLifecycleAction,
  'intelligence-quickstart': runIntelligenceAction,
  'copilot-runtime': runRuntimeAction,
  'a2ui-fixed-schema': runA2uiAction,
};

export async function executePageAction(
  page: Page,
  config: PageRecordConfig,
  rootPath: string,
  ctx: ActionContext,
): Promise<void> {
  const handler = ACTION_MAP[config.id] ?? runStandardAction;
  await handler(page, config, rootPath, ctx);
}
