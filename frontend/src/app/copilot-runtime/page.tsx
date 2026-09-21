import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, CodeBlock, Panel, TryIt } from "@/components/ui";

const DIRECT_SNIPPET = `import { HttpAgent } from "@ag-ui/client";

const myAgent = new HttpAgent({ url: "http://localhost:8000/" });

<CopilotKitProvider agents__unsafe_dev_only={{ "my-agent": myAgent }}>
  <YourApp />
</CopilotKitProvider>`;

/** The new section's two snippets, as published. */
const KEY_SNIPPET = `const runtime = new CopilotRuntime({
  agents: {
    // \`my_agent\` is the key — the one string the frontend may ask for.
    my_agent: new HttpAgent({ url: "http://localhost:8000/" }),
  },
});`;

const PROVIDER_SNIPPET = `<CopilotKit runtimeUrl="/api/copilotkit" agent="my_agent" useSingleEndpoint={false}>
  <YourApp />
</CopilotKit>`;

const COMPARISON: [string, string, string][] = [
  ["Authentication", "Safe defaults provided", "You manage it"],
  ["AG-UI middleware", "Runs server-side", "Not available"],
  ["Agent routing", "Automatic", "Manual"],
  ["Ecosystem features", "Full support", "Limited"],
  ["Support", "Supported", "Not supported"],
  ["Setup", "Needs a backend endpoint", "Frontend only"],
];

export default function Page() {
  return (
    <>
      <RouteHeader path="/copilot-runtime" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The runtime is the server-side bridge between the app and the agents.
          It resolves agents by id, keeps credentials and middleware on the
          server, and re-encodes agent output as SSE for the browser.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Because Agent Framework speaks AG-UI natively, each binding is a plain{" "}
          <code>HttpAgent</code> pointed at an endpoint — there is no
          framework-specific adapter package involved.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={["Hello"]}
            expect="All three ids stream a reply. Switching ids starts a separate conversation, because each agent id carries its own message list."
            fail="One id errors with an agent-not-found style message — it is missing from the runtime's agents map, or its endpoint is not mounted."
          />
        </div>
      </Panel>

      <Panel
        title="This repo's runtime"
        description="Read from disk — diff it against the doc's single-agent sample."
      >
        <SourceCode file="frontend/src/app/api/copilotkit/[[...slug]]/route.ts" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          <code>InMemoryAgentRunner</code> is used with{" "}
          <code>createCopilotRuntimeHandler</code> in v2 because the agents call
          the model themselves over AG-UI.
        </p>
      </Panel>

      <Panel
        title="Which name identifies an agent"
        description="Added by the 2026-09-21 sync: the key in the agents map is the only name the frontend can ask for."
      >
        <CodeBlock
          filename="app/api/copilotkit/[[...slug]]/route.ts"
          language="ts"
          code={KEY_SNIPPET}
        />
        <CodeBlock
          filename="app/providers.tsx"
          language="tsx"
          code={PROVIDER_SNIPPET}
        />
        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          This repo is the case the section describes.{" "}
          <code>backend/agents.py</code> builds the quickstart agent as{" "}
          <code>Agent(name=&quot;MyAgent&quot;)</code>, the runtime registers it
          under <code>my_agent</code>, and only <code>my_agent</code> resolves.
          The demo runs both halves of the section against the live runtime: the{" "}
          <code>GET /api/copilotkit/info</code> readout the section ends on, and
          a hook that asks for the declared name instead of the key.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The provider snippet is quoted rather than shipped. It sets the agent
          once on <code>&lt;CopilotKit&gt;</code>; this harness serves five ids
          from one <code>&lt;CopilotKitProvider&gt;</code>, so every route names
          the one it wants, exactly as the Quickstart demo already does.
        </p>
        <div className="mt-4">
          <Callout tone="warn" title="The error it names is not the error you get">
            The section&apos;s callout says asking for an unregistered name
            raises <code>CopilotKitAgentDiscoveryError</code>. At{" "}
            <code>@copilotkit/react-core</code> 1.69.2 that class is not exported
            from <code>@copilotkit/react-core/v2</code> at all (importing it is
            TS2305), and <code>useAgent</code> throws a plain{" "}
            <code>Error</code> reading{" "}
            <code>
              useAgent: Agent &apos;X&apos; not found after runtime sync
            </code>
            . The class does exist in the v1 surface, where{" "}
            <code>useCoAgentStateRender</code> raises it as a banner. The second
            half of the callout holds either way: the message lists the keys the
            runtime returned.
          </Callout>
        </div>
      </Panel>

      <Panel title="The demo page">
        <SourceCode file="frontend/src/app/copilot-runtime/demo-chat/page.tsx" />
      </Panel>

      <Panel
        title="Why not connect the browser straight to the agent?"
        description="AG-UI is an open protocol, so a direct connection is possible — with real losses."
      >
        <CodeBlock filename="Direct connection (dev only)" language="tsx" code={DIRECT_SNIPPET} />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                <th className="pb-2 pr-4 font-medium" />
                <th className="pb-2 pr-4 font-medium">With runtime</th>
                <th className="pb-2 font-medium">Direct</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {COMPARISON.map(([label, withRt, direct]) => (
                <tr key={label}>
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-100">
                    {label}
                  </td>
                  <td className="py-2 pr-4 text-emerald-700 dark:text-emerald-400">
                    {withRt}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {direct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Callout tone="warn" title="Not implemented here on purpose">
            The prop is literally named <code>agents__unsafe_dev_only</code>. A
            direct connection would expose the agent endpoint to the browser and
            disable the server-side middleware other features depend on — including
            the bearer-token check on the Authentication route.
          </Callout>
        </div>
      </Panel>
    </>
  );
}
