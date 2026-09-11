import { type Page } from 'playwright';
import { beat, humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { type ActionContext, type PageActionHandler, type PageRecordConfig } from '../core/types';
import {
  DEFAULT_ASSISTANT_MESSAGE_SELECTOR,
  promptsFor,
  sendPrompt,
  waitForAgentResponseCompletion,
} from '../core/actions';

/**
 * The Intelligence Quickstart, recorded against the doc's own acceptance test.
 *
 * The page used to fall through to `runStandardAction`: type a prompt, wait for
 * a reply, stop. That verdict is wrong for this page. A streamed reply proves
 * the agent runs — it proves nothing about whether `npx copilotkit login` and
 * `project select` produced a working key, whether the runtime reached the
 * hosted project, or whether one word of the conversation was persisted. The
 * doc's step 5 is explicit about what does prove it:
 *
 *   > Send one message to create a thread. Open Threads in Inspector. Your new
 *   > thread must appear in the list.
 *
 * So the assertion here is the thread count, read off the status strip before
 * and after the message. Grew by one: the key is real and the store took the
 * write. Did not: the reply was local and nothing reached Intelligence, which
 * is a FAIL no matter how good the answer was.
 *
 * ── Why not drive Inspector, as the doc says ──────────────────────────────
 * Inspector on this page inherits the single-route provider, and single-route
 * answers `400 Unsupported method` for every `threads/*` method. Its Threads
 * panel is therefore locked here — driving it would record the failure of the
 * transport under test rather than the state of the store. The strip reads the
 * same store through the multi-route mount instead: same runtime object, same
 * project key, only the transport differs.
 */

const STATUS = '[data-testid="intelligence-status"]';
const COUNT = '[data-testid="thread-count"]';
const RELOAD = '[data-testid="reload-threads"]';

/** The strip's thread count, or null while the list is still loading. */
async function threadCount(page: Page): Promise<number | null> {
  const raw = await page
    .locator(STATUS)
    .getAttribute('data-thread-count')
    .catch(() => null);
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Poll the strip until it reports a count, or give up. */
async function waitForCount(page: Page, timeoutMs: number): Promise<number | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const n = await threadCount(page);
    if (n !== null) return n;
    await sleep(500);
  }
  return null;
}

/** Glide to an element's centre and click it, skipping quietly when absent. */
async function glideClick(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).first().boundingBox().catch(() => null);
  if (!box) return;
  await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 22);
  await humanClick(page);
}

export const runIntelligenceAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath: string,
  ctx: ActionContext,
) => {
  // 1/4: the strip settles first. It reports the key the SERVER holds and the
  // number of threads that key can see — the "before" the whole take hangs on.
  console.log(`   [Intelligence] 1/4: Reading the Intelligence status strip...`);
  await page.locator(STATUS).first().waitFor({ timeout: 30000 }).catch(() => {});
  const before = await waitForCount(page, 30000);
  const connected = await page.locator(STATUS).getAttribute('data-connected').catch(() => null);

  await humanGlide(page, 300, 90, 22);
  await beat(2000);

  if (connected !== 'true') {
    ctx.fail(
      'Strip reports Intelligence NOT connected — CPK_INTELLIGENCE_API_KEY / COPILOTKIT_LICENSE_TOKEN missing or rejected. Steps 1-2 of the doc never completed on this machine.',
    );
  }
  if (before === null) {
    ctx.fail('Thread list never resolved — the read-back could not run.');
  }

  // 2/4: one message, over the single endpoint the doc's step 3 prescribes.
  console.log(`   [Intelligence] 2/4: Sending a message over /api/copilotkit-single...`);
  const msgCount = await sendPrompt(page, promptsFor(config)[0], { timeoutMs: 20000 });
  // `ctx.timeouts` carries this page's override (`replyStartMs: 90_000`).
  // Omitting it falls back to the 30s default, which this page outruns: its
  // runtime route is compiled by `next dev` on the take's own first request.
  //
  // The wait is CAUGHT, not allowed to abort the take. `waitForAgentResponseCompletion`
  // throws when no reply arrives, which is the standard action's correct
  // behaviour — the reply is what it asserts. Here it is not. The assertion is
  // the store, and a mute chat is a finding to record and keep going from, not
  // a reason to end the clip before the one check that matters has run. This
  // page is currently mute for a real reason (see the ctx.fail below), and
  // aborting here is exactly what produced 90 seconds of empty chat box and no
  // evidence.
  let replied = true;
  try {
    const reply = await waitForAgentResponseCompletion(
      page,
      config.waitAfterPromptMs ?? 4000,
      msgCount,
      DEFAULT_ASSISTANT_MESSAGE_SELECTOR,
      { startTimeoutMs: ctx.timeouts.replyStartMs, streamTimeoutMs: ctx.timeouts.replyStreamMs },
    );
    if (reply.streamTimedOut) {
      ctx.warn('Reply still streaming when the wait expired; the clip may end mid-answer.');
    }
  } catch {
    replied = false;
    ctx.fail(
      `No reply arrived within ${Math.round(ctx.timeouts.replyStartMs / 1000)}s. The provider carries \`useSingleEndpoint\` as the doc's step 4 prescribes, and negotiation does go through the single endpoint, but the run itself is still issued as REST: POST /api/copilotkit-single/agent/<id>/run, which the single-route handler does not serve and Next answers 404. Following steps 3 and 4 verbatim produces a chat that cannot run an agent.`,
    );
  }

  // 3/4: the thread is written server-side after the stream closes, so give it
  // a beat, then ask the store again rather than trusting the poll's timing.
  console.log(`   [Intelligence] 3/4: Reloading the thread list...`);
  await beat(2500);
  await glideClick(page, RELOAD);
  await beat(2500);

  let after = await threadCount(page);
  if (before !== null && after !== null && after <= before) {
    // One retry. Thread creation is not synchronous with the reply.
    await glideClick(page, RELOAD);
    await beat(4000);
    after = await threadCount(page);
  }

  // 4/4: rest on the count and the newest thread's name — the frame that
  // carries the verdict.
  console.log(`   [Intelligence] 4/4: Showing the stored thread...`);
  await glideClick(page, COUNT);
  await beat(3000);

  console.log(`   [Intelligence] threads before=${before} after=${after}`);

  if (before !== null && after !== null) {
    if (after > before) {
      console.log(`   [Intelligence] Thread persisted — Intelligence is connected.`);
    } else if (replied) {
      ctx.fail(
        `The agent replied but no thread was stored: count stayed at ${after}. The reply came back without anything reaching the Intelligence project, so the doc's step 5 does not pass.`,
      );
    } else {
      // Already failed above for the mute chat. Said again here because the
      // two halves are separable: the key IS good and the store IS reachable
      // (the strip proves both), so the missing thread is downstream of the
      // 404, not evidence against steps 1-2.
      ctx.warn(
        `Thread count unchanged at ${after}, as follows from the run never reaching the server. Intelligence itself is connected — the strip lists the project's existing threads on the same key.`,
      );
    }
  } else if (after === null) {
    ctx.fail('Thread count unreadable after the message — the read-back could not be checked.');
  }

  // The probe table auto-runs on mount and is on screen throughout. Carry its
  // headline into the report so the clip's finding survives into the summary.
  ctx.warn(
    'Single-route carries chat only: threads/list, memories/list and annotate all answer 400 Unsupported method, against the step’s claim that it carries "chat, thread, memory, and annotation requests". The thread read-back above goes through the multi-route mount.',
  );
};
