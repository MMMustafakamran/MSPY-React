"use client";

import { CopilotChat, CopilotKit, CopilotKitProvider } from "@copilotkit/react-core/v2";
import { useState } from "react";

import { DemoFrame } from "@/components/demo-frame";

/**
 * Message history, the two trimming placements a reader can try on this stack.
 *
 * - **Runtime middleware** talks to `/api/copilotkit-trimmed`, where the page's
 *   `TrimHistoryMiddleware(lastTurnOnly)` is attached to the agent. Each run
 *   reaches the Microsoft Agent Framework endpoint with the final turn only;
 *   the transcript here stays whole.
 * - **Browser messageFilter** is the page's first recipe, verbatim, on the main
 *   runtime. `@copilotkit/react-core` 1.69.2 did not declare `messageFilter`
 *   (a type error and an ignored prop); 1.73.3, installed now, declares it on
 *   `CopilotKitProps` and `@copilotkit/core` applies it. The page states no
 *   minimum version. Its effect on this stack has not been re-observed.
 *
 * Observed 2026-09-22 (see the route page): this backend's AG-UI endpoint did
 * not keep its own history. Sent the whole transcript it answered from it; sent
 * the last turn alone, by the trimmed runtime or on a second run of the same
 * thread, it did not know the name. So on this stack the tabs answer
 * differently, and the trimmed one is the one that forgets.
 *
 * The page's `<YourApp />` is the chat. The page's third recipe,
 * `selfManagedAgents`, is quoted on the route page rather than mounted: its
 * agent URL is the placeholder `https://agents.example.com/support`.
 */

type Placement = "runtime" | "browser";

const TABS: { id: Placement; label: string; blurb: string }[] = [
  {
    id: "runtime",
    label: "Runtime middleware",
    blurb: "TrimHistoryMiddleware(lastTurnOnly) on /api/copilotkit-trimmed",
  },
  {
    id: "browser",
    label: "Browser messageFilter",
    blurb: "messageFilter={(messages) => messages.slice(-1)} on /api/copilotkit",
  },
];

// NOT FROM THE PAGE: `agentId`. The trimmed runtime registers the page's
// `default` agent, so `<CopilotChat />` finds it bare. The main runtime at
// /api/copilotkit registers five named agents and no `default`, so the browser
// tab binds the chat to `my_agent`, as the Markdown and Slots demos do.
function YourApp({ agentId }: { agentId?: string }) {
  return <CopilotChat agentId={agentId} />;
}

export default function Page() {
  const [placement, setPlacement] = useState<Placement>("runtime");
  const active = TABS.find((t) => t.id === placement)!;

  return (
    <DemoFrame parentPath="/backend/message-history" subtitle={active.blurb}>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`message-history-${tab.id}`}
              onClick={() => setPlacement(tab.id)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                placement === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Remounted per placement so each tab starts its own conversation. */}
        <div className="min-h-0 flex-1" key={placement}>
          {placement === "runtime" ? (
            <CopilotKitProvider runtimeUrl="/api/copilotkit-trimmed">
              <YourApp />
            </CopilotKitProvider>
          ) : (
            // [2] message-history: trim from the browser, as published
            // [!code highlight]
            <CopilotKit
              runtimeUrl="/api/copilotkit"
              // No suppression: a type error at @copilotkit/react-core 1.69.2,
              // a declared prop at 1.73.3 (tsc flagged the old one as unused).
              messageFilter={(messages) => messages.slice(-1)}
            >
              <YourApp agentId="my_agent" />
            </CopilotKit>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
