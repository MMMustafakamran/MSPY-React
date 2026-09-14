import { RouteHeader } from "@/components/route-header";
import { SourceCode, SourceCodeGroup } from "@/components/source-code";
import { Callout, Panel, TryIt } from "@/components/ui";

export default function Page() {
  return (
    <>
      <RouteHeader path="/quickstart" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The bring-your-own-agent path. Three pieces: a FastAPI server that
          exposes an Agent Framework agent over AG-UI, a runtime route that
          binds it, and a chat component. Everything else in this harness is a
          variation on these.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Worth noting how thin the binding is:{" "}
          <code>add_agent_framework_fastapi_endpoint</code> on the Python side
          and a plain <code>HttpAgent</code> on the runtime side. Agent Framework
          speaks AG-UI natively, so there is no framework-specific adapter
          package to install — unlike integrations that ship their own.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={["Can you tell me a joke?", "Can you help me understand AI?"]}
            expect="Tokens stream in a word at a time and the reply renders as markdown."
            fail="Nothing streams, or an error appears — the agent process is probably down. Check the connection panel on the home page."
          />
        </div>
      </Panel>

      <Panel title="The demo">
        <SourceCode file="frontend/src/app/quickstart/demo-chat/page.tsx" />
      </Panel>

      <Panel
        title="The two files that make it work"
        description="Read from this repo, so they can be diffed against the doc's samples directly."
      >
        <SourceCodeGroup
          files={[
            { file: "frontend/src/app/api/copilotkit/[[...slug]]/route.ts" },
            { file: "backend/main.py" },
          ]}
          note={
            <>
              The runtime registers three agent ids rather than the doc&apos;s
              one, and the server mounts three endpoints rather than one. That is
              the only structural departure, and it exists because the Shared
              State and State Rendering pages each define their own{" "}
              <code>state_schema</code>.
            </>
          }
        />
      </Panel>

      <Panel title="The agent and its chat client">
        <SourceCodeGroup
          files={[
            { file: "backend/agents.py", region: "get-weather" },
            { file: "backend/chat_client.py" },
          ]}
        />
      </Panel>

      <Callout tone="info" title="The doc's runtime snippet now wires Intelligence">
        The Quickstart&apos;s runtime sample replaced{" "}
        <code>runner: new InMemoryAgentRunner()</code> with{" "}
        <code>intelligence: new CopilotKitIntelligence(&#123; apiKey &#125;)</code>{" "}
        plus <code>identifyUser</code>, and reads{" "}
        <code>CPK_INTELLIGENCE_API_KEY</code> from <code>.env.local</code> —
        renamed this sync from <code>INTELLIGENCE_API_KEY</code>, with the
        placeholder going from <code>your_license_key</code> to{" "}
        <code>cpk-...</code>, which is the first time the page separates the
        project key from a license. The same
        step&apos;s callout documents dropping both options to fall back to SSE
        mode with an in-memory runner — that is what{" "}
        <code>/api/copilotkit</code> here does, so Threads and the Inspector stay
        locked on this route. The Intelligence-wired version lives on{" "}
        <code>/api/copilotkit-threads</code>, used by the{" "}
        <a href="/threads" className="underline">
          Rich Threads
        </a>{" "}
        pages.
      </Callout>

      <Callout tone="info" title="Why runtimeUrl can be relative">
        <code>/api/copilotkit</code> resolves because Next.js serves both the app
        and the runtime from one origin, which is the arrangement the doc&apos;s
        provider callout describes. A client-only frontend would need a
        standalone runtime server and an absolute URL instead.
      </Callout>

      <Callout tone="warn" title="Model id in the docs">
        The Quickstart&apos;s env block sets{" "}
        <code>OPENAI_CHAT_MODEL_ID=gpt-5.6-luna</code> while the Python code
        directly beneath it defaults to <code>gpt-5.6-luna</code>. This repo keeps
        the code&apos;s default and lets <code>OPENAI_CHAT_MODEL_ID</code>{" "}
        override it.
      </Callout>
    </>
  );
}
