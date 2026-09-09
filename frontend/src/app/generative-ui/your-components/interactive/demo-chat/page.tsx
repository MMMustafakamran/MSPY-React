"use client";

import { CopilotChat, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { DemoFrame } from "@/components/demo-frame";

/**
 * A component the agent uses to *interact* with the user, not just to display.
 *
 * `useHumanInTheLoop` registers a tool with a `render` and no `handler`. The run
 * suspends on the tool call and stays suspended until `respond` is called — so
 * whatever the user clicks becomes the tool result the model reads next.
 *
 * Like every frontend tool here, it needs no backend declaration: CopilotKit
 * forwards it to the agent in the AG-UI run input.
 */
export default function Page() {
  // The generic is supplied explicitly. Unlike `useRenderTool`, this hook does
  // not infer its arg type from `parameters` — it defaults to
  // `Record<string, unknown>`, which makes `args.command` unknown and unusable
  // in JSX.
  // [1] interactive components: human approval
  // [!code highlight]
  useHumanInTheLoop<{ command: string }>({
    name: "humanApprovedCommand",
    description: "Ask human for approval to run a command.",
    parameters: z.object({
      command: z.string().describe("The command to run"),
    }),
    render: ({ args, respond, status }) => {
      if (status !== "executing") return <></>;
      return (
        <div className="my-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Approval required
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
            {args.command}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            {/* [2] interactive components: approve */}
            {/* [!code highlight] */}
            <button
              type="button"
              onClick={() => respond?.(`Tell the user the command ran`)}
              className="rounded-md px-3 py-1.5 rounded-md border border-white text-sm text-white font-medium"
            >
              Approve
            </button>
            {/* [3] interactive components: deny */}
            {/* [!code highlight] */}
            <button
              type="button"
              onClick={() => respond?.(`Tell the user the command wasn't run`)}
              className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-600"
            >
              Deny
            </button>
          </div>
        </div>
      );
    },
  });

  return (
    <DemoFrame
      parentPath="/generative-ui/your-components/interactive"
      subtitle="useHumanInTheLoop — the run waits for your click"
    >
      <CopilotChat
        agentId="my_agent"
        labels={{
          welcomeMessageText:
            'Try "Deploy the app by running npm run deploy, but check with me first" — nothing runs until you click.',
        }}
      />
    </DemoFrame>
  );
}
