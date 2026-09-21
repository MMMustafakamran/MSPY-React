"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";
import { useRef, useState } from "react";

import { DemoFrame } from "@/components/demo-frame";

import {
  Chat,
  ClassStringChat,
  PlainTextChat,
} from "../published-snippets";

/**
 * The `markdownRenderer` slot, in the three forms the doc page publishes, plus
 * one probe of our own.
 *
 * Tabs 1 to 3 mount `published-snippets.tsx` unchanged. Tab 4 is NOT doc code:
 * it is the same `components` map with `node` left in the spread, which is the
 * thing the page warns about ("spreading it onto an element writes a literal
 * `node="[object Object]"` into the HTML"). Keeping it beside the published
 * version is the only way to show that the published version is the one that
 * is right.
 *
 * The HTML readout at the bottom is what turns the page's three claims into
 * something you can check rather than take on trust:
 *
 *   - `node="[object Object]"` appears on tab 4 and not on tab 1;
 *   - a default `<a>` carries `data-streamdown="link"` and Streamdown's own
 *     classes, an overridden one carries neither;
 *   - a `<reference-chip>` written by the model never reaches the DOM at all.
 */

type Technique = "components" | "classes" | "replace" | "node-spread";

const TECHNIQUES: { id: Technique; label: string; blurb: string }[] = [
  {
    id: "components",
    label: "1 · components map",
    blurb:
      "A props override sets Streamdown's components map. One React component per HTML tag.",
  },
  {
    id: "classes",
    label: "2 · class string",
    blurb: "A class string is merged onto the markdown container as a whole.",
  },
  {
    id: "replace",
    label: "3 · replace the renderer",
    blurb:
      "A component instead of an object. It receives one prop, content, holding the raw markdown.",
  },
  {
    id: "node-spread",
    label: "4 · node left in (ours)",
    blurb:
      "Not doc code. The same map with node spread onto the element, to check the warning the page gives.",
  },
];

/*
 * NOT PUBLISHED. This repo's probe of the page's first warning.
 *
 * The published map in `published-snippets.tsx` destructures `node` out. This
 * one leaves it in `...props` and spreads it, which is exactly what the page
 * says produces `node="[object Object]"`. It exists to be compared with tab 1
 * in the HTML readout below; do not read it as doc code.
 */
function NodeSpreadChat() {
  return (
    <CopilotChat
      agentId="my_agent"
      messageView={{
        assistantMessage: {
          markdownRenderer: {
            components: {
              a: ({ children, ...props }) => (
                <a {...props} className="my-link">
                  {children}
                </a>
              ),
            },
          },
        },
      }}
      labels={{
        welcomeMessageText:
          "node is NOT destructured out here. Check the readout below after a reply.",
      }}
    />
  );
}

/** Tags the page makes claims about, in the order it makes them. */
const PROBED = "a, h2, kbd, sup, reference-chip";

export default function Page() {
  const [technique, setTechnique] = useState<Technique>("components");
  const [html, setHtml] = useState<string[] | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const active = TECHNIQUES.find((t) => t.id === technique)!;

  function inspect() {
    const root = chatRef.current;
    if (!root) return;
    const found = [...root.querySelectorAll(PROBED)].map((el) => el.outerHTML);
    setHtml(found);
  }

  return (
    <DemoFrame
      parentPath="/custom-look-and-feel/markdown"
      subtitle={active.blurb}
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          {TECHNIQUES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTechnique(t.id);
                setHtml(null);
              }}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                technique === t.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div ref={chatRef} className="min-h-0 flex-1">
          {/* [1] markdown: components map, published verbatim */}
          {/* [!code highlight] */}
          {technique === "components" && <Chat key="components" />}

          {/* [2] markdown: class string, published verbatim */}
          {technique === "classes" && <ClassStringChat key="classes" />}

          {/* [3] markdown: replace the renderer, published verbatim */}
          {technique === "replace" && <PlainTextChat key="replace" />}

          {/* [4] ours, not doc code */}
          {technique === "node-spread" && <NodeSpreadChat key="node-spread" />}
        </div>

        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={inspect}
              data-testid="inspect-rendered-html"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:text-slate-200"
            >
              Read the rendered HTML
            </button>
            <span className="text-xs text-slate-500">
              Reads every <code>{PROBED}</code> currently in the transcript, as
              the browser built it.
            </span>
          </div>

          {html !== null && (
            <pre
              data-testid="rendered-html"
              className="mt-3 max-h-40 overflow-auto rounded bg-slate-900 p-3 text-xs leading-relaxed text-slate-100"
            >
              {html.length === 0
                ? "Nothing matched. Send a message first, or the reply carried none of these tags."
                : html.join("\n\n")}
            </pre>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
