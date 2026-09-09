"use client";

import { CopilotChat, CopilotKitProvider } from "@copilotkit/react-core/v2";

import { DemoFrame } from "@/components/demo-frame";

import { catalog } from "../a2ui/catalog";

const AGENT_ID = "a2ui_agent";

/**
 * The one page in this harness with a provider of its own.
 *
 * `components/providers.tsx` says pages should not mount a second
 * `CopilotKitProvider`, and that rule holds for conversation state — which is
 * what it is about. A catalog is not conversation state: `a2ui={{ catalog }}`
 * registers a component vocabulary on the provider, and putting the flight
 * catalog on the root one would hand it to every other route in the app.
 *
 * The matching half is on the runtime, which scopes the A2UI middleware to this
 * agent and sets `injectA2UITool: false` — `display_flight` returns the
 * operations container itself, so the agent must not also be handed a
 * `render_a2ui` tool to generate one with. The middleware still watches the
 * stream and paints whatever valid container it finds.
 */
export default function Page() {
  return (
    <DemoFrame
      parentPath="/generative-ui/a2ui/fixed-schema"
      subtitle="Fixed schema — the tool ships data, the JSON ships the tree"
    >
      {/* [1] fixed schema a2ui: registering the catalog */}
      {/* [!code highlight] */}
      <CopilotKitProvider runtimeUrl="/api/copilotkit" a2ui={{ catalog }}>
        <CopilotChat
          agentId={AGENT_ID}
          labels={{
            welcomeMessageText:
              'Try "Find me one flight from JFK to LHR" — the reply is a rendered surface, not text.',
          }}
        />
      </CopilotKitProvider>
    </DemoFrame>
  );
}
