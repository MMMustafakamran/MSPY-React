import { type Page } from 'playwright';
import { humanGlide, sleep } from '../core/overlays/cursor';
import { type PageActionHandler, type PageRecordConfig } from '../core/types';
import { sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

/**
 * Fixed Schema A2UI — the surface, not the sentence.
 *
 * The failure this handler exists to catch is the quiet one. A2UI can fall over
 * in three ways that all leave a chat turn on screen and would all pass a
 * standard take:
 *
 *   1. the tool is never called and the agent describes a flight in prose;
 *   2. the middleware is not enabled for this agent, so `a2ui_operations` is
 *      printed into the message as raw JSON;
 *   3. the surface paints with a catalog the browser does not know, which draws
 *      nothing at all — no error, no component, an empty message.
 *
 * So the card element is required. `data-testid="a2ui-flight-card"` is on this
 * repo's own renderer, which means finding it proves the whole path: the tool
 * ran, the middleware recognised the container, the catalog ids matched, and
 * the binder resolved the data model.
 */
const CARD = '[data-testid="a2ui-flight-card"]';

export const runA2uiAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath,
  ctx,
) => {
  console.log(`   [A2UI] Sending prompt "${config.prompt}"...`);
  const msgCount = await sendPrompt(page, config.prompt, { timeoutMs: 12000 });

  // 60s, not the 20-25s the other gated pages use. The surface is drawn from a
  // tool *result*, so it cannot appear until the whole call has come back — and
  // a run where the model tries several flights before settling was measured at
  // 43s end to end. A shorter cap failed a take that was merely slow.
  const card = page.locator(CARD).first();
  const painted = await card
    .waitFor({ state: 'visible', timeout: 60000 })
    .then(() => true)
    .catch(() => false);

  if (painted) {
    // Glide over the card so the clip lingers on the thing that was drawn
    // rather than cutting the moment it appears.
    const box = await card.boundingBox();
    if (box) {
      console.log(
        `   🎯 A2UI surface painted at (${Math.round(box.x)}, ${Math.round(box.y)})`,
      );
      await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 22);
    }
    await sleep(2000);
  }

  await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 6000, msgCount).catch(
    () => {},
  );

  if (!painted) {
    // Say which of the three failures it was, since the fix differs for each.
    const body = await page.locator('body').innerText().catch(() => '');
    const reason = body.includes('a2ui_operations')
      ? 'the operations container was printed as text — the A2UI middleware is not applied to this agent'
      : 'no surface and no container — `display_flight` was most likely never called';
    ctx.fail(`[A2UI] The flight card never rendered: ${reason}.`);
    return;
  }

  // The card is there; check the data model actually reached it. A surface that
  // paints with an unresolved binding renders the component with empty props,
  // which looks like a styling bug and is not one.
  const text = await card.innerText().catch(() => '');
  const filled = /[A-Z]{3}/.test(text) && /\$|\d/.test(text);
  if (filled) {
    console.log('   ✅ [A2UI] Surface painted with the data model resolved.');
  } else {
    ctx.warn(
      `[A2UI] The card rendered but reads empty (${JSON.stringify(text.slice(0, 80))}) — the { path } bindings did not resolve against the data model.`,
    );
  }
};
