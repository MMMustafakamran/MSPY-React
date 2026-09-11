import { type Page } from 'playwright';
import { beat, humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { sendPrompt, waitForAgentResponseCompletion } from '../core/actions';
import { SELECTORS } from '../config/selectors.config';

/**
 * `useAgentContext` — the colleagues list reaching the agent without being sent
 * as a message.
 *
 * This take used to end by typing an issue note into Notepad: the page was
 * registering the context, the run carried it, and the agent still answered as
 * if it knew nothing. That was logged in the README as "intermittent, not yet
 * traced to either side".
 *
 * It was neither intermittent nor untraceable. The forwarded context was being
 * dropped on every single run — `agent_framework_ag_ui` 1.1.0 never reads
 * `input_data["context"]` — and the intermittency was the model sometimes
 * inventing a plausible-sounding answer instead of admitting it had nothing.
 * The docs have since replaced their sample with a `ContextAwareAgent` that
 * injects the context itself, and this route runs it on `/context_agent`.
 *
 * So the note is gone. What replaces it is a check: the answer has to actually
 * name someone from the panel. It warns rather than fails, because a model
 * paraphrasing is not the same failure as the context never arriving — but a
 * run where none of the names appear shows up as PASS* in the summary.
 */
const COLLEAGUES = ['John Doe', 'Jane Smith', 'Bob Wilson'];

export const runReadablesAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath,
  ctx,
) => {
  console.log(`   [Readables] Sending prompt "${config.prompt}"...`);
  const msgCount = await sendPrompt(page, config.prompt, { timeoutMs: 12000 });

  // Glide the cursor over the shared context list on the left, so the clip
  // shows the data the answer has to come from before the answer arrives.
  await beat(1500);
  const contextList = page.locator('ul, li:has-text("John Doe")').first();
  if (await contextList.isVisible({ timeout: 4000 }).catch(() => false)) {
    const clBox = await contextList.boundingBox();
    if (clBox) {
      console.log(`   🎯 Highlighted shared context list at (${Math.round(clBox.x)}, ${Math.round(clBox.y)})`);
      await humanGlide(page, clBox.x + 120, clBox.y + 40, 22);
      await beat(2000);
    }
  }

  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 4000, msgCount);

  // Did the answer come from the panel, or from the model's imagination?
  const reply = await page
    .locator(SELECTORS.assistantMessage)
    .last()
    .innerText()
    .catch(() => '');
  const cited = COLLEAGUES.filter((name) => reply.includes(name));

  if (cited.length === COLLEAGUES.length) {
    console.log(`   ✅ [Readables] Answer cites all ${COLLEAGUES.length} colleagues — the context reached the agent.`);
  } else if (cited.length > 0) {
    ctx.warn(`[Readables] Answer cites only ${cited.length}/${COLLEAGUES.length} (${cited.join(', ')}).`);
  } else {
    ctx.warn(
      `[Readables] Answer names none of the shared colleagues. Check that the chat is bound to \`context_agent\` and not a plain agent.`,
    );
  }
};
