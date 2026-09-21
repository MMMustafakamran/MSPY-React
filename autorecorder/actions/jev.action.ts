import { type Page } from 'playwright';
import { beat, humanClick, humanGlide, sleep } from '../core/overlays/cursor';
import { humanType } from '../core/overlays/human';
import { type ActionContext, type PageActionHandler, type PageRecordConfig } from '../core/types';

/**
 * The Jev recipe, driven through the half of it that runs.
 *
 * There is no chat on this page and no agent behind it, so none of the shared
 * prompt helpers apply. `choosePanel` needs `@typesafe-ai/sdk` and a
 * `TYPESAFE_API_KEY` from TypeSafe, and neither is in this repo, so nothing
 * here chooses a control. The demo says so on screen and the take shows it:
 *
 *   1. type the recipe's own opening request into the published form and
 *      submit it. The published `Picker` would run the agent here; this page
 *      answers with a note naming the module and the key that are missing.
 *   2. place the comparison panel by hand, which is the stand-in for Jev's
 *      decision, and click a room. That runs the published `readAction`, which
 *      applies the selection without asking Jev at all.
 *   3. place the clarification panel and click an option. `readAction` rewrites
 *      the message for Jev and returns no selection, so the turn stops, which
 *      is exactly where the recipe hands over.
 *
 * The checks below are about the half that does run. A failure here means the
 * published `readAction` or the published render block stopped working, not
 * that Jev is missing -- Jev is missing on every take by construction.
 */

/** Reads the published `<p>Selected workspace: …</p>` line. */
async function selectedLine(page: Page): Promise<string> {
  return (
    (await page
      .locator('p:has-text("Selected workspace:")')
      .first()
      .textContent()
      .catch(() => null)) ?? ''
  );
}

/** Reads the published `<p aria-live="polite">` note. */
async function noteLine(page: Page): Promise<string> {
  return (
    (await page.locator('p[aria-live="polite"]').first().textContent().catch(() => null)) ?? ''
  );
}

async function clickByTestId(page: Page, testId: string): Promise<boolean> {
  const el = page.locator(`[data-testid="${testId}"]`).first();
  const box = await el.boundingBox().catch(() => null);
  if (!box) return false;
  await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 18);
  await humanClick(page);
  await beat(1000);
  return true;
}

async function clickButtonWithText(page: Page, text: string): Promise<boolean> {
  const el = page.locator(`section button:has-text("${text}")`).first();
  const box = await el.boundingBox().catch(() => null);
  if (!box) return false;
  await humanGlide(page, box.x + box.width / 2, box.y + box.height / 2, 18);
  await humanClick(page);
  await beat(1200);
  return true;
}

export const runJevAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath: string,
  ctx: ActionContext,
) => {
  // Rest on the notice first. It is the finding, and a clip that opens on the
  // picker without it looks like a working Jev integration.
  const notice = page.locator('[data-testid="jev-stand-in"]').first();
  const nBox = await notice.boundingBox().catch(() => null);
  if (!nBox) {
    ctx.fail('[Jev] The "Jev is not wired" notice never rendered. Without it this clip claims more than the page does.');
  } else {
    await humanGlide(page, nBox.x + 120, nBox.y + 30, 22);
    await beat(2500);
  }

  // 1. The published form, with the recipe's own opening request.
  console.log(`   [Jev] 1/3: typing the published request "${config.prompt}"...`);
  const input = page.locator('#request').first();
  const iBox = await input.boundingBox().catch(() => null);
  if (!iBox) {
    ctx.fail('[Jev] The published form input (#request) never rendered.');
    return;
  }
  await humanGlide(page, iBox.x + 60, iBox.y + iBox.height / 2, 20);
  await humanClick(page);
  await sleep(300);
  await humanType(page, config.prompt);
  await sleep(300);
  await page.keyboard.press('Enter');
  await beat(2000);

  const afterFreeText = await noteLine(page);
  if (!/decision layer/i.test(afterFreeText)) {
    ctx.warn(
      `[Jev] Free text did not produce the "no decision layer was reached" note; the note read "${afterFreeText}". ` +
        'Either the published readAction changed, or something is answering for Jev.',
    );
  }

  // 2. The comparison panel, placed by hand, then a room.
  console.log('   [Jev] 2/3: placing the comparison panel and selecting a room...');
  if (!(await clickByTestId(page, 'place-comparison'))) {
    ctx.fail('[Jev] The comparison-panel stand-in button never rendered, so the prepared control could not be shown.');
    return;
  }
  if (!(await clickButtonWithText(page, 'Studio'))) {
    ctx.fail('[Jev] The comparison panel rendered no Studio option. The published PanelSchema / catalog mapping did not produce one.');
    return;
  }

  const selected = await selectedLine(page);
  if (!/studio/i.test(selected)) {
    ctx.fail(
      `[Jev] After clicking Studio the published line still read "${selected}". ` +
        'readAction did not apply the selection, which is the one decision the recipe makes without Jev.',
    );
  } else {
    console.log('   ✅ [Jev] readAction applied the selection.');
  }
  const selectionNote = await noteLine(page);
  if (!/No booking was made/i.test(selectionNote)) {
    ctx.warn(
      `[Jev] The selection note read "${selectionNote}" rather than the published ` +
        '"Selected <name>. No booking was made."',
    );
  }
  await beat(2000);

  // 3. The clarification panel, where the recipe hands back to Jev.
  console.log('   [Jev] 3/3: placing the clarification panel...');
  if (!(await clickByTestId(page, 'place-clarification'))) {
    ctx.warn('[Jev] The clarification-panel stand-in button never rendered.');
    return;
  }
  if (!(await clickButtonWithText(page, 'Quiet focus time'))) {
    ctx.warn('[Jev] The clarification panel rendered no "Quiet focus time" option.');
    return;
  }
  await beat(2500);
};
