import { type Page } from 'playwright';
import { beat, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

export const runAuthAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
) => {
  console.log(`   [Authentication] Highlighting auth configuration panel...`);
  await beat(1500);

  // Glide cursor over the auth verdict card on the left
  const verdictCard = page
    .locator(
      'div[class*="border-emerald"], div[class*="border-amber"], div[class*="border-rose"], h2:has-text("Current configuration")',
    )
    .first();
  if (await verdictCard.isVisible({ timeout: 4000 }).catch(() => false)) {
    const vcBox = await verdictCard.boundingBox();
    if (vcBox) {
      console.log(
        `   🎯 Detected Auth configuration card at (${Math.round(vcBox.x)}, ${Math.round(vcBox.y)})`,
      );
      await humanGlide(page, vcBox.x + 100, vcBox.y + 40, 22);
      await beat(2500);
    }
  }

  console.log(`   Sending test chat message through auth pipeline...`);
  const msgCount = await sendPrompt(page, config.prompt, { timeoutMs: 12000 });

  // Actively wait for streaming response to stabilize and finish
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount);
};
