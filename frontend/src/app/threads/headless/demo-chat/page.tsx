"use client";

import { CopilotChat, useAgent, useThreads } from "@copilotkit/react-core/v2";
import { useEffect, useReducer, useState } from "react";

import { DemoFrame } from "@/components/demo-frame";
import { ThreadsProvider } from "@/components/threads-provider";

/**
 * The doc's four steps, built as one screen: a hand-rolled `ThreadSidebar` on
 * `useThreads`, thread switching by passing `threadId` to `<CopilotChat>`, and
 * cursor pagination.
 *
 * No `CopilotChatConfigurationProvider` here on purpose — this is the path
 * where the host owns the active thread in its own state, which is the whole
 * difference from the drawer page.
 */

const AGENT_ID = "default";

/** `limit` is deliberately tiny so "Load more" is reachable with a handful of threads. */
const PAGE_SIZE = 5;

function ThreadSidebar({
  activeThreadId,
  onSelectThread,
}: {
  activeThreadId?: string;
  onSelectThread: (threadId: string | undefined) => void;
}) {
  const [includeArchived, setIncludeArchived] = useState(false);

  // [1] headless-threads: useThreads — list, mutate, paginate
  // [!code highlight]
  const {
    threads,
    isLoading,
    listError,
    renameThread,
    archiveThread,
    unarchiveThread,
    deleteThread,
    isMutating,
    hasMoreThreads,
    isFetchingMoreThreads,
    fetchMoreThreads,
    startNewThread,
  } = useThreads({ agentId: AGENT_ID, includeArchived, limit: PAGE_SIZE });

  // The doc's `if (isLoading) return <div>Loading...</div>` verbatim would
  // collapse this column to nothing and shove the chat left until the list
  // arrives. Same early return, but holding the sidebar's width so the layout
  // does not jump.
  if (isLoading) {
    return (
      <div className="w-72 shrink-0 border-r border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            // Clears our own selection; `startNewThread` resets the hook's
            // notion of the active thread. Nothing is persisted until the
            // first run, so no row appears yet.
            startNewThread();
            onSelectThread(undefined);
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:border-slate-400 dark:border-slate-600"
        >
          + New conversation
        </button>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Archived
        </label>
      </div>

      {listError && (
        <p className="border-b border-red-200 p-3 text-xs text-red-600 dark:border-red-900 dark:text-red-400">
          {listError.message}
        </p>
      )}

      <ul data-testid="thread-list" className="min-h-0 flex-1 overflow-y-auto">
        {threads.length === 0 && (
          <li className="p-3 text-xs text-slate-500">
            No conversations yet — send a message to create one.
          </li>
        )}

        {/* [2] headless-threads: rows with rename / archive / delete */}
        {/* [!code highlight] */}
        {threads.map((thread) => (
          <li
            key={thread.id}
            className={`border-b border-slate-100 p-2 dark:border-slate-800/60 ${
              thread.id === activeThreadId ? "bg-slate-100 dark:bg-slate-800" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectThread(thread.id)}
              className="block w-full truncate text-left text-sm"
            >
              {thread.name ?? "New conversation"}
              {thread.archived && (
                <span className="ml-1 text-[10px] uppercase opacity-50">archived</span>
              )}
            </button>

            <div className="mt-1 flex gap-2 text-[11px] text-slate-500">
              <button
                type="button"
                disabled={isMutating}
                onClick={() => {
                  const name = window.prompt("Rename thread", thread.name ?? "");
                  if (name) void renameThread(thread.id, name);
                }}
                className="hover:underline disabled:opacity-40"
              >
                Rename
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() =>
                  void (thread.archived
                    ? unarchiveThread(thread.id)
                    : archiveThread(thread.id))
                }
                className="hover:underline disabled:opacity-40"
              >
                {thread.archived ? "Unarchive" : "Archive"}
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() => {
                  // deleteThread is permanent and ships no confirmation of its
                  // own — the doc says to add one, so here it is.
                  if (!window.confirm("Delete this conversation permanently?")) return;
                  if (thread.id === activeThreadId) onSelectThread(undefined);
                  void deleteThread(thread.id);
                }}
                className="hover:underline disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* [3] headless-threads: cursor pagination */}
      {/* [!code highlight] */}
      {hasMoreThreads && (
        <button
          type="button"
          onClick={fetchMoreThreads}
          disabled={isFetchingMoreThreads}
          className="shrink-0 border-t border-slate-200 p-2 text-xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-900"
        >
          {isFetchingMoreThreads ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}

/**
 * [5] headless-threads: driving one agent per thread.
 *
 * The published snippet, verbatim:
 *
 *   const { agent } = useAgent({
 *     agentId: `chat-${threadId}`, // local id, unique per mounted thread
 *     runtimeAgentId: "default",   // the one runtime agent they all route to
 *     threadId,                    // the thread this instance is pinned to
 *   });
 *
 * `AGENT_ID` is "default", so the shipped call is the published one. Two of
 * these mount at once, which is the claim the section makes: a private proxied
 * agent per hook, and `agent.runAgent()` addressing that hook's thread.
 */
function ThreadAgentTab({ threadId, label }: { threadId: string; label: string }) {
  // [!code highlight]
  const { agent, isReady } = useAgent({
    agentId: `chat-${threadId}`, // local id, unique per mounted thread
    runtimeAgentId: AGENT_ID, // the one runtime agent they all route to
    threadId, // the thread this instance is pinned to
  });

  const [isRunning, setIsRunning] = useState(false);
  const [, repaint] = useReducer((n: number) => n + 1, 0);

  // Harness-side, not from the doc: the hook owns re-rendering for its own
  // consumers, but this panel reads `agent.messages` directly, so it subscribes
  // to repaint as the reply streams in.
  useEffect(() => {
    const subscription = agent.subscribe({ onMessagesChanged: () => repaint() });
    return () => subscription.unsubscribe();
  }, [agent]);

  const lastAssistant = [...agent.messages]
    .reverse()
    .find((message) => message.role === "assistant");

  return (
    <div className="min-w-0 flex-1 border-l border-slate-200 p-3 first:border-l-0 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
          {label}
        </p>
        <button
          type="button"
          data-testid="thread-agent-run"
          disabled={!isReady || isRunning}
          onClick={async () => {
            setIsRunning(true);
            try {
              agent.addMessage({
                id: crypto.randomUUID(),
                role: "user",
                content: "In one short line, what thread am I in?",
              });
              await agent.runAgent();
            } finally {
              setIsRunning(false);
            }
          }}
          className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium hover:border-slate-400 disabled:opacity-40 dark:border-slate-600"
        >
          {isRunning ? "Running..." : "Run this thread"}
        </button>
      </div>

      <p className="mt-0.5 truncate text-[10px] text-slate-400">
        agentId chat-{threadId.slice(0, 8)} → runtime {AGENT_ID} · {agent.messages.length}{" "}
        message(s)
      </p>

      <p
        data-testid="thread-agent-reply"
        className="mt-2 line-clamp-3 text-[11px] text-slate-600 dark:text-slate-400"
      >
        {typeof lastAssistant?.content === "string"
          ? lastAssistant.content
          : "No reply on this thread yet."}
      </p>
    </div>
  );
}

/** The two most recent threads, each mounted against its own pinned agent. */
function PerThreadAgents() {
  const { threads } = useThreads({ agentId: AGENT_ID, limit: PAGE_SIZE });
  const mounted = threads.slice(0, 2);

  return (
    <div
      data-testid="per-thread-agents"
      className="shrink-0 border-t border-slate-200 dark:border-slate-800"
    >
      <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800/60">
        One agent per thread
      </p>

      {mounted.length === 0 ? (
        <p className="p-3 text-[11px] text-slate-500">
          Send a message first — these panels mount against real threads.
        </p>
      ) : (
        <div className="flex">
          {mounted.map((thread) => (
            <ThreadAgentTab
              key={thread.id}
              threadId={thread.id}
              label={thread.name ?? "New conversation"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();

  return (
    <DemoFrame
      parentPath="/threads/headless"
      subtitle="useThreads + your own sidebar"
    >
      <ThreadsProvider>
        <div className="flex h-full">
          <ThreadSidebar
            activeThreadId={activeThreadId}
            onSelectThread={setActiveThreadId}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              {/*
                [4] headless-threads: switch threads by passing threadId
                [!code highlight]

                Keyed on the id so a fresh conversation remounts the chat rather
                than reusing the previous thread's view. Without a key, going from
                a selected thread back to undefined leaves the old transcript up,
                because an auto-minted id is memoized for the component's lifetime.
              */}
              <CopilotChat
                key={activeThreadId ?? "new"}
                agentId={AGENT_ID}
                threadId={activeThreadId}
              />
            </div>

            <PerThreadAgents />
          </div>
        </div>
      </ThreadsProvider>
    </DemoFrame>
  );
}
