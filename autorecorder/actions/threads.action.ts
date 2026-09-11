import { type Page } from 'playwright';
import { beat, humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { promptsFor, sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

/**
 * The three Rich Threads pages.
 *
 * All three share one shape: send a prompt so a thread exists, then show the
 * thing the doc page is actually about — the prebuilt drawer, a hand-rolled
 * `useThreads` sidebar, or the lifecycle readout. The interesting frame is
 * always the *second* one, where an older conversation is re-opened and its
 * history replays, so every handler ends there.
 *
 * Two notes specific to this section:
 *
 * These pages talk to the Intelligence platform, not just the local agent, so a
 * run leaves a real thread behind on project 1476. Harmless, but the list grows
 * one row per recording.
 *
 * The drawer renders inside a shadow root. Playwright pierces open shadow roots
 * with ordinary CSS, so `copilotkit-threads-drawer li[role="option"]` works —
 * but only once the list has rendered, which is why `waitFor` is used rather
 * than an unconditional `count()`.
 */

/** Rows in the prebuilt drawer, inside its shadow root. */
const DRAWER_ROW = 'copilotkit-threads-drawer li[role="option"]';
/** Rows in the hand-rolled sidebar on the headless page. */
const HEADLESS_ROW = '[data-testid="thread-list"] > li';
/** The "open a known conversation" buttons on the lifecycle page. */
const KNOWN_THREAD = '[data-testid="known-threads"] button';

/** Glide to an element's centre and click it, skipping quietly when absent. */
async function glideClick(page: Page, selector: string, label: string): Promise<boolean> {
  const target = page.locator(selector).first();
  const box = await target.boundingBox().catch(() => null);
  if (!box) {
    console.log(`   [Threads] ${label} not present — skipping.`);
    return false;
  }
  await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 20);
  await humanClick(page);
  return true;
}

/** Rest the cursor over a list so the viewer's eye lands on it. */
async function dwellOn(page: Page, selector: string, ms = 1800): Promise<void> {
  const box = await page.locator(selector).first().boundingBox().catch(() => null);
  if (box) await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 22);
  await sleep(ms);
}

export const runThreadsDrawerAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
) => {
  // 1/4: create a conversation so the drawer has something to list.
  console.log(`   [ThreadsDrawer] 1/4: Sending a prompt on the zero-props tab...`);
  const msgCount = await sendPrompt(page, promptsFor(config)[0], { timeoutMs: 12000 });
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount);

  // 2/4: the row the run just produced, auto-named by the platform.
  console.log(`   [ThreadsDrawer] 2/4: Showing the thread list...`);
  await page.locator(DRAWER_ROW).first().waitFor({ timeout: 20000 }).catch(() => {
    console.log(`   [ThreadsDrawer] No rows rendered — drawer is probably unlicensed.`);
  });
  await dwellOn(page, DRAWER_ROW, 2000);

  // 3/4: re-open an older conversation. This is the claim under test: no
  // active-thread state of ours, yet the chat swaps and replays.
  console.log(`   [ThreadsDrawer] 3/4: Re-opening an earlier conversation...`);
  const rows = page.locator(DRAWER_ROW);
  const index = (await rows.count()) > 1 ? 1 : 0;
  const box = await rows.nth(index).boundingBox().catch(() => null);
  if (box) {
    await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 22);
    await humanClick(page);
    await beat(3500);
  }

  // 4/4: the customized drawer — renderRow, limit, and the label overrides.
  console.log(`   [ThreadsDrawer] 4/4: Switching to the customized drawer...`);
  await glideClick(page, 'button:has-text("Customized")', 'Customized tab');
  await beat(2500);
  await dwellOn(page, DRAWER_ROW, 2500);
};

export const runThreadsHeadlessAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
) => {
  // 1/4: let the sidebar finish loading BEFORE typing. `useThreads` starts in
  // isLoading, and this page renders a narrower placeholder until it resolves;
  // typing during that window measures the composer at coordinates it is about
  // to move away from, and the click lands beside the textarea.
  console.log(`   [ThreadsHeadless] 1/4: Waiting for the thread list to settle...`);
  await page.locator(HEADLESS_ROW).first().waitFor({ timeout: 25000 }).catch(() => {
    console.log(`   [ThreadsHeadless] No rows rendered — check the runtime is Intelligence-backed.`);
  });
  await dwellOn(page, HEADLESS_ROW, 1800);

  // 2/4: a conversation of our own, on top of whatever was already there.
  console.log(`   [ThreadsHeadless] 2/4: Sending a prompt...`);
  const msgCount = await sendPrompt(page, promptsFor(config)[0], { timeoutMs: 12000 });
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount);
  await dwellOn(page, HEADLESS_ROW, 1500);

  // 3/4: archived threads are hidden until asked for. Ticked and unticked
  // rather than archiving anything, so a recording never mutates the list.
  console.log(`   [ThreadsHeadless] 3/4: Toggling the archived filter...`);
  if (await glideClick(page, 'input[type="checkbox"]', 'Archived toggle')) {
    await beat(2200);
    await glideClick(page, 'input[type="checkbox"]', 'Archived toggle');
    await beat(1200);
  }

  // 4/4: switching threads — here it is our own useState driving `threadId`.
  console.log(`   [ThreadsHeadless] 4/4: Switching to an earlier conversation...`);
  const rows = page.locator(HEADLESS_ROW);
  const index = (await rows.count()) > 1 ? 1 : 0;
  const box = await rows.nth(index).locator('button').first().boundingBox().catch(() => null);
  if (box) {
    await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 22);
    await humanClick(page);
    await beat(4000);
  }
};

export const runThreadsLifecycleAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
) => {
  // 1/4: run on the freshly minted thread. hasExplicitThreadId is false here.
  // Wait for the panel's thread list first, for the reason in the headless
  // handler above — measure the composer only once the layout has settled.
  console.log(`   [ThreadsLifecycle] 1/4: Running on a freshly minted thread...`);
  await page.locator(KNOWN_THREAD).first().waitFor({ timeout: 25000 }).catch(() => {
    console.log(`   [ThreadsLifecycle] No known conversations listed yet.`);
  });
  const msgCount = await sendPrompt(page, promptsFor(config)[0], { timeoutMs: 12000 });
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount);

  // 2/4: the readout — the id, the explicit flag, and agent.messages.
  console.log(`   [ThreadsLifecycle] 2/4: Reading the lifecycle panel...`);
  await dwellOn(page, 'p.font-mono', 2500);

  // 3/4: New chat mints a fresh non-explicit id and clears the view.
  console.log(`   [ThreadsLifecycle] 3/4: Starting a new chat...`);
  await glideClick(page, 'button:has-text("New chat")', 'New chat button');
  await beat(3000);

  // 4/4: re-opening sets it explicitly, which is what triggers replay.
  console.log(`   [ThreadsLifecycle] 4/4: Re-opening a known conversation...`);
  await page.locator(KNOWN_THREAD).first().waitFor({ timeout: 20000 }).catch(() => {
    console.log(`   [ThreadsLifecycle] No known conversations listed.`);
  });
  await glideClick(page, KNOWN_THREAD, 'known conversation');
  await beat(4500);
};
