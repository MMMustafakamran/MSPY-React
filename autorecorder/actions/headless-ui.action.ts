import { type Page } from 'playwright';
import { beat, humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { humanType } from '../core/overlays/human';
import { ensureClearOfTaskbar } from '../core/overlays/taskbar';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';

/**
 * Deliberately NOT routed through the shared sendPrompt() helper.
 *
 * This page hand-builds its input and Send button over useAgent/useCopilotKit,
 * and its submit path is timing-sensitive in a way the shared helper breaks:
 * switching it over made the run fail reproducibly with
 * `agent_run_error_event HTTP 405` from the Python backend and no response at
 * all, while this implementation streams reliably. The difference does not
 * reproduce headlessly, so the exact trigger is not pinned down yet.
 *
 * The input row used to end up under the taskbar: the Send button sat at
 * y=1026..1064 in a 1080-tall viewport while the overlay covers y>=1032, so the
 * click was swallowed and the submit only landed via the Enter retry -- with
 * the prompt field half-hidden on camera. `ensureClearOfTaskbar` now scrolls
 * the form above the overlay before anything is typed, which fixes both the
 * shot and the click. The page itself is left alone: it is the documented
 * implementation, and the taskbar is the recorder's own furniture.
 */
export const runHeadlessUiAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
) => {
  console.log(`   [Headless UI] Waiting for custom headless interface to settle...`);
  await page.waitForSelector('input[placeholder="Type a message..."], input', {
    state: 'visible',
    timeout: 15000,
  });
  await beat(800);

  const inputLocator = page
    .locator('input[placeholder="Type a message..."], input')
    .first();

  // Lift the whole form clear of the taskbar before the cursor goes anywhere
  // near it, so the input is fully visible and the Send button is clickable.
  const formLocator = page.locator('form').filter({ has: inputLocator }).first();
  const cleared = await ensureClearOfTaskbar(
    page,
    (await formLocator.count()) > 0 ? formLocator : inputLocator,
  );
  if (!cleared) {
    console.log('   ⚠️ [Headless UI] Input still overlaps the taskbar; Enter will carry the submit.');
  }
  await sleep(300);

  const inputBox = await inputLocator.boundingBox();
  if (inputBox) {
    await humanGlide(page, inputBox.x + 80, inputBox.y + inputBox.height / 2, 20);
    await humanClick(page);
  } else {
    await inputLocator.click();
  }
  await sleep(400);

  // Type the prompt visibly
  console.log(`   [Headless UI] Typing prompt: "${config.prompt}"...`);
  await humanType(page, config.prompt);
  await sleep(350);

  // Ensure input state is populated
  const val = await inputLocator.inputValue().catch(() => '');
  if (!val && config.prompt) {
    await inputLocator.fill(config.prompt);
    await sleep(200);
  }

  // Click the Send button
  const sendBtn = page
    .locator('button:has-text("Send"), button[type="submit"]')
    .first();
  if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const sbBox = await sendBtn.boundingBox();
    if (sbBox) {
      await humanGlide(page, sbBox.x + sbBox.width / 2, sbBox.y + sbBox.height / 2, 18);
      await humanClick(page);
    } else {
      await sendBtn.click();
    }
  } else {
    await page.keyboard.press('Enter');
  }

  // Double check if submit went through
  await beat(800);
  const remaining = await inputLocator.inputValue().catch(() => '');
  if (remaining.trim().length > 0) {
    await page.keyboard.press('Enter');
  }

  console.log(`   ⏳ Actively detecting Headless UI assistant response bubble...`);
  // Poll until assistant response starts and stabilizes
  const streamStart = Date.now();
  let previousText = '';
  let stableCount = 0;

  while (Date.now() - streamStart < 35000) {
    const currentText = await page
      .evaluate(() => {
        const bubbles = document.querySelectorAll('.max-w-md');
        if (bubbles.length < 2) return '';
        const lastMsg = bubbles[bubbles.length - 1];
        return (lastMsg.textContent || '').trim();
      })
      .catch(() => '');

    if (currentText.length > 0 && currentText === previousText) {
      stableCount++;
      if (stableCount >= 4) {
        console.log(`   ✅ Headless UI response streaming completed.`);
        break;
      }
    } else {
      stableCount = 0;
      previousText = currentText;
    }
    await sleep(500);
  }

  // Glide cursor over the rendered assistant message
  const assistantBubble = page.locator('.max-w-md:not(:first-child)').last();
  if (await assistantBubble.isVisible({ timeout: 4000 }).catch(() => false)) {
    const abBox = await assistantBubble.boundingBox();
    if (abBox) {
      console.log(
        `   🎯 Detected Headless UI assistant message at (${Math.round(abBox.x)}, ${Math.round(abBox.y)})`,
      );
      await humanGlide(page, abBox.x + Math.min(abBox.width / 2, 200), abBox.y + 25, 22);
    }
  } else {
    await humanGlide(page, 960, 400, 25);
  }

  await sleep(config.waitAfterPromptMs ?? 6000);
};
