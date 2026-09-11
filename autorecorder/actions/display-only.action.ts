import { type Page } from 'playwright';
import { beat, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { sendPrompt } from '../core/actions';

export const runDisplayOnlyAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
) => {
  console.log(`   [Display Only Component] Prompting agent to render WeatherCard component...`);
  await sendPrompt(page, config.prompt, { timeoutMs: 12000 });

  console.log(`   Waiting for generative WeatherCard to render inline in chat...`);
  const weatherCard = page.locator('div:has-text("Tokyo"), div:has-text("77°F")').last();
  await weatherCard.waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
  await beat(1500);

  // Look for rendered WeatherCard and highlight
  if (await weatherCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    const wcBox = await weatherCard.boundingBox();
    if (wcBox) {
      console.log(`   🎯 Detected rendered WeatherCard at (${Math.round(wcBox.x)}, ${Math.round(wcBox.y)})`);
      await humanGlide(page, wcBox.x + wcBox.width / 2, wcBox.y + wcBox.height / 2, 22);
      await beat(3500);
    }
  }

  await humanGlide(page, 960, 500, 25);
  await sleep(config.waitAfterPromptMs ?? 6000);
};
