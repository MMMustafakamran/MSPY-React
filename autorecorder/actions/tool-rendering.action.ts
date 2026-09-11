import { type Page } from 'playwright';
import { beat, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

/**
 * A named `useRenderTool` for `get_weather` plus the wildcard fallback.
 *
 * What the doc promises is specific: "Calling weather API..." while the call
 * is in flight, then "Called the weather API for <location>." once it
 * returns. A run where the model answers in prose and the renderer never
 * mounts still streams a perfectly good-looking reply, so the clip would pass
 * on its own. The check at the end reads the page for the renderer's text and
 * says so when it is missing.
 */
const RENDERED_TEXT = 'Called the weather API for';

export const runToolRenderingAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath,
  ctx,
) => {
  console.log(`   [Tool Rendering] Prompting for weather to trigger custom renderer...`);
  const msgCount = await sendPrompt(page, config.prompt, { timeoutMs: 12000 });

  console.log(`   ⏳ Actively detecting AI agent response & custom tool rendering...`);
  // Look for custom weather tool rendered element and glide cursor over it
  const weatherElement = page
    .locator('p:has-text("weather API"), .copilotKitAssistantMessage')
    .first();
  await weatherElement.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await beat(1500);

  if (await weatherElement.isVisible({ timeout: 5000 }).catch(() => false)) {
    const weBox = await weatherElement.boundingBox();
    if (weBox) {
      console.log(`   🎯 Detected rendered weather tool call at (${Math.round(weBox.x)}, ${Math.round(weBox.y)})`);
      await humanGlide(page, weBox.x + Math.min(weBox.width / 2, 250), weBox.y + weBox.height / 2, 22);
      await beat(2500);
    }
  }

  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount);

  // Did the custom renderer mount, or did the agent just talk about the weather?
  const rendered = await page
    .locator(`text=${RENDERED_TEXT}`)
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (rendered) {
    console.log(`   ✅ [Tool Rendering] Custom renderer mounted ("${RENDERED_TEXT} …").`);
  } else {
    ctx.warn(
      `[Tool Rendering] "${RENDERED_TEXT}" never appeared. The reply streamed, but the ` +
        `useRenderTool component did not mount — check that the tool name matches get_weather.`,
    );
  }
};
