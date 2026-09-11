import { type Page } from 'playwright';
import { beat, humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { humanType } from '../core/overlays/human';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { waitForAgentResponseCompletion } from '../core/actions';

export const runProgrammaticAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
) => {
  console.log(`   [Programmatic Control] 1/2: Toggling Dark Mode in agent.state...`);
  const darkModeBtn = page.getByRole('button', { name: 'Dark Mode' }).first();
  if (await darkModeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    const dmBox = await darkModeBtn.boundingBox();
    if (dmBox) {
      await humanGlide(page, dmBox.x + dmBox.width / 2, dmBox.y + dmBox.height / 2, 20);
      await humanClick(page);
      console.log(`   Clicked Dark Mode!`);
      await beat(1500);
    }
  }

  console.log(`   [Programmatic Control] 2/2: Typing prompt & clicking 'Run agent'...`);
  const inputLocator = page.locator('[data-testid="programmatic-input"], input[placeholder="Message to send"]').first();
  await inputLocator.waitFor({ state: 'visible', timeout: 10000 });
  const inputBox = await inputLocator.boundingBox();
  if (inputBox) {
    await humanGlide(page, inputBox.x + 80, inputBox.y + inputBox.height / 2, 18);
    await humanClick(page);
  } else {
    await inputLocator.click();
  }
  await sleep(200);

  // Clear and type prompt
  await humanType(page, config.prompt);
  await sleep(300);

  // Click "Run agent" button explicitly
  const runBtn = page.locator('[data-testid="run-agent-btn"], button:has-text("Run agent")').first();
  await runBtn.waitFor({ state: 'visible', timeout: 5000 });
  const runBox = await runBtn.boundingBox();
  if (runBox) {
    await humanGlide(page, runBox.x + runBox.width / 2, runBox.y + runBox.height / 2, 16);
    await humanClick(page);
    console.log(`   Clicked 'Run agent'!`);
  } else {
    await runBtn.click();
  }

  console.log(`   Waiting for Programmatic Control AI response...`);
  await waitForAgentResponseCompletion(
    page,
    config.waitAfterPromptMs ?? 3000,
    0,
    'section div p.whitespace-pre-wrap, section div.rounded-lg',
  ).catch(async () => {
    await sleep(config.waitAfterPromptMs ?? 3000);
  });
};
