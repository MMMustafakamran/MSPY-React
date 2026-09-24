"use client";

/**
 * The three snippets from
 * https://docs.copilotkit.ai/ms-agent-python/custom-look-and-feel/markdown,
 * shipped as published.
 *
 * Why they live here and not in `demo-chat/page.tsx`: the first snippet is
 * published as `export function Chat()`. A `page.tsx` in the App Router is a
 * route module, and this repo does not hang extra named exports off one, so
 * keeping the published `export` meant a module of its own. Everything inside
 * each snippet is what the page publishes; the only additions are marked
 * inline and written up in FINDINGS.md #20.
 *
 * The two additions, both marked below:
 *
 *   1. `agentId="my_agent"`. The doc page never binds its chat to an agent.
 *      `agentId` appears nowhere on it, and nowhere on the Slots page either.
 *      This harness registers five named agents and no `default`, so a
 *      `<CopilotChat />` with no `agentId` asks the runtime for `default` and
 *      `useAgent` throws during render. The same addition is already made by
 *      `custom-look-and-feel/slots/demo-chat/page.tsx`.
 *   2. `labels={{ welcomeMessageText: ... }}` on two of them, so the tab you
 *      are looking at is named on screen. Cosmetic, and outside the slot under
 *      test.
 *
 * Snippets 2 and 3 are published as bare JSX expressions rather than
 * components. Each is wrapped in a named function here so it can be mounted;
 * the JSX itself is unchanged.
 */

import { CopilotChat } from "@copilotkit/react-core/v2";

/*
 * PUBLISHED, "Restyle individual HTML tags", `page.tsx`:
 *
 *   import { CopilotChat } from "@copilotkit/react-core/v2";
 *
 *   export function Chat() {
 *     return (
 *       <CopilotChat
 *         messageView={{
 *           assistantMessage: {
 *             markdownRenderer: {
 *               components: {
 *                 a: ({ node, children, ...props }) => (
 *                   <a {...props} className="my-link">
 *                     {children}
 *                   </a>
 *                 ),
 *                 h2: ({ node, children, ...props }) => (
 *                   <h2 {...props} className="my-heading">
 *                     {children}
 *                   </h2>
 *                 ),
 *               },
 *             },
 *           },
 *         }}
 *       />
 *     );
 *   }
 *
 * `my-link` and `my-heading` are named but never defined anywhere on the doc
 * page. They are defined in `src/app/globals.css` here so the override is
 * visible rather than invisible. See FINDINGS.md #20.
 */
// [!code highlight]
export function Chat() {
  return (
    <CopilotChat
      agentId="my_agent" // ADDED, see the header note. Not in the published snippet.
      messageView={{
        assistantMessage: {
          markdownRenderer: {
            components: {
              a: ({ node, children, ...props }) => (
                <a {...props} className="my-link">
                  {children}
                </a>
              ),
              h2: ({ node, children, ...props }) => (
                <h2 {...props} className="my-heading">
                  {children}
                </h2>
              ),
            },
          },
        },
      }}
      labels={{
        welcomeMessageText:
          "markdownRenderer.components: the a and h2 tags are ours.",
      }}
    />
  );
}

/*
 * PUBLISHED, "Restyle the whole markdown block", `page.tsx`:
 *
 *   <CopilotChat
 *     messageView={{
 *       assistantMessage: { markdownRenderer: "text-sm leading-7" },
 *     }}
 *   />
 */
// [!code highlight]
export function ClassStringChat() {
  return (
    <CopilotChat
      agentId="my_agent" // ADDED, see the header note. Not in the published snippet.
      messageView={{
        assistantMessage: { markdownRenderer: "text-sm leading-7" },
      }}
      labels={{
        welcomeMessageText:
          'markdownRenderer: "text-sm leading-7", one class string on the markdown container.',
      }}
    />
  );
}

/*
 * PUBLISHED, "Replace the renderer", `page.tsx`:
 *
 *   const PlainText = ({ content }: { content: string }) => (
 *     <pre className="whitespace-pre-wrap">{content}</pre>
 *   );
 *
 *   <CopilotChat
 *     messageView={{ assistantMessage: { markdownRenderer: PlainText } }}
 *   />;
 *
 * The removed FINDINGS.md #5 (see git history) said a bare function component is not assignable to most slots,
 * because `SlotValue<C> = C | string | Partial<ComponentProps<C>>` pins the
 * replacement to the default component's statics. This slot is the exception,
 * and it does compile: `CopilotChatAssistantMessage.MarkdownRenderer` is a
 * plain `React.FC<…>` with nothing hanging off it, unlike
 * `CopilotChatMessageView`, which carries a required `Cursor`. Checked with
 * `npx tsc --noEmit` at @copilotkit/react-core 1.69.2.
 */
// [!code highlight]
const PlainText = ({ content }: { content: string }) => (
  <pre className="whitespace-pre-wrap">{content}</pre>
);

export function PlainTextChat() {
  return (
    <CopilotChat
      agentId="my_agent" // ADDED, see the header note. Not in the published snippet.
      messageView={{ assistantMessage: { markdownRenderer: PlainText } }}
    />
  );
}
