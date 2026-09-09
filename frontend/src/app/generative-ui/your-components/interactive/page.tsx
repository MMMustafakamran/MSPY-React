import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, Panel, TryIt } from "@/components/ui";

export default function Page() {
  return (
    <>
      <RouteHeader path="/generative-ui/your-components/interactive" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The other half of &ldquo;your components&rdquo;: a component the agent
          uses to <em>ask</em> the user something, rather than only to show them
          something. Here that is an approval gate — the agent proposes a
          command, and nothing continues until you approve or deny it.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={[
              "Deploy the app for me by running npm run deploy, but check with me before it runs",
              "Run the command rm -rf /tmp/cache",
            ]}
            expect="An approval card renders in the message stream with the command in a code block, and nothing further streams until you click Approve or Deny. The agent's next message reflects which you chose."
            fail="The agent describes the command as plain text with no buttons, or continues without waiting — the tool name did not reach the agent."
          />
        </div>
      </Panel>

      <Panel
        title="How it differs from Display-only"
        description="Same registration shape, different completion signal."
      >
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <code>useComponent</code> registers a tool with a{" "}
          <code>render</code> and no handler, and the run carries straight on —
          it is a one-way draw. <code>useHumanInTheLoop</code> also has no
          handler, but its render props include <code>respond</code>, and the run
          stays suspended until you call it. The string you pass becomes the tool
          result the model reads next, which is why the agent&apos;s reply
          changes depending on the button.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The <code>status !== &quot;executing&quot;</code> guard matters:
          without it the card would also render while the tool call is still
          streaming in, and again after it resolves — so you would be shown an
          approval prompt for a decision already made.
        </p>
      </Panel>

      <Callout tone="info" title="No backend change is needed for this">
        Frontend tools are forwarded to the agent in the AG-UI run input, so the
        model can call <code>humanApprovedCommand</code> even though{" "}
        <code>backend/agents.py</code> never declares it — the same mechanism
        the Frontend Tools and Display-only routes rely on.
      </Callout>

      <Panel title="Source">
        <SourceCode file="frontend/src/app/generative-ui/your-components/interactive/demo-chat/page.tsx" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          The hook registration, the <code>status</code> guard, and both{" "}
          <code>respond?.()</code> strings are the doc&apos;s. Only the button
          and container styling is this repo&apos;s, so the card matches the rest
          of the harness.
        </p>
      </Panel>
    </>
  );
}
