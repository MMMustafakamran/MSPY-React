import { type Page } from 'playwright';
import { beat, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

/**
 * `searches` state streamed from `search_agent` into a list outside the chat.
 *
 * The page's empty state reads "No searches yet." If that text is still on
 * screen after the reply finishes, the tool call either never happened or
 * `predict_state_config` did not map it onto `agent.state.searches` — and the
 * clip would show a chat answering happily beside an empty panel. Logged, not
 * thrown: the recording is still the evidence, the log says what it shows.
 */
const EMPTY_STATE_TEXT = 'No searches yet';

export const runStateRenderingAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath,
  ctx,
) => {
  console.log(`   [State Rendering] Sending prompt to stream searches state...`);
  const msgCount = await sendPrompt(page, config.prompt, { timeoutMs: 12000 });

  // Glide cursor over the rendered searches list on the left as it streams
  await beat(2000);
  const searchesList = page
    .locator('div:has-text("Searches (rendered outside the chat)") + div, h2:has-text("Searches")')
    .first();
  if (await searchesList.isVisible({ timeout: 4000 }).catch(() => false)) {
    const slBox = await searchesList.boundingBox();
    if (slBox) {
      console.log(`   🎯 Detected streamed Searches UI at (${Math.round(slBox.x)}, ${Math.round(slBox.y)})`);
      await humanGlide(page, slBox.x + 120, slBox.y + 40, 22);
      await beat(1500);
    }
  }

  // Glide cursor over the raw agent.state JSON pre block
  const rawPre = page.locator('pre').first();
  if (await rawPre.isVisible({ timeout: 3000 }).catch(() => false)) {
    const preBox = await rawPre.boundingBox();
    if (preBox) {
      await humanGlide(page, preBox.x + preBox.width / 2, preBox.y + preBox.height / 2, 22);
      await beat(1500);
    }
  }

  // Actively wait for search_agent response and state streaming to complete
  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount);

  // Did state actually reach the panel?
  const stillEmpty = await page
    .locator(`text=${EMPTY_STATE_TEXT}`)
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  if (stillEmpty) {
    ctx.warn(
      `[State Rendering] Panel still reads "${EMPTY_STATE_TEXT}" after the reply. ` +
        `agent.state.searches never populated — check update_searches and predict_state_config.`,
    );
  } else {
    console.log(`   ✅ [State Rendering] Searches panel populated from agent state.`);
  }
};
