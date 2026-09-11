"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The Intelligence Quickstart's step 5, as one line.
 *
 * The doc's acceptance test is not "the agent replied" — it is:
 *
 *   > Send one message to create a thread. Open **Threads** in Inspector. Your
 *   > new thread must appear in the list.
 *
 * A streamed reply proves the agent runs. It says nothing about whether
 * `CPK_INTELLIGENCE_API_KEY` is real, whether the runtime reached the hosted
 * project, or whether anything was persisted. Only reading a thread back out
 * of the store proves that, so that is what this strip does: it names the key
 * the server holds, counts the threads that key can see, and shows the newest
 * one by name.
 *
 * ── Why it reads through `/api/copilotkit-threads` ─────────────────────────
 * The chat beside it runs on `/api/copilotkit-single`, and single-route mode
 * answers `400 Unsupported method` for every `threads/*` method (see the notes
 * page). So the read-back cannot go through the endpoint under test. It goes
 * through the multi-route mount instead, which is built from the *same*
 * `createIntelligenceRuntime()` and therefore the same project key — the
 * transport differs, the store does not. A row appearing here means the thread
 * the single-route chat just created was written to that project and read back.
 *
 * ── Why plain `fetch` and not `useThreads` ────────────────────────────────
 * The first version of this strip wrapped itself in a second
 * `CopilotKitProvider` (the one the Rich Threads pages use) so it could call
 * `useThreads`. That silently broke the page it was measuring: with two
 * providers mounted, the chat stopped sending single-route envelopes and began
 * issuing REST run requests against `/api/copilotkit-single`, which has no REST
 * subtree — every reply 404'd and the take failed with the agent apparently
 * mute. Whatever the core shares between provider instances, a second one is
 * not free, and a component whose job is to observe this page must not change
 * how this page behaves. One GET to the thread route costs nothing and cannot
 * disturb the transport under test.
 *
 * ── What each state means ─────────────────────────────────────────────────
 *   "not connected"   the server has no key/license, or the store rejected it
 *   "connected · 0"   key present, store reachable, nothing stored yet
 *   "connected · N"   the count that must grow by one after a message
 */

type Status = {
  configured: boolean;
  hasKey: boolean;
  hasLicense: boolean;
  keyTail: string | null;
};

type Thread = { id: string; name?: string | null; updatedAt?: string };

/** The multi-route mount's thread list. `?agentId=` is required. */
const THREADS_URL = (agentId: string) =>
  `/api/copilotkit-threads/threads?agentId=${encodeURIComponent(agentId)}`;

/**
 * Threads are stored per agent id, so two counts are read, and they answer two
 * different questions.
 *
 * The chat's own agent is the ASSERTION: it must gain a thread when a message
 * goes through, and it is the number the recorder compares.
 *
 * `default` is the EVIDENCE. It is where every other page in this repo writes
 * (`useThreads` and the prebuilt drawer both fall back to it), so it already
 * holds real rows from earlier runs. Showing them proves the thing a green
 * "connected" badge cannot: that `CPK_INTELLIGENCE_API_KEY` reaches the hosted
 * project and reads back rows that exist. Without it, a key that authenticates
 * against an empty project looks identical to a key that works.
 */
const EVIDENCE_AGENT = "default";

export function IntelligenceStatus({ agentId }: { agentId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [stored, setStored] = useState<Thread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = async (id: string): Promise<Thread[]> => {
      const response = await fetch(THREADS_URL(id), { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const data = (await response.json()) as { threads?: Thread[] };
      return data.threads ?? [];
    };

    try {
      const [mine, evidence] = await Promise.all([
        list(agentId),
        list(EVIDENCE_AGENT),
      ]);
      setThreads(mine);
      setStored(evidence);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [agentId]);

  useEffect(() => {
    void fetch("/api/intelligence-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // The chat writes its thread server-side, after the reply has finished
  // streaming. Nothing tells this component when that happened, so it polls —
  // slowly, and only while the page is open. The recorder also clicks Reload,
  // which is the same call; the poll is here so a human watching the page sees
  // the count move without being told to press anything.
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  // The newest row the key can read, from either agent — the chat's own once
  // a run persists one, the existing store until then.
  const latest = threads?.[0] ?? stored?.[0];
  const connected = status?.configured === true && !error && threads !== null;

  return (
    <div
      data-testid="intelligence-status"
      data-connected={connected ? "true" : "false"}
      data-thread-count={threads === null ? "" : String(threads.length)}
      className="shrink-0 border-b border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={`inline-flex items-center gap-1.5 font-medium ${
            connected
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-rose-700 dark:text-rose-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          Intelligence: {connected ? "connected" : "not connected"}
        </span>

        <span className="text-slate-400">·</span>

        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {status?.hasKey
            ? `key …${status.keyTail}`
            : "CPK_INTELLIGENCE_API_KEY missing"}
        </span>

        <span className="text-slate-400">·</span>

        <span className="text-slate-700 dark:text-slate-300">
          {threads === null ? (
            "loading threads…"
          ) : (
            <>
              <span
                data-testid="thread-count"
                className="font-semibold tabular-nums"
              >
                {threads.length}
              </span>{" "}
              threads on <code>{agentId}</code>
            </>
          )}
        </span>

        <button
          type="button"
          data-testid="reload-threads"
          onClick={() => void load()}
          className="ml-auto rounded-md border border-slate-300 px-2 py-1 text-xs hover:border-slate-400 dark:border-slate-600"
        >
          Reload
        </button>
      </div>

      <p className="mt-1 truncate text-xs text-slate-500">
        {error ? (
          <span className="text-rose-600 dark:text-rose-400">
            Thread list failed: {error}
          </span>
        ) : latest ? (
          <>
            Key reads{" "}
            <span data-testid="stored-threads" className="font-semibold">
              {(stored?.length ?? 0) + (threads?.length ?? 0)}
            </span>{" "}
            threads back from the project · latest{" "}
            <span
              data-testid="latest-thread"
              className="text-slate-700 dark:text-slate-300"
            >
              &ldquo;{latest.name ?? "Untitled"}&rdquo;
            </span>
          </>
        ) : (
          "No threads stored yet — send a message to create one."
        )}
      </p>
    </div>
  );
}
