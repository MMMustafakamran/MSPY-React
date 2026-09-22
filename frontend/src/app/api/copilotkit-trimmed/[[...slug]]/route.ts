import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { lastTurnOnly, TrimHistoryMiddleware } from "./trim-history";

/**
 * Message history, "Trim inside the runtime": the page's route, mounted beside
 * the main runtime so trimming only ever applies to the demo that asks for it.
 *
 * `trim-history.ts` and `check-trim-history.ts` sit next to this file exactly
 * as published, so the page's `./trim-history` import is its own text.
 */

// NOT FROM THE PAGE. The snippet reads `process.env.AGENT_URL!` and the page
// never says what sets it. Here it defaults to the Quickstart agent's AG-UI
// endpoint (`path="/"` in backend/main.py), the one the main runtime registers
// as `my_agent`, so the published line below runs unchanged.
process.env.AGENT_URL ??= `${process.env.MS_AGENT_URL ?? "http://localhost:8000"}/`;

// [1] message-history: attach the middleware before registering the agent
// [!code highlight]
const agent = new HttpAgent({ url: process.env.AGENT_URL! });
agent.use(new TrimHistoryMiddleware(lastTurnOnly));

const runtime = new CopilotRuntime({
  agents: { default: agent },
});

// NOT FROM THE PAGE. The snippet stops at `runtime`; the handler is how every
// runtime in this app is served.
const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit-trimmed",
});

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
