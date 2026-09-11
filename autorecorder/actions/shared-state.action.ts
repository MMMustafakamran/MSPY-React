import { type Page } from 'playwright';
import { beat, humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

export const runSharedStateWriteAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath,
  ctx,
) => {
  console.log(`   [Shared State Write] Clicking "Toggle + re-run agent" button on the left...`);
  await beat(1500);

  const rerunBtn = page.locator('button:has-text("Toggle + re-run agent")').first();
  if (await rerunBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    const btnBox = await rerunBtn.boundingBox();
    if (btnBox) {
      await humanGlide(page, btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, 20);
      await sleep(400);
      await humanClick(page);
      console.log(`   ✓ Clicked "Toggle + re-run agent"!`);
    }
  } else {
    ctx.fail(`[Shared State Write] "Toggle + re-run agent" button not found — nothing was written, so there was nothing to demonstrate.`);
  }

  // Glide cursor over the raw JSON state on the left
  await beat(1500);
  const rawPre = page.locator('pre').first();
  if (await rawPre.isVisible({ timeout: 4000 }).catch(() => false)) {
    const preBox = await rawPre.boundingBox();
    if (preBox) {
      await humanGlide(page, preBox.x + preBox.width / 2, preBox.y + preBox.height / 2, 22);
      await beat(1500);
    }
  }

  // This page re-runs the agent from a button, so there is no prompt to send.
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000);
};
