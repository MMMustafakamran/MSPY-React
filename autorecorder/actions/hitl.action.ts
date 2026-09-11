import { type Page } from 'playwright';
import { beat, humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { getAssistantMessageCount, sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

/**
 * The approval gate: a card with Approve/Reject that the agent waits on.
 *
 * What this page is evidence of is the *gate*, not the reply. A run where the
 * card never renders used to sail through: the wait for the button swallowed
 * its timeout, and the agent's "I need approval" text satisfied the reply
 * wait. So the button is required, and a missing one fails the take — there
 * was nothing to approve, so nothing was demonstrated.
 */
export const runHitlAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath,
  ctx,
) => {
  console.log(`   [Human in the Loop] Typing prompt to trigger approval gate...`);
  const msgCount = await sendPrompt(page, config.prompt, { timeoutMs: 12000 });

  console.log(`   Waiting for Approval Required card to render in stream...`);
  const approveBtn = page.locator('button:has-text("Approve")').first();
  const cardRendered = await approveBtn
    .waitFor({ state: 'visible', timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  await beat(1500);

  if (!cardRendered) {
    ctx.fail(
      `[Human in the Loop] The Approve button never rendered — the approval card did not appear, so the gate was never exercised.`,
    );
    // Let whatever the agent did say finish streaming, so the clip shows it.
    await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount).catch(() => {});
    return;
  }

  const abBox = await approveBtn.boundingBox();
  if (abBox) {
    console.log(`   🎯 Detected Approve button at (${Math.round(abBox.x)}, ${Math.round(abBox.y)})`);
    await humanGlide(page, abBox.x + abBox.width / 2, abBox.y + abBox.height / 2, 20);
    await sleep(600);
    await humanClick(page);
    console.log(`   ✓ Clicked Approve button!`);
  } else {
    await approveBtn.click();
  }

  // The reply that counts is the one *after* approval. Counting from the
  // messages present now, rather than from before the prompt, means the
  // "approval required" turn cannot stand in for the result.
  const afterApproval = await getAssistantMessageCount(page);
  await waitForAgentResponseCompletion(
    page,
    config.waitAfterPromptMs ?? 4000,
    Math.max(afterApproval, msgCount),
  );

  // The button should be gone or disabled once the decision is taken.
  const stillClickable = await approveBtn.isEnabled({ timeout: 1000 }).catch(() => false);
  if (stillClickable) {
    ctx.warn(`[Human in the Loop] Approve is still clickable after the reply — the decision may not have reached the agent.`);
  } else {
    console.log(`   ✅ [Human in the Loop] Approval taken and a follow-up reply arrived.`);
  }
};
