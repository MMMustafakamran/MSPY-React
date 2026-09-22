"use client";

import {
  CopilotChat,
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  CopilotThreadsDrawer,
  type Thread,
} from "@copilotkit/react-core/v2";
import { useState } from "react";

import { DemoFrame } from "@/components/demo-frame";
import { ThreadsProvider } from "@/components/threads-provider";

/**
 * `<CopilotThreadsDrawer>` beside `<CopilotChat>`, in the two shapes the doc
 * page covers: the zero-prop integration, and the same drawer with its
 * documented customization props applied. A third tab hosts the drawer in
 * `<CopilotSidebar>`, from "Use the Drawer with a sidebar chat".
 *
 * Both mount the drawer and the chat under one
 * `CopilotChatConfigurationProvider` — that shared configuration is what makes
 * selecting a row drive the chat with no active-thread state of our own.
 */

const AGENT_ID = "default";

type Variant = "default" | "customized" | "sidebar";

const TABS: { id: Variant; label: string; blurb: string }[] = [
  {
    id: "default",
    label: "Zero props",
    blurb: "The doc's integration verbatim — no props, no wiring.",
  },
  {
    id: "customized",
    label: "Customized",
    blurb: "renderRow + limit + label overrides.",
  },
  {
    id: "sidebar",
    label: "Sidebar host",
    blurb: "Use the Drawer with a sidebar chat.",
  },
];

/** `renderRow` content — the element keeps selection, archived styling, and the kebab menu. */
function renderRow(thread: Thread) {
  const when = thread.lastRunAt ?? thread.updatedAt;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="truncate text-sm">{thread.name ?? "New conversation"}</span>
      <span className="text-[11px] opacity-60">
        {new Date(when).toLocaleString()}
      </span>
    </div>
  );
}

export default function Page() {
  const [variant, setVariant] = useState<Variant>("default");
  const active = TABS.find((t) => t.id === variant)!;

  return (
    <DemoFrame parentPath="/threads/drawer" subtitle={active.blurb}>
      <ThreadsProvider>
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setVariant(tab.id)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  variant === tab.id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Remounted per variant so the drawer re-registers with a fresh
              configuration instead of inheriting the previous one's state. */}
          <div className="min-h-0 flex-1" key={variant}>
            {variant === "sidebar" ? <SidebarHost /> : (
            <>
            {/* [1] threads-drawer: shared chat configuration */}
            {/* [!code highlight] */}
            <CopilotChatConfigurationProvider agentId={AGENT_ID}>
              <div className="flex h-full">
                {variant === "default" ? (
                  /* [2] threads-drawer: drop-in drawer, zero props */
                  /* [!code highlight] */
                  <CopilotThreadsDrawer />
                ) : (
                  /*
                    [3] threads-drawer: renderRow, pagination, and labels

                    The doc's third escape hatch — projecting `slot="header"`
                    children — is omitted because it does not work in 1.68.2:
                    `CopilotThreadsDrawerProps` declares no `children`, and the
                    wrapper renders the custom element with only `renderRow`
                    output as its children, so anything else is dropped. See the
                    note on this route's page.
                  */
                  /* [!code highlight] */
                  <CopilotThreadsDrawer
                    label="Test conversations"
                    recentLabel="Recent"
                    renderRow={renderRow}
                    limit={5}
                  />
                )}

                <div className="min-w-0 flex-1">
                  {/* [4] threads-drawer: the chat the drawer drives */}
                  {/* [!code highlight] */}
                  <CopilotChat />
                </div>
              </div>
            </CopilotChatConfigurationProvider>
            </>
            )}
          </div>
        </div>
      </ThreadsProvider>
    </DemoFrame>
  );
}

/**
 * "Use the Drawer with a sidebar chat", as published, one level in: the
 * snippet's outer `<CopilotKitProvider runtimeUrl="/api/copilotkit">` is the
 * one this app mounts at its root, and its `height: "100dvh"` is `100%` here
 * because the demo sits under this app's demo bar.
 */
function SidebarHost() {
  return (
    // [5] threads-drawer: the same drawer, hosted by CopilotSidebar
    // [!code highlight]
    <CopilotChatConfigurationProvider>
      <div style={{ display: "flex", height: "100%" }}>
        <CopilotThreadsDrawer />
        <main style={{ flex: 1 }}>
          <YourMainContent />
          <CopilotSidebar defaultOpen={true} />
        </main>
      </div>
    </CopilotChatConfigurationProvider>
  );
}

/**
 * NOT FROM THE PAGE. The sidebar snippet renders `<YourMainContent />` and
 * never defines it; this stands in so the published tree can mount.
 */
function YourMainContent() {
  return (
    <div className="p-6 text-sm text-slate-600 dark:text-slate-400">
      Main content. The sidebar chat on the right shares the drawer&apos;s chat
      configuration.
    </div>
  );
}
