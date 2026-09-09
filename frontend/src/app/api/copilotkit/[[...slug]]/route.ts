import {
  CopilotRuntime,
  InMemoryAgentRunner,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";

// The AG-UI server from `backend/main.py`. Microsoft Agent Framework speaks
// AG-UI directly, so the runtime binds a plain `HttpAgent` — there is no
// framework-specific adapter package to install.
const AGENT_URL = process.env.MS_AGENT_URL ?? "http://localhost:8000";

// Five agents, one per AG-UI endpoint. `my_agent` is the Quickstart agent;
// `sample_agent` and `search_agent` exist because Shared State and State
// Rendering each define their own `state_schema`, which is a property of the
// agent it is attached to and cannot be shared. `context_agent` was added when
// the Agent App Context page started publishing its own `ContextAwareAgent`
// subclass instead of reusing a plain one. `a2ui_agent` is the Fixed Schema
// A2UI page, which needs the A2UI middleware below and must not share it.
// The Quickstart's snippet wires `intelligence` + `identifyUser` here; this
// route deliberately takes the fallback that step documents (no Intelligence,
// in-memory runner). The wired version is in `api/copilotkit-threads`.
// [1] quickstart: runtime config
// [!code highlight]
const runtime = new CopilotRuntime({
  agents: {
    my_agent: new HttpAgent({ url: `${AGENT_URL}/` }),
    sample_agent: new HttpAgent({ url: `${AGENT_URL}/sample_agent` }),
    search_agent: new HttpAgent({ url: `${AGENT_URL}/search_agent` }),
    context_agent: new HttpAgent({ url: `${AGENT_URL}/context_agent` }),
    a2ui_agent: new HttpAgent({ url: `${AGENT_URL}/a2ui_agent` }),
  },
  runner: new InMemoryAgentRunner(),

  // Fixed Schema A2UI. Two deliberate narrowings of what the doc shows:
  //
  // `agents` scopes the middleware to the one agent that speaks A2UI. The doc's
  // sample is a bare `a2ui: true` on a runtime serving a single agent; this one
  // serves five, and enabling the middleware for all of them would put an A2UI
  // schema in the context of every page in the harness.
  //
  // `injectA2UITool: false` for the reason the fixed-schema page gives: the
  // agent owns `display_flight` and returns the operations container itself, so
  // it must not also be handed a `render_a2ui` tool to generate one with. The
  // middleware still watches the stream and paints any valid container it sees.
  // [3] fixed schema a2ui: runtime middleware
  // [!code highlight]
  a2ui: {
    agents: ["a2ui_agent"],
    injectA2UITool: false,
  },
});

// A Next.js catch-all route handler for the CopilotKit runtime requests.
// [2] copilot-runtime: request handler
// [!code highlight]
const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handler;
export const POST = handler;
