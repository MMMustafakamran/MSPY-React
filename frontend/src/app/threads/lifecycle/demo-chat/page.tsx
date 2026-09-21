"use client";

import {
  CopilotChat,
  CopilotChatConfigurationProvider,
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { DemoFrame } from "@/components/demo-frame";

/**
 * The thread lifecycle, one observable step at a time.
 *
 * Every readout here is the chat's real resolved state, not a guess: the chat
 * sits inside a `CopilotChatConfigurationProvider`, `<CopilotChat>` inherits
 * the provider's `threadId`, and the panel reads that same provider with
 * `useCopilotChatConfiguration()`. An earlier version read `agent.threadId` off
 * a separate `useAgent` hook, which is a mutable property rather than React
 * state and so never repainted when the chat minted or switched a thread.
 *
 * The buttons map one to one onto the page's claims:
 *
 *   Remount       a new React key re-mints an auto id and starts a new chat
 *   Open ...      setActiveThreadId(id, { explicit: true }) replays history
 *   New chat      startNewThread() mints a fresh, non-explicit id
 *   Pin / Unpin   an authoritative `threadId` prop; both setters then no-op
 *
 * History replays through `/api/copilotkit`, whose runtime runs on
 * `InMemoryAgentRunner`: its `connect()` replays a thread's compacted events,
 * which is the "persisting AgentRunner" case the page names, scoped to the life
 * of the runtime process. An earlier version sat under `ThreadsProvider`, the
 * Intelligence-backed `/api/copilotkit-threads`, and listed "known
 * conversations" from `useThreads`. With no entitlement that list is empty, so
 * the one button that tests hydration had nothing to click and the recorder
 * logged "No known conversations listed" and passed.
 */

const AGENT_ID = "default";

/** One thread the chat has been on, in the order they first appeared. */
interface SeenThread {
  id: string;
  explicit: boolean;
  messages: number;
}

/**
 * The setters' "Ignoring ..." warnings, surfaced on screen.
 *
 * The page's claim is that both setters "no-op and log a warning" while the id
 * is prop-controlled. A no-op is invisible by definition, so the warning is the
 * only evidence there is; without this it would live only in the devtools
 * console and the clip would show a button that did nothing, for no stated
 * reason.
 */
function useCopilotKitWarnings(): string | null {
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    const original = console.warn;
    console.warn = (...args: unknown[]) => {
      const text = args.map(String).join(" ");
      if (text.startsWith("[CopilotKit] Ignoring")) setLast(text);
      original.apply(console, args);
    };
    return () => {
      console.warn = original;
    };
  }, []);
  return last;
}

/*
 * Published as:
 *
 *   function ThreadControls() {
 *     const config = useCopilotChatConfiguration();
 *     ...
 *     <button onClick={() => config?.setActiveThreadId(existingId, { explicit: true })}>
 *     <button onClick={() => config?.startNewThread()}>New chat</button>
 *
 * `existingId` is never defined on the page, so it arrives here as a prop, with
 * `!` because the button stays disabled until one exists. Both handler calls
 * are otherwise the page's text. Recorded in README section 9.
 */
// [1] threads-lifecycle: switch or start a thread, as published
// [!code highlight]
function ThreadControls({ existingId }: { existingId: string | undefined }) {
  const config = useCopilotChatConfiguration();

  return (
    <>
      {/* Restore a known conversation (explicit → replays history) */}
      <button
        type="button"
        data-testid="open-conversation"
        disabled={!existingId}
        onClick={() => config?.setActiveThreadId(existingId!, { explicit: true })}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-slate-600"
      >
        Open conversation
      </button>

      {/* Start a fresh, empty conversation (mints a new non-explicit id) */}
      <button
        type="button"
        data-testid="new-chat"
        onClick={() => config?.startNewThread()}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
      >
        New chat
      </button>
    </>
  );
}

function Readout({
  onSeen,
  pinned,
}: {
  onSeen: (thread: SeenThread) => void;
  pinned: string | undefined;
}) {
  const config = useCopilotChatConfiguration();
  // [2] threads-lifecycle: manual hydration reads the agent's messages
  // [!code highlight]
  const { agent } = useAgent({ agentId: AGENT_ID });
  const messages = agent.messages;

  const threadId = config?.threadId;
  const explicit = config?.hasExplicitThreadId ?? false;

  // An auto id is a `randomUUID()` taken during render, so the server pass and
  // the client mint different ones. Printing it before hydration is a mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (threadId) onSeen({ id: threadId, explicit, messages: messages.length });
  }, [threadId, explicit, messages.length, onSeen]);

  return (
    <dl className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-4 gap-y-1 text-xs">
      <dt className="text-slate-500">Active threadId</dt>
      <dd className="break-all">
        <code data-testid="active-thread-id">{mounted ? (threadId ?? "") : ""}</code>
      </dd>
      <dt className="text-slate-500">hasExplicitThreadId</dt>
      <dd>
        <code data-testid="thread-explicit">{String(explicit)}</code>
      </dd>
      <dt className="text-slate-500">threadId prop</dt>
      <dd className="break-all">
        <code data-testid="thread-pinned">{pinned ?? "none (setters are in control)"}</code>
      </dd>
      <dt className="text-slate-500">agent.messages</dt>
      <dd>
        <code data-testid="message-count">{messages.length}</code>
      </dd>
    </dl>
  );
}

export default function Page() {
  const [mountKey, setMountKey] = useState(0);
  const [pinned, setPinned] = useState<string | undefined>();
  const [seen, setSeen] = useState<SeenThread[]>([]);
  const warning = useCopilotKitWarnings();

  // The ledger lives above the keyed provider so a remount cannot erase it: it
  // is the before-and-after that makes a re-minted id readable on camera.
  const onSeen = useCallback((thread: SeenThread) => {
    setSeen((prev) => {
      const i = prev.findIndex((t) => t.id === thread.id);
      if (i === -1) return [...prev, thread];
      const next = [...prev];
      next[i] = {
        ...next[i],
        explicit: thread.explicit,
        messages: Math.max(next[i].messages, thread.messages),
      };
      return next;
    });
  }, []);

  // The snippet's `existingId` is never defined on the page. Here it is the
  // first thread that held a conversation: the one worth coming back to.
  const existingId = seen.find((t) => t.messages > 0)?.id;

  return (
    <DemoFrame
      parentPath="/threads/lifecycle"
      subtitle="mint → run → remount → hydrate → start new → pin"
    >
      <CopilotChatConfigurationProvider key={mountKey} agentId={AGENT_ID} threadId={pinned}>
        <div className="flex h-full flex-col">
          <div className="shrink-0 space-y-3 border-b border-slate-200 p-3 dark:border-slate-800">
            <Readout onSeen={onSeen} pinned={pinned} />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="remount"
                onClick={() => setMountKey((k) => k + 1)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
              >
                Remount chat (new key)
              </button>
              <ThreadControls existingId={existingId} />
              {pinned ? (
                <button
                  type="button"
                  data-testid="unpin"
                  onClick={() => setPinned(undefined)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
                >
                  Unpin threadId prop
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="pin"
                  onClick={() => setPinned(crypto.randomUUID())}
                  className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
                >
                  Pin a threadId prop
                </button>
              )}
            </div>

            <div className="text-xs">
              <p className="text-slate-500">Threads this chat has been on</p>
              <ol data-testid="thread-ledger" className="mt-1 space-y-0.5 font-mono text-[11px]">
                {seen.map((t, i) => (
                  <li key={t.id} data-thread-id={t.id} className="break-all">
                    {String.fromCharCode(65 + i)} · {t.id.slice(0, 8)} ·{" "}
                    {t.explicit ? "explicit" : "auto-minted"} · {t.messages} msg
                  </li>
                ))}
              </ol>
            </div>

            <p
              data-testid="setter-warning"
              className="min-h-4 text-xs text-amber-600 dark:text-amber-400"
            >
              {warning ?? ""}
            </p>
          </div>

          <div className="min-h-0 flex-1">
            <CopilotChat />
          </div>
        </div>
      </CopilotChatConfigurationProvider>
    </DemoFrame>
  );
}
