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
  _rootPath,
  ctx,
) => {
  // 1/4: let the sidebar finish loading BEFORE typing. `useThreads` starts in
  // isLoading, and this page renders a narrower placeholder until it resolves;
  // typing during that window measures the composer at coordinates it is about
  // to move away from, and the click lands beside the textarea.
  console.log(`   [ThreadsHeadless] 1/5: Waiting for the thread list to settle...`);
  await page.locator(HEADLESS_ROW).first().waitFor({ timeout: 25000 }).catch(() => {
    console.log(`   [ThreadsHeadless] No rows rendered — check the runtime is Intelligence-backed.`);
  });
  await dwellOn(page, HEADLESS_ROW, 1800);

  // 2/4: a conversation of our own, on top of whatever was already there.
  console.log(`   [ThreadsHeadless] 2/5: Sending a prompt...`);
  const msgCount = await sendPrompt(page, promptsFor(config)[0], { timeoutMs: 12000 });
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount);
  await dwellOn(page, HEADLESS_ROW, 1500);

  // 3/4: archived threads are hidden until asked for. Ticked and unticked
  // rather than archiving anything, so a recording never mutates the list.
  console.log(`   [ThreadsHeadless] 3/5: Toggling the archived filter...`);
  if (await glideClick(page, 'input[type="checkbox"]', 'Archived toggle')) {
    await beat(2200);
    await glideClick(page, 'input[type="checkbox"]', 'Archived toggle');
    await beat(1200);
  }

  // 4/4: switching threads — here it is our own useState driving `threadId`.
  console.log(`   [ThreadsHeadless] 4/5: Switching to an earlier conversation...`);
  const rows = page.locator(HEADLESS_ROW);
  const index = (await rows.count()) > 1 ? 1 : 0;
  const box = await rows.nth(index).locator('button').first().boundingBox().catch(() => null);
  if (box) {
    await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 22);
    await humanClick(page);
    await beat(4000);
  }
  // The section the page added under the four steps -- one agent per thread.
  // Two `useAgent({ agentId, runtimeAgentId, threadId })` hooks mount here,
  // each pinned to its own thread; a panel that never paints means the private
  // proxied agent did not register, which is the claim being tested.
  console.log(`   [ThreadsHeadless] Resting on the per-thread agents...`);
  const perThread = page.locator('[data-testid="per-thread-agents"]');
  if (await perThread.first().isVisible({ timeout: 8000 }).catch(() => false)) {
    await dwellOn(page, '[data-testid="per-thread-agents"]', 2500);
    const ready = await page
      .locator('[data-testid="thread-agent-run"]')
      .first()
      .isEnabled({ timeout: 4000 })
      .catch(() => false);
    if (ready) console.log(`   ✅ Thread-scoped agent is ready; runAgent() addresses its own thread.`);
    else ctx.warn('The thread-scoped agent never became ready (isReady stayed false), so runAgent() could not address its thread.');
  } else {
    ctx.fail('The per-thread agent panel never rendered -- useAgent({ agentId, runtimeAgentId, threadId }) did not mount.');
  }
};

/** The lifecycle readouts, by their data-testid on the demo page. */
const LIFECYCLE = {
  id: '[data-testid="active-thread-id"]',
  explicit: '[data-testid="thread-explicit"]',
  messages: '[data-testid="message-count"]',
  warning: '[data-testid="setter-warning"]',
  parent: '[data-testid="parent-thread-id"]',
} as const;

async function readText(page: Page, selector: string): Promise<string> {
  const text = await page
    .locator(selector)
    .first()
    .textContent({ timeout: 4000 })
    .catch(() => null);
  return (text ?? '').trim();
}

/** Polls a readout until it satisfies `ok`, then returns what it last said. */
async function waitForReadout(
  page: Page,
  selector: string,
  ok: (text: string) => boolean,
  timeoutMs = 10000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let text = await readText(page, selector);
  while (!ok(text) && Date.now() < deadline) {
    await sleep(250);
    text = await readText(page, selector);
  }
  return text;
}

const short = (id: string): string => (id ? id.slice(0, 8) : '(none)');
const isUuid = (s: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s);

/**
 * Thread & History Lifecycle, claim by claim.
 *
 * The earlier take asked the model to "remember the number 42" across a new
 * thread and filmed its opinion about memory. Nothing on the doc page is about
 * the model, so that clip showed nothing the page says. This one drives the
 * page's own API through the demo's buttons and reads the chat's resolved
 * state back after every step, so each claim is either observed or reported:
 *
 *   1 mint       no threadId given: an auto UUID, hasExplicitThreadId false
 *   2 run        a turn streams under that same id
 *   3 remount    a new React key re-mints the auto id and clears the chat
 *   4 hydrate    setActiveThreadId(id, { explicit: true }) replays its history
 *   5 new        startNewThread() mints a fresh, non-explicit id
 *   6 pin        a threadId prop is authoritative
 *   7 no-op      startNewThread() then logs a warning and changes nothing
 *   8 survive    the pinned id outlives a remount
 *
 * `warn` marks a doc claim that did not hold (that is a finding, and the clip
 * shows it); `fail` marks a step the harness could not perform at all.
 */
export const runThreadsLifecycleAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath,
  ctx,
) => {
  const step = (n: number, text: string): void =>
    console.log(`   [Threads Lifecycle] ${n}/8: ${text}`);

  // 1: mint
  step(1, 'Reading the auto-minted threadId...');
  const minted = await waitForReadout(page, LIFECYCLE.id, isUuid, 15000);
  if (!isUuid(minted)) {
    ctx.fail('The demo never showed an active threadId, so no step below can be judged.');
    return;
  }
  const mintedExplicit = await readText(page, LIFECYCLE.explicit);
  if (mintedExplicit !== 'false') {
    ctx.warn(`A chat mounted with no threadId reported hasExplicitThreadId=${mintedExplicit}, not false.`);
  }
  await dwellOn(page, LIFECYCLE.id, 2200);

  // 2: run
  step(2, `Running a turn on ${short(minted)}...`);
  const msgCount = await sendPrompt(page, promptsFor(config)[0], { timeoutMs: 12000 });
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 3000, msgCount);
  const afterRun = await readText(page, LIFECYCLE.id);
  const ranMessages = Number(
    await waitForReadout(page, LIFECYCLE.messages, (t) => Number(t) >= 2, 8000),
  );
  if (afterRun !== minted) {
    ctx.warn(`The threadId changed during a turn: ${short(minted)} became ${short(afterRun)}.`);
  }
  if (ranMessages < 2) ctx.fail('The turn left fewer than two messages on the thread.');
  await dwellOn(page, LIFECYCLE.id, 1800);

  // 3: a remount re-mints, unless the id is inherited from a parent provider
  const parentId = await readText(page, LIFECYCLE.parent);
  const inherited = isUuid(parentId) && parentId === minted;
  step(
    3,
    inherited
      ? 'Remounting; the id is inherited from a parent provider, so it should be kept...'
      : 'Remounting with no pinned id, which the page says re-mints...',
  );
  if (!(await glideClick(page, '[data-testid="remount"]', 'clicked "Remount chat"'))) {
    ctx.fail('The Remount control was not on screen.');
    return;
  }
  let remounted: string;
  if (inherited) {
    await beat(2500);
    remounted = await readText(page, LIFECYCLE.id);
  } else {
    remounted = await waitForReadout(
      page,
      LIFECYCLE.id,
      (t) => isUuid(t) && t !== minted,
      8000,
    );
  }
  await beat(1500);
  const remountedMessages = Number(await readText(page, LIFECYCLE.messages));
  if (inherited) {
    // Precedence rule 3 in action. The page lists the rule, but its remount
    // warning is stated unconditionally, and the v2 <CopilotKit> wrapper always
    // supplies a parent id, so under it the warning describes something that
    // does not happen.
    if (remounted === minted) {
      console.log(`   ✅ Kept ${short(minted)}: inherited from the parent provider (precedence 3).`);
      ctx.warn(
        `The chat's threadId ${short(minted)} is inherited from the root <CopilotKit> provider, so a remount keeps it ` +
          `rather than re-minting as the page's remount warning says. The conversation still left the screen ` +
          `(${remountedMessages} messages after the remount), because an inherited id is not explicit and nothing replays it.`,
      );
    } else {
      ctx.warn(`An inherited threadId changed on remount: ${short(minted)} became ${short(remounted)}.`);
    }
  } else {
    if (remounted === minted) {
      ctx.warn(`Remounting kept ${short(minted)}; the page says an auto-minted id re-mints on remount.`);
    } else {
      console.log(`   ✅ Re-minted: ${short(minted)} -> ${short(remounted)}`);
    }
    if (remountedMessages > 0) {
      ctx.warn(
        `After the remount the new thread still showed ${remountedMessages} message(s); the page says a new id starts a new conversation.`,
      );
    }
  }
  await dwellOn(page, LIFECYCLE.id, 2200);

  // 4: hydrate the first thread
  step(4, `Re-opening ${short(minted)} explicitly, so its history should replay...`);
  if (
    !(await glideClick(
      page,
      '[data-testid="open-conversation"]',
      'clicked "Open conversation"',
    ))
  ) {
    ctx.fail('"Open conversation" was not clickable, so hydration could not be tried.');
    return;
  }
  const reopened = await waitForReadout(page, LIFECYCLE.id, (t) => t === minted, 8000);
  const reopenedExplicit = await waitForReadout(
    page,
    LIFECYCLE.explicit,
    (t) => t === 'true',
    5000,
  );
  const replayed = Number(
    await waitForReadout(page, LIFECYCLE.messages, (t) => Number(t) >= ranMessages, 12000),
  );
  if (reopened !== minted) {
    ctx.warn(`setActiveThreadId(${short(minted)}) left the chat on ${short(reopened)}.`);
  }
  if (reopenedExplicit !== 'true') {
    ctx.warn('setActiveThreadId(id, { explicit: true }) did not mark the thread explicit.');
  }
  if (replayed < ranMessages) {
    ctx.warn(
      `History did not replay: the re-opened thread showed ${replayed} of its ${ranMessages} messages.`,
    );
  } else {
    console.log(`   ✅ Replayed ${replayed} message(s) from the runtime's store.`);
  }
  await dwellOn(page, LIFECYCLE.messages, 2800);

  // 5: start new
  step(5, 'startNewThread(), for a fresh non-explicit id...');
  await glideClick(page, '[data-testid="new-chat"]', 'clicked "New chat"');
  const fresh = await waitForReadout(
    page,
    LIFECYCLE.id,
    (t) => isUuid(t) && t !== minted && t !== remounted,
    8000,
  );
  const freshExplicit = await readText(page, LIFECYCLE.explicit);
  if (fresh === minted || fresh === remounted) {
    ctx.warn('startNewThread() did not mint a new threadId.');
  }
  if (freshExplicit !== 'false') {
    ctx.warn(
      `startNewThread() left hasExplicitThreadId=${freshExplicit}; the page says the new id is non-explicit.`,
    );
  }
  await dwellOn(page, LIFECYCLE.id, 2000);

  // 6: pin
  step(6, 'Pinning a threadId prop...');
  await glideClick(page, '[data-testid="pin"]', 'clicked "Pin a threadId prop"');
  const pinned = await waitForReadout(page, LIFECYCLE.id, (t) => isUuid(t) && t !== fresh, 8000);
  if (pinned === fresh) {
    ctx.fail('Pinning a threadId prop did not change the active thread.');
    return;
  }
  await dwellOn(page, LIFECYCLE.id, 1800);

  // 7: the setters no-op while the prop is authoritative
  step(7, 'Pressing "New chat" while the id is prop-controlled...');
  await glideClick(page, '[data-testid="new-chat"]', 'clicked "New chat" (pinned)');
  await beat(1500);
  const stillPinned = await readText(page, LIFECYCLE.id);
  const warning = await waitForReadout(page, LIFECYCLE.warning, (t) => t.length > 0, 4000);
  if (stillPinned !== pinned) {
    ctx.warn(
      `startNewThread() moved a prop-controlled chat from ${short(pinned)} to ${short(stillPinned)}; the page says it no-ops.`,
    );
  }
  if (!/Ignoring startNewThread/.test(warning)) {
    ctx.warn(
      'startNewThread() on a prop-controlled chat logged no "Ignoring" warning; the page says it warns.',
    );
  } else {
    console.log('   ✅ No-op, with the documented warning.');
  }
  await dwellOn(page, LIFECYCLE.warning, 2800);

  // 8: the pinned id survives a remount
  step(8, 'Remounting again, so the pinned id should survive...');
  await glideClick(page, '[data-testid="remount"]', 'clicked "Remount chat" (pinned)');
  await beat(2000);
  const survived = await readText(page, LIFECYCLE.id);
  if (survived !== pinned) {
    ctx.warn(`A remount replaced the pinned id ${short(pinned)} with ${short(survived)}.`);
  } else {
    console.log(`   ✅ ${short(pinned)} survived the remount.`);
  }
  await dwellOn(page, LIFECYCLE.warning, 3000);
};
