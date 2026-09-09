import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, Panel, TryIt } from "@/components/ui";

/**
 * The tool-call half of the Governed Action Approval UI page.
 *
 * The page is byte-identical under all five framework prefixes, so this is the
 * same implementation Agno-react and Mastra-react carry. It is built here
 * rather than cross-referenced so the recorder has a take in every repo and so
 * the zod-version difference between the repos is visible.
 */
export default function Page() {
  return (
    <>
      <RouteHeader path="/human-in-the-loop/governed-actions" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          A checkpoint in front of a side-effecting action. The agent proposes
          one — send an email, update a record, apply a discount — and the run
          stops on an approval card showing what it wants to do, which policy
          reference produced the verdict, and the exact arguments. It runs only
          if you approve.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The envelope is a plain <code>GovernedAction</code> object with a{" "}
          <code>verdict</code> of <code>allow</code>, <code>deny</code> or{" "}
          <code>require_approval</code>. Only the last one draws buttons; the
          other two resolve themselves from an effect.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={[
              "Send an invoice reminder to acme@example.com — ask me to approve it first",
              "Now try one that policy should block",
            ]}
            expect="An approval card appears in the chat and the run stops on it. Approving returns an approved response and the agent continues; rejecting returns a refusal and the agent picks another path."
            fail="The agent describes the action in prose and never calls the tool — the model chose not to route through the checkpoint, which is the weakness noted below."
          />
        </div>
      </Panel>

      <Callout tone="warn" title="The published schema does not compile on zod 4">
        The snippet writes <code>arguments: z.record(z.unknown())</code>. That is
        a zod 3 signature. This repo is on zod 4.4.3, where{" "}
        <code>z.record</code> requires both a key and a value schema, so the
        published form is <code>TS2554: Expected 2-3 arguments, but got 1</code>.
        Translated to <code>z.record(z.string(), z.unknown())</code> here. The
        page names no zod version anywhere, and CopilotKit ships zod 4 in its own
        peer range — so a reader on a current install hits this immediately.
      </Callout>

      <Callout tone="warn" title="The `useInterrupt` half is not implementable here">
        The page leads with a <code>useInterrupt</code> variant that reads{" "}
        <code>interrupt?.metadata?.action</code>. <code>Interrupt.metadata</code>{" "}
        is a real optional field on the AG-UI type, so the snippet is
        well-formed — but it needs a backend that pauses a run and attaches an
        action to it, and no agent in this repo does. The page does not say which
        backends can do this, or how the action gets into <code>metadata</code>
        in the first place; it shows only the consuming half. That is the gap,
        and it is why this route takes the tool-call variant instead.
      </Callout>

      <Callout tone="warn" title="Nothing enforces the guardrails the page lists">
        The page closes with five guardrails — check policy server-side, use a
        stable <code>id</code> and <code>reference</code> so an approval cannot
        be replayed, show the exact arguments, treat <code>deny</code> as
        terminal, log everything. Every one of them is prose. The code above
        implements none: <code>handleApproval</code> compares{" "}
        <code>actionId</code> and <code>reference</code>, but it is a standalone
        function the page never wires to anything, and the tool variant does not
        call it at all. Follow the snippets and you get an approval UI with no
        replay protection and no audit trail, while the page reads as though it
        covered both.
      </Callout>

      <Callout tone="warn" title="The verdict shortcut fires from an effect with a stale dep list">
        <code>GovernedActionCard</code> auto-approves on <code>allow</code> and
        auto-blocks on <code>deny</code> from a <code>useEffect</code> keyed on{" "}
        <code>[action.id, action.verdict]</code> — but the effect calls{" "}
        <code>onApprove</code> and <code>onBlock</code>, neither of which is in
        the dependency array. Linted verbatim,{" "}
        <code>react-hooks/exhaustive-deps</code> reports both as missing, and
        that warning is left standing here rather than silenced — the same call
        Agno-react and Mastra-react made. It happens to work because the handlers
        only close over <code>args</code>, which changes with the id, but it will
        not survive a reader wrapping those handlers in state.
      </Callout>

      <Panel title="Source">
        <SourceCode file="frontend/src/app/human-in-the-loop/governed-actions/demo-chat/page.tsx" />
      </Panel>
    </>
  );
}
