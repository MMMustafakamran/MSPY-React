"use client";

import { CopilotChat, useAgent } from "@copilotkit/react-core/v2";
import { Component, type ReactNode, useEffect, useState } from "react";

import { DemoFrame } from "@/components/demo-frame";

/**
 * Agent routing: four registered ids, four AG-UI endpoints, one runtime.
 *
 * The frontend only ever names an id — it never learns where the agent lives.
 * Each id carries its own message list, so switching starts a fresh
 * conversation.
 *
 * The two probes below implement "Which name identifies an agent", the section
 * the 2026-09-21 sync added to the Copilot Runtime page.
 */

const AGENTS = [
  { id: "my_agent", blurb: "Quickstart agent · get_weather" },
  { id: "sample_agent", blurb: "language state · update_language" },
  { id: "search_agent", blurb: "searches state · update_searches" },
  { id: "context_agent", blurb: "app context · ContextAwareAgent" },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];

/**
 * The name `backend/agents.py` gives the quickstart agent: `Agent(name="MyAgent")`.
 *
 * The runtime registers it under the key `my_agent`, so this repo is the case
 * the new section describes: the agent's own name and its routing key differ,
 * and only the key is addressable.
 */
const DECLARED_AGENT_NAME = "MyAgent";

interface InfoResponse {
  agents?: Record<string, { name?: string; className?: string }>;
}

/**
 * The new section's closing instruction, run against this app's runtime: "To
 * read the registered keys directly, hit `GET {runtimeUrl}/info`. It returns the
 * agents the runtime advertises, under exactly the names the frontend must use."
 */
function RegisteredKeys() {
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/copilotkit/info")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body: InfoResponse) => live && setInfo(body))
      .catch((err: Error) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, []);

  const entries = Object.entries(info?.agents ?? {});

  return (
    <div className="shrink-0 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        GET /api/copilotkit/info · keys the frontend may ask for
      </h2>
      {error && (
        <p className="font-mono text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <ul data-testid="runtime-keys" className="flex flex-wrap gap-2">
        {entries.map(([key, agent]) => (
          <li
            key={key}
            className="rounded border border-slate-300 px-2 py-1 font-mono text-xs dark:border-slate-600"
          >
            {key}
            <span className="ml-2 text-slate-500">
              name: {agent.name ?? "n/a"} · class: {agent.className ?? "n/a"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">
        Every entry reports its map key back as <code>name</code>. The agent&apos;s
        own name, <code>{DECLARED_AGENT_NAME}</code> in{" "}
        <code>backend/agents.py</code>, is never advertised and cannot be asked
        for. <code>className</code> is the bundler&apos;s minified class name.
      </p>
    </div>
  );
}

/** Mounts a hook asking for a name the runtime never registered. */
function UnregisteredAgent() {
  const { agent } = useAgent({ agentId: DECLARED_AGENT_NAME });
  return (
    <p data-testid="unregistered-result" className="font-mono text-xs text-slate-500">
      resolved an agent: {String(Boolean(agent))}
    </p>
  );
}

/**
 * The failure is raised during render, so a boundary is the only way to show it
 * on the page instead of blanking the route.
 */
class ProbeBoundary extends Component<
  { children: ReactNode },
  { message: string | null; name: string | null }
> {
  state = { message: null as string | null, name: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message, name: error.name };
  }

  render() {
    if (this.state.message) {
      return (
        <div data-testid="unregistered-result" className="space-y-1">
          <p className="font-mono text-xs text-rose-600 dark:text-rose-400">
            {this.state.name}: {this.state.message}
          </p>
          <p className="text-[11px] text-slate-500">
            The page says this raises <code>CopilotKitAgentDiscoveryError</code>.
            Whatever is printed above is what @copilotkit/react-core 1.69.2
            actually raises.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * "Asking for a name the runtime did not register resolves no agent, and the
 * frontend raises `CopilotKitAgentDiscoveryError`. The error message lists the
 * keys the runtime actually returned."
 *
 * Mounted on demand rather than at load: the hook throws during render, and the
 * point of the probe is to show that happening rather than to break the chat
 * beside it.
 */
function UnregisteredNameProbe() {
  const [asking, setAsking] = useState(false);

  return (
    <div className="shrink-0 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="ask-unregistered"
          onClick={() => setAsking(true)}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"
        >
          useAgent({`{ agentId: "${DECLARED_AGENT_NAME}" }`})
        </button>
        <p className="text-xs text-slate-500">
          The declared name, not the registered key.
        </p>
      </div>
      {asking && (
        <div className="mt-2">
          <ProbeBoundary>
            <UnregisteredAgent />
          </ProbeBoundary>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  // [1] copilot runtime: agent routing
  // [!code highlight]
  const [agentId, setAgentId] = useState<AgentId>("my_agent");
  const active = AGENTS.find((a) => a.id === agentId)!;

  return (
    <DemoFrame parentPath="/copilot-runtime" subtitle={`routing to "${agentId}"`}>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAgentId(a.id)}
              className={`rounded-md border px-3 py-1.5 font-mono text-sm transition-colors ${
                agentId === a.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
              }`}
            >
              {a.id}
            </button>
          ))}
          <p className="text-xs text-slate-500">{active.blurb}</p>
        </div>

        <RegisteredKeys />
        <UnregisteredNameProbe />

        <div className="min-h-0 flex-1">
          {/* [2] copilot runtime: chat agent */}
          {/* [!code highlight] */}
          <CopilotChat key={agentId} agentId={agentId} />
        </div>
      </div>
    </DemoFrame>
  );
}
