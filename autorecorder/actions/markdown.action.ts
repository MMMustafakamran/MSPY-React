import { type Page } from 'playwright';
import { beat, humanClick, humanGlide } from '../core/overlays/cursor';
import { type ActionContext, type PageActionHandler, type PageRecordConfig } from '../core/types';
import { promptsFor, sendPrompt, waitForAgentResponseCompletion } from '../core/actions';

/**
 * The four tabs on `/custom-look-and-feel/markdown/demo-chat`, in order.
 *
 * Tabs 1 to 3 are the doc page's three techniques, shipped verbatim. Tab 4 is
 * the repo's own probe: the same components map with `node` left in the spread,
 * which is what the page warns produces `node="[object Object]"`.
 *
 * Every tab drives an ordinary CopilotChat, so the default assistant-message
 * selector works throughout -- including tab 3, where the renderer is replaced
 * but the message wrapper around it is not.
 *
 * After each reply the handler clicks "Read the rendered HTML" and reads the
 * `<pre>` it fills. That readout is the whole point of the page: the three
 * claims it makes are about attributes the browser did or did not emit, and
 * nothing in the chat itself shows them.
 */
const TABS: {
  tabLabel: string | null;
  /** Substring the readout must contain for this tab's claim to hold. */
  expect?: { text: string; present: boolean; note: string };
}[] = [
  {
    tabLabel: null,
    expect: {
      text: 'node="[object Object]"',
      present: false,
      note: 'the published map destructures `node` out, so it must not reach the HTML',
    },
  },
  {
    tabLabel: '2 · class string',
    expect: {
      text: 'data-streamdown',
      present: true,
      note: 'no component override on this tab, so Streamdown\'s own default link renderer should be in play',
    },
  },
  { tabLabel: '3 · replace the renderer' },
  {
    tabLabel: '4 · node left in (ours)',
    expect: {
      text: 'node="[object Object]"',
      present: true,
      note: 'this tab deliberately spreads `node`, which is the failure the page warns about',
    },
  },
];

export const runMarkdownAction: PageActionHandler = async (
  page: Page,
  config: PageRecordConfig,
  _rootPath: string,
  ctx: ActionContext,
) => {
  const prompts = promptsFor(config);

  for (let i = 0; i < TABS.length; i++) {
    const { tabLabel, expect } = TABS[i];
    console.log(`   [Markdown] ${i + 1}/${TABS.length}: ${tabLabel ?? '1 · components map'}...`);

    if (tabLabel) {
      const tab = page.locator(`button:has-text("${tabLabel}")`).first();
      const tBox = await tab.boundingBox();
      if (tBox) {
        await humanGlide(page, tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, 20);
        await humanClick(page);
      }
      await beat(1000);
    }

    const prompt = prompts[i] ?? prompts[prompts.length - 1];
    const msgCount = await sendPrompt(page, prompt, { timeoutMs: i === 0 ? 8000 : 6000 });
    await waitForAgentResponseCompletion(page, config.waitAfterPromptMs ?? 2000, msgCount);

    // The readout. Clicked rather than polled so it is visible on camera that
    // the HTML was read after the reply, not before it.
    const readButton = page.locator('[data-testid="inspect-rendered-html"]').first();
    const rBox = await readButton.boundingBox();
    if (!rBox) {
      ctx.warn('[Markdown] The "Read the rendered HTML" button never rendered, so no tab could be checked.');
      continue;
    }
    await humanGlide(page, rBox.x + rBox.width / 2, rBox.y + rBox.height / 2, 18);
    await humanClick(page);
    await beat(1200);

    const readout = await page
      .locator('[data-testid="rendered-html"]')
      .first()
      .textContent()
      .catch(() => null);

    if (readout === null) {
      ctx.warn(`[Markdown] Tab ${i + 1}: the readout never appeared.`);
      continue;
    }

    // Always reported, even with no assertion for this tab: the reply is the
    // model's, so a take where it answered without a link or a heading is a
    // take where none of the claims could have been checked.
    if (!readout.includes('<a ') && !readout.includes('<h2')) {
      ctx.warn(
        `[Markdown] Tab ${i + 1}: the reply carried no <a> and no <h2>, so nothing on this tab was exercised. ` +
          'Check the prompt still asks for a link and a heading.',
      );
    }

    if (expect) {
      const found = readout.includes(expect.text);
      if (found !== expect.present) {
        ctx.warn(
          `[Markdown] Tab ${i + 1}: expected ${expect.text} to be ${expect.present ? 'present' : 'absent'} ` +
            `in the rendered HTML and it was ${found ? 'present' : 'absent'} -- ${expect.note}.`,
        );
      } else {
        console.log(`   ✅ [Markdown] Tab ${i + 1}: ${expect.text} ${expect.present ? 'present' : 'absent'}, as the page says.`);
      }
    }

    await beat(800);
  }
};
