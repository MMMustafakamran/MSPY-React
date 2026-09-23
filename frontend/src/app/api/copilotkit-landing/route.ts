// [1] landing page: connect snippet
// [!code highlight]
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";

/**
 * The landing page's "connect" snippet, as published.
 *
 * As of the 2026-09-21 sync `/ms-agent-python` carries a runtime route of its
 * own, titled `app/api/copilotkit/route.ts`. It is a fourth mount rather than a
 * rewrite of `/api/copilotkit`: `quickstart` and `copilot-runtime` still publish
 * the `[[...slug]]` catch-all, and Next.js refuses a plain `route.ts` beside an
 * optional catch-all in the same folder, so the published path cannot exist in
 * this app next to the route those two pages need.
 *
 * One deviation, and it is the mount path only. Published:
 *
 *   const handler = createCopilotRuntimeHandler({
 *     runtime,
 *     basePath: "/api/copilotkit",
 *   });
 *
 * Shipped with `basePath: "/api/copilotkit-landing"` so the handler is judged
 * on the snippet rather than on a base path that does not match its URL.
 * Recorded in FINDINGS.md #15. Everything else is the page's text, including the
 * two things that do not work:
 *
 * `process.env.AGENT_URL!` is not set by any step on any tracked page. The
 * Quickstart hardcodes `"http://localhost:8000/"` and this repo's own variable
 * is `MS_AGENT_URL`. It is left unset here on purpose; the non-null assertion
 * silences the compiler and `new HttpAgent({ url: undefined })` constructs
 * without complaint, so nothing fails until a run is attempted.
 *
 * The file is a plain `route.ts`, not `[[...slug]]/route.ts`, while the handler
 * is the multi-route one (no `mode: "single-route"`). Next.js hands a plain
 * `route.ts` its exact path only, so `/info` and the agent run routes are never
 * delivered to the handler, and the one path that is delivered answers 404:
 * called in-process at @copilotkit/runtime 1.69.2, `GET` and `POST` on the bare
 * base path both return `{"error":"Not found"}`. The copilot-runtime page says
 * the same thing in its own words: the route "lives at a catch-all path" so the
 * runtime "can serve its sub-routes".
 *
 * No page in this harness points a provider at this mount. It exists so the
 * snippet is compiled and mounted as published instead of being described.
 */

const runtime = new CopilotRuntime({
  agents: {
    my_agent: new HttpAgent({ url: process.env.AGENT_URL! }),
  },
});

// Published as `basePath: "/api/copilotkit"`; see the note above.
const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit-landing",
});

export const GET = handler;
export const POST = handler;
