import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, CodeBlock, Panel, TryIt } from "@/components/ui";

// "Trim an agent you construct yourself", verbatim. Quoted, not mounted: the
// agent URL is a placeholder and `YourApp` is never defined.
const SELF_MANAGED_SNIPPET = `import { HttpAgent } from "@ag-ui/client";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { lastTurnOnly, TrimHistoryMiddleware } from "./trim-history";

const supportAgent = new HttpAgent({ url: "https://agents.example.com/support" });
supportAgent.use(new TrimHistoryMiddleware(lastTurnOnly));

<CopilotKit selfManagedAgents={{ "support-agent": supportAgent }}>
  <YourApp />
</CopilotKit>;`;

const DIR = "frontend/src/app/api/copilotkit-trimmed/[[...slug]]";

export default function Page() {
  return (
    <>
      <RouteHeader path="/backend/message-history" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          CopilotKit forwards the whole transcript on every run. For an agent
          that stores its own history that is a second copy, and the page shows
          three ways to forward less: a <code>messageFilter</code> prop on the
          provider, an AG-UI middleware attached inside the runtime, and the same
          middleware on an agent you construct yourself.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={["My name is Sam.", "What is my name?"]}
            expect="Both tabs answer the first prompt. On the second, the Runtime middleware tab should not know the name. Observed 2026-09-22 against this backend: sent the whole transcript, the Microsoft Agent Framework endpoint answered Sam; sent the last turn alone (through /api/copilotkit-trimmed, or as a second run of the same thread) it answered UNKNOWN. It keeps no history of its own here, so the trimmed tab forgets. messageFilter is a real prop from @copilotkit/react-core 1.73.3, so the Browser tab is expected to forget too; not re-observed since the upgrade."
            fail="The Runtime middleware tab errors or never answers: /api/copilotkit-trimmed could not reach the agent at AGENT_URL. Or the Browser tab still knows the name: at 1.73.3 that would mean the declared messageFilter prop does not take effect."
          />
        </div>
      </Panel>

      <Callout tone="warn" title="messageFilter: resolved at 1.73.3, failed at 1.69.2, no minimum version stated">
        The page&apos;s first and recommended recipe,{" "}
        <code>messageFilter=&#123;(messages) =&gt; messages.slice(-1)&#125;</code>{" "}
        on <code>&lt;CopilotKit&gt;</code>, was not a prop on{" "}
        <code>@copilotkit/react-core</code> 1.69.2 (declared{" "}
        <code>^1.69.2</code>) or 1.73.0: a type error, and at runtime an ignored
        prop. At 1.73.3 (declared <code>^1.73.3</code>) it is declared on{" "}
        <code>CopilotKitProps</code> with the page&apos;s own example in its
        JSDoc, and the demo&apos;s <code>@ts-expect-error</code> went unused,
        which is how this was caught; the directive is gone and the line is
        unchanged. The page names no minimum version, so a reader on an older
        release still gets the silent no-op. The demo also adds{" "}
        <code>agentId=&quot;my_agent&quot;</code> to that tab&apos;s chat, marked:
        the main runtime registers no <code>default</code> agent.
      </Callout>

      <Callout tone="info" title="The middleware works as published">
        <code>trim-history.ts</code> compiles on <code>@ag-ui/client</code>{" "}
        0.0.57 (and again on 0.0.59 after the 1.73.3 upgrade) and the page&apos;s own check passes (
        <code>trim-history: forwarded only the answered call, next to its result</code>
        ). Two gaps around it. The runtime snippet reads{" "}
        <code>process.env.AGENT_URL!</code>, which the page never defines; the
        route supplies it, marked, defaulting to the Quickstart agent at{" "}
        <code>MS_AGENT_URL</code> + <code>/</code>. And the check script&apos;s line{" "}
        <code>answers.add(trimmedParallel[i].toolCallId)</code> is a TS2339 error
        as published, because the loop condition does not narrow the element it
        reads again. It runs; it does not typecheck.
      </Callout>

      <Callout tone="warn" title="On this backend, Microsoft Agent Framework kept no history">
        The page names &quot;a Microsoft Agent Framework chat-history
        provider&quot; among the backends that store their own history. This
        backend configures none, and its AG-UI endpoint (
        <code>agent-framework-ag-ui</code> 1.1.0, <code>agent-framework-core</code>{" "}
        1.14.0) answered from the messages of the run alone. Observed
        2026-09-22, sent <em>My name is Sam. Just say ok.</em>, <em>Ok.</em>,{" "}
        <em>What is my name? If you do not know, say UNKNOWN.</em> in one run:
        directly, and through the untrimmed main runtime, it answered{" "}
        <code>Sam</code>; through <code>/api/copilotkit-trimmed</code> it
        answered <code>UNKNOWN</code>. On one thread, a first run with only the
        first message answered <code>Ok</code>, and a second run with all three
        answered <code>Sam</code>; a second run carrying only the last question
        answered <code>UNKNOWN</code>. So here there is no second copy, and the
        middleware does exactly what the page warns about for a stateless
        agent: it erases the agent&apos;s memory of the thread. The page does
        not say what makes a Microsoft Agent Framework agent keep history.
      </Callout>

      <Panel title="The demo">
        <SourceCode file="frontend/src/app/backend/message-history/demo-chat/page.tsx" />
      </Panel>

      <Panel title="Trim inside the runtime" description="The page's route, mounted at /api/copilotkit-trimmed.">
        <SourceCode file={`${DIR}/route.ts`} />
      </Panel>

      <Panel title="Write a filter for middleware" description="trim-history.ts, verbatim.">
        <SourceCode file={`${DIR}/trim-history.ts`} />
      </Panel>

      <Panel
        title="Trim an agent you construct yourself"
        description="Quoted, not mounted. selfManagedAgents is Enterprise plan."
      >
        <CodeBlock filename="app/page.tsx" language="tsx" code={SELF_MANAGED_SNIPPET} />
      </Panel>
    </>
  );
}
