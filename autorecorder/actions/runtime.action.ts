import { type Page } from 'playwright';
import { beat, humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { promptsFor, sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

export const runRuntimeAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
) => {
  const prompts = promptsFor(config);

  // 1/3: my_agent
  console.log(`   [Copilot Runtime] 1/3: Testing 'my_agent' routing...`);
  const msgCount1 = await sendPrompt(page, prompts[0], { timeoutMs: 12000 });
  console.log(`   Waiting for 'my_agent' response...`);
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 1500, msgCount1);

  // 2/3: sample_agent
  console.log(`   [Copilot Runtime] 2/3: Switching to 'sample_agent' tab...`);
  const sampleTab = page.locator('button:has-text("sample_agent")').first();
  if (await sampleTab.isVisible().catch(() => false)) {
    const sBox = await sampleTab.boundingBox();
    if (sBox) {
      await humanGlide(page, sBox.x + sBox.width / 2, sBox.y + sBox.height / 2, 20);
      await humanClick(page);
      await beat(1000);
    }
  }

  if (prompts[1]) {
    const msgCount2 = await sendPrompt(page, prompts[1], { timeoutMs: 8000 });
    await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 1500, msgCount2);
  }

  // 3/3: search_agent
  console.log(`   [Copilot Runtime] 3/3: Switching to 'search_agent' tab...`);
  const searchTab = page.locator('button:has-text("search_agent")').first();
  if (await searchTab.isVisible().catch(() => false)) {
    const stBox = await searchTab.boundingBox();
    if (stBox) {
      await humanGlide(page, stBox.x + stBox.width / 2, stBox.y + stBox.height / 2, 20);
      await humanClick(page);
      await beat(1000);
    }
  }

  // 4/4: the name that is not a key.
  //
  // "Which name identifies an agent" arrived with the 2026-09-21 sync, and its
  // claim is that only the agents-map key resolves. The probe asks for
  // `MyAgent`, the name backend/agents.py gives the same agent, and fails if the
  // result never renders: a take that skipped it would show four working tabs
  // and none of the section.
  console.log(`   [Copilot Runtime] 4/4: Asking for an unregistered name...`);
  await page.locator('[data-testid="runtime-keys"]').first().waitFor({ timeout: 20000 });
  await beat(1200);

  const askButton = page.locator('[data-testid="ask-unregistered"]').first();
  const askBox = await askButton.boundingBox().catch(() => null);
  if (askBox) {
    await humanGlide(page, askBox.x + askBox.width / 2, askBox.y + askBox.height / 2, 20);
    await humanClick(page);
  }

  await page.locator('[data-testid="unregistered-result"]').first().waitFor({ timeout: 20000 });
  await beat(2500);

  await humanGlide(page, 960, 500, 25);
  await beat(1500);
};
