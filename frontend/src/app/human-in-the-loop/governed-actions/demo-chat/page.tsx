"use client";

import { CopilotChat, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { useEffect } from "react";
import { z } from "zod";

import { DemoFrame } from "@/components/demo-frame";

/**
 * Governed Action Approval UI — the page's tool-call variant.
 *
 * The guide publishes two patterns. This is `useHumanInTheLoop`, the one that
 * works against any agent. The `useInterrupt` variant needs a backend that can
 * pause a run and attach `interrupt.metadata.action`, which no agent in this
 * repo does — see the route page.
 *
 * The page is byte-identical under all five framework prefixes, so this is the
 * same implementation Agno-react and Mastra-react carry, with the one
 * translation each repo's zod version forces.
 */

// [1] governed actions: the action envelope
// [!code highlight]
type GovernedAction = {
  id: string;
  summary: string;
  tool: string;
  reference: string;
  verdict: "allow" | "deny" | "require_approval";
  arguments: Record<string, unknown>;
};

const governedActionSchema = z.object({
  id: z.string(),
  summary: z.string(),
  tool: z.string(),
  reference: z.string(),
  verdict: z.enum(["allow", "deny", "require_approval"]),
  // Published as `z.record(z.unknown())`. That is a zod 3 signature; this
  // repo is on zod 4.4.3, where `z.record` requires both a key and a value
  // schema — the single-argument form is TS2554. Translated rather than
  // left failing. Same finding as Agno-react.
  arguments: z.record(z.string(), z.unknown()),
});

// [2] governed actions: the approval card
// [!code highlight]
function GovernedActionCard({
  action,
  onApprove,
  onReject,
  onBlock,
}: {
  action: GovernedAction;
  onApprove: () => void;
  onReject: () => void;
  onBlock: () => void;
}) {
  // Published with this dependency array. `onApprove` and `onBlock` are called
  // and neither is listed. Kept verbatim, warning and all: the omission is the
  // finding, and silencing it would hide what a reader copying this page gets.
  useEffect(() => {
    if (action.verdict === "allow") onApprove();
    if (action.verdict === "deny") onBlock();
  }, [action.id, action.verdict]);

  const status =
    action.verdict === "allow"
      ? "Allowed by policy"
      : action.verdict === "deny"
        ? "Blocked by policy"
        : "User approval required";

  return (
    <section className="my-2 rounded-lg border border-slate-200 p-4 shadow-sm dark:border-slate-700">
      <div className="space-y-1">
        <p className="text-sm font-medium">{status}</p>
        <h3 className="text-base font-semibold">{action.summary}</h3>
        <p className="text-sm text-slate-500">Tool: {action.tool}</p>
        <p className="text-sm text-slate-500">Reference: {action.reference}</p>
      </div>

      <pre className="mt-3 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
        {JSON.stringify(action.arguments, null, 2)}
      </pre>

      {action.verdict === "require_approval" && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Approve and run
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-600"
          >
            Reject
          </button>
        </div>
      )}
    </section>
  );
}

export default function Page() {
  // The generic is supplied explicitly: this hook does not infer its arg type
  // from `parameters`, it defaults to `Record<string, unknown>`, which makes
  // every `args.` access unusable in JSX.
  // [3] governed actions: register the approval tool
  // [!code highlight]
  useHumanInTheLoop<GovernedAction>({
    name: "approve_governed_action",
    description:
      "Ask the user to approve a governed side-effect action before it runs.",
    parameters: governedActionSchema,
    render: ({ args, status, respond }) => {
      if (status !== "executing" || !respond) {
        return <></>;
      }

      return (
        <GovernedActionCard
          action={args}
          onApprove={() =>
            respond({
              approved: true,
              actionId: args.id,
              reference: args.reference,
            })
          }
          onReject={() =>
            respond({
              approved: false,
              actionId: args.id,
              reference: args.reference,
            })
          }
          onBlock={() =>
            respond({
              approved: false,
              actionId: args.id,
              reference: args.reference,
            })
          }
        />
      );
    },
  });

  return (
    <DemoFrame
      parentPath="/human-in-the-loop/governed-actions"
      subtitle="approve_governed_action — the run waits on your verdict"
    >
      <CopilotChat
        agentId="my_agent"
        labels={{
          welcomeMessageText:
            'Try "Send an invoice reminder to acme@example.com — ask me to approve it first."',
        }}
      />
    </DemoFrame>
  );
}
