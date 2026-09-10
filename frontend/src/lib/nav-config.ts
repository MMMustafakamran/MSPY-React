/**
 * The nav, the route headers, and the README status table all read from here,
 * so a doc page and its implementation status are described exactly once.
 *
 * Route paths mirror the doc URLs under docs.copilotkit.ai/ms-agent-python.
 * `offNav: true` marks pages that resolve fine but are absent from that
 * sidebar as of DOC_SYNC_DATE.
 */

/**
 * There is exactly one doc-sync date in this repo, and it is not here: it is
 * `syncedAt` in `doc-snapshot/manifest.json`, written every time the sync
 * button runs. A hand-maintained date alongside it only ever drifted out of
 * agreement with the machine one, so it was removed — `/doc-sync` is the
 * single place that answers "how current are these docs".
 */
export const DOCS_ROOT = "https://docs.copilotkit.ai/ms-agent-python";

/**
 * Working  — implemented and exercisable against the local stack.
 * Partial  — implemented, but something outside this repo limits it.
 * Reference — intentionally not a live feature; doc/notes surface.
 * Broken   — implemented but currently failing.
 */
export type RouteStatus = "working" | "partial" | "reference" | "broken" | "not-started";

export interface RouteMeta {
  /** App route path. */
  path: string;
  /** Nav label. */
  title: string;
  /** Doc page this route tests, relative to docs.copilotkit.ai. */
  docPath: string;
  /** One-line description in our own words. */
  summary: string;
  status: RouteStatus;
  /** Shown in the route header when status is not plain "working". */
  statusNote?: string;
  /** Page exists in the docs but is absent from the current sidebar. */
  offNav?: boolean;
  /**
   * This route owns a live interactive surface, which lives at
   * `<path>/demo-chat` rather than on the page itself. The doc page keeps the
   * explanation and the source; the demo route is chrome-free so it can be
   * screen-recorded on its own.
   */
  hasDemo?: boolean;
}

/** Where a route's interactive demo lives, if it has one. */
export function demoPath(route: RouteMeta): string | undefined {
  if (!route.hasDemo) return undefined;
  return route.path === "/" ? "/demo-chat" : `${route.path}/demo-chat`;
}

export interface NavGroup {
  title: string;
  routes: RouteMeta[];
}

export const NAV: NavGroup[] = [
  {
    title: "Getting Started",
    routes: [
      {
        path: "/",
        title: "Introduction",
        docPath: "/ms-agent-python",
        summary:
          "What this harness covers and how the three processes fit together.",
        status: "reference",
        statusNote: "Landing page — orientation and live connection check.",
      },
      {
        path: "/quickstart",
        hasDemo: true,
        title: "Quickstart",
        docPath: "/ms-agent-python/quickstart?agent=bring-your-own",
        summary:
          "The bring-your-own-agent path: a FastAPI AG-UI server, a runtime route, and a chat.",
        status: "working",
      },
    ],
  },
  {
    title: "Basics",
    routes: [
      {
        path: "/prebuilt-components",
        hasDemo: true,
        title: "Prebuilt Components",
        docPath: "/ms-agent-python/prebuilt-components",
        summary:
          "CopilotChat, CopilotPopup, and CopilotSidebar side by side, each driving the same agent.",
        status: "working",
      },
    ],
  },
  {
    title: "Custom Look and Feel",
    routes: [
      {
        path: "/custom-look-and-feel/slots",
        hasDemo: true,
        title: "Slots",
        docPath: "/ms-agent-python/custom-look-and-feel/slots",
        summary:
          "Replacing chat sub-components at three levels: class strings, prop overrides, and whole components.",
        status: "working",
        offNav: true,
      },
      {
        path: "/custom-look-and-feel/headless-ui",
        hasDemo: true,
        title: "Headless UI",
        docPath: "/ms-agent-python/custom-look-and-feel/headless-ui",
        summary:
          "A chat interface built from scratch on the headless hooks, with no CopilotKit chrome.",
        status: "working",
        offNav: true,
      },
      {
        path: "/programmatic-control",
        hasDemo: true,
        title: "Programmatic Control",
        docPath: "/ms-agent-python/programmatic-control",
        summary:
          "Driving the agent with no chat UI: read state and messages, run it, and stop it mid-run.",
        status: "working",
      },
      {
        path: "/inspector",
        hasDemo: true,
        title: "Inspector",
        docPath: "/ms-agent-python/inspector",
        summary:
          "The built-in debugging overlay showing AG-UI events, agents, state, and registered tools.",
        status: "working",
      },
    ],
  },
  {
    title: "Generative UI",
    routes: [
      {
        path: "/generative-ui/your-components/display-only",
        hasDemo: true,
        title: "Your Components · Display-only",
        docPath: "/ms-agent-python/generative-ui/your-components/display-only",
        summary:
          "Registering a React component as a tool the agent can render in the chat, with no handler.",
        status: "working",
      },
      {
        path: "/generative-ui/your-components/interactive",
        hasDemo: true,
        title: "Your Components · Interactive",
        docPath: "/ms-agent-python/generative-ui/your-components/interactive",
        summary:
          "An approval gate built with useHumanInTheLoop — the run suspends until the user responds.",
        status: "working",
      },
      {
        path: "/generative-ui/tool-rendering",
        hasDemo: true,
        title: "Tool Rendering",
        docPath: "/ms-agent-python/generative-ui/tool-rendering",
        summary:
          "The agent's get_weather tool call rendered as a custom component, plus a catch-all renderer.",
        status: "working",
      },
      {
        path: "/generative-ui/state-rendering",
        hasDemo: true,
        title: "State Rendering",
        docPath: "/ms-agent-python/generative-ui/state-rendering",
        summary:
          "Streaming agent state to the UI: a searches list kept in sync through predict_state_config.",
        status: "working",
      },
      {
        path: "/generative-ui/a2ui/fixed-schema",
        hasDemo: true,
        title: "A2UI · Fixed Schema",
        docPath: "/ms-agent-python/generative-ui/a2ui/fixed-schema",
        summary:
          "A hand-authored component tree the agent never generates: display_flight ships only the data model.",
        status: "working",
      },
      {
        path: "/generative-ui/a2ui/styling",
        title: "A2UI · Styling",
        docPath: "/ms-agent-python/generative-ui/a2ui/styling",
        summary:
          "Theming A2UI surfaces through CSS custom properties scoped to the .a2ui-surface class.",
        status: "not-started",
        statusNote:
          "Tracked for drift only — no demo yet. Fixed Schema A2UI now gives the repo a surface, so this page has become implementable; the theming custom properties it documents are not wired up. DeepAgentspy-react implements the same page if a comparison is needed.",
      },
      {
        path: "/generative-ui/a2ui/advanced",
        title: "A2UI · Advanced",
        docPath: "/ms-agent-python/generative-ui/a2ui/advanced",
        summary:
          "Replacing the built-in render_a2ui progress indicator and wiring frontend action handlers.",
        status: "not-started",
        statusNote:
          "Tracked for drift only — no demo yet. It builds on Dynamic Schema A2UI, which this repo does not map — only the fixed-schema half. DeepAgentspy-react implements the same page.",
      },
      {
        path: "/generative-ui/frontend-cards",
        title: "Frontend Cards",
        docPath: "/ms-agent-python/generative-ui/frontend-cards",
        summary:
          "Insert a card into the chat transcript from frontend code without an agent tool call.",
        status: "not-started",
        statusNote: "Tracked for drift only — no demo yet.",
      },
    ],
  },
  {
    title: "App Control",
    routes: [
      {
        path: "/frontend-tools",
        hasDemo: true,
        title: "Frontend Tools",
        docPath: "/ms-agent-python/frontend-tools",
        summary:
          "A tool the agent calls that executes in the browser, forwarded automatically over AG-UI.",
        status: "working",
      },
      {
        path: "/webmcp",
        title: "WebMCP",
        docPath: "/ms-agent-python/webmcp",
        summary:
          "Publishing an existing frontend tool to document.modelContext so WebMCP-aware browser agents can discover and call it.",
        status: "not-started",
        statusNote:
          "Tracked for drift only — no demo yet. The page’s own verification steps need Chrome 149+ with the WebMCP origin trial or chrome://flags/#enable-webmcp-testing, and CopilotKit no-ops wherever document.modelContext is absent, so there is nothing a headless Chromium run can show.",
      },
      {
        path: "/human-in-the-loop/governed-actions",
        title: "Governed Actions",
        docPath: "/ms-agent-python/human-in-the-loop/governed-actions",
        summary:
          "Gating a side-effecting agent action behind an approval card, via useInterrupt or useHumanInTheLoop.",
        status: "working",
        hasDemo: true,
        statusNote:
          "The tool-call variant. The published `z.record(z.unknown())` is a zod 3 signature and does not compile on this repo's zod 4, so it is translated. The `useInterrupt` variant needs a backend that pauses a run and attaches `interrupt.metadata.action`, which no agent here does.",
      },
      {
        path: "/human-in-the-loop/interrupt-flow",
        title: "Interrupt-based",
        docPath: "/ms-agent-python/human-in-the-loop/interrupt-flow",
        summary:
          "Gate a backend tool behind an approval that the agent raises itself, rendered with useInterrupt.",
        status: "not-started",
        statusNote: "Tracked for drift only — no demo yet.",
      },
      {
        path: "/human-in-the-loop/tool-based",
        title: "Tool-based",
        docPath: "/ms-agent-python/human-in-the-loop/tool-based",
        summary:
          "Gate an action behind a frontend tool that renders UI and waits for the user.",
        status: "not-started",
        statusNote: "Tracked for drift only — no demo yet.",
      },
    ],
  },
  {
    title: "Shared State",
    routes: [
      {
        path: "/shared-state/in-app-agent-read",
        hasDemo: true,
        title: "Reading agent state",
        docPath: "/ms-agent-python/shared-state/in-app-agent-read",
        summary:
          "Reading the agent's live state in your own UI through agent.state.",
        status: "working",
      },
      {
        path: "/shared-state/in-app-agent-write",
        hasDemo: true,
        title: "Writing agent state",
        docPath: "/ms-agent-python/shared-state/in-app-agent-write",
        summary:
          "Writing back into agent state with agent.setState, and re-running with a hint message.",
        status: "working",
      },
      {
        path: "/readables",
        hasDemo: true,
        title: "Readables",
        docPath: "/ms-agent-python/agent-app-context",
        summary:
          "Sharing app state with the agent via useAgentContext, injected per request by the page's ContextAwareAgent.",
        status: "working",
      },
    ],
  },
  {
    title: "Microsoft Agent Framework",
    routes: [
      {
        path: "/auth",
        hasDemo: true,
        title: "Authentication",
        docPath: "/ms-agent-python/auth",
        summary:
          "Forwarding a bearer token from the provider to the AG-UI server, and validating it there.",
        status: "working",
      },
    ],
  },
  {
    title: "Rich Threads",
    routes: [
      {
        path: "/threads",
        title: "Overview",
        docPath: "/ms-agent-python/threads",
        summary:
          "What Rich Threads persist, and the credentials this section needs before any of it works.",
        status: "partial",
        statusNote:
          "Runs on its own Intelligence-backed runtime endpoint, on a free-tier license that expires 2026-09-12.",
      },
      {
        path: "/threads/drawer",
        hasDemo: true,
        title: "Threads Drawer",
        docPath: "/ms-agent-python/prebuilt-components/copilot-threads-drawer",
        summary:
          "The drop-in conversation sidebar, in both its zero-prop form and with all three documented escape hatches.",
        status: "partial",
        statusNote: "Requires the license above. Rename is absent by design.",
      },
      {
        path: "/threads/headless",
        hasDemo: true,
        title: "Headless Threads",
        docPath: "/ms-agent-python/headless-threads",
        summary:
          "A thread sidebar built from scratch on useThreads: rename, archive, delete, switching, and pagination.",
        status: "partial",
        statusNote: "Requires the license above for mutations.",
      },
      {
        path: "/threads/lifecycle",
        hasDemo: true,
        title: "Thread & History Lifecycle",
        docPath: "/ms-agent-python/threads-lifecycle",
        summary:
          "Mint, replay, switch: how a threadId comes to exist and what makes history hydrate into the view.",
        status: "partial",
        statusNote: "Requires the license above for server-side replay.",
      },
    ],
  },
  {
    title: "Backend",
    routes: [
      {
        path: "/copilot-runtime",
        hasDemo: true,
        title: "Copilot Runtime",
        docPath: "/ms-agent-python/copilot-runtime",
        summary:
          "This repo's live runtime config, agent routing across three ids, and the direct-connection tradeoff.",
        status: "working",
      },
      {
        path: "/ag-ui",
        hasDemo: true,
        title: "AG-UI",
        docPath: "/ms-agent-python/ag-ui",
        summary:
          "A live capture of the raw AG-UI event stream flowing between the runtime and this page.",
        status: "working",
      },
    ],
  },
  {
    title: "Intelligence",
    routes: [
      {
        path: "/intelligence/quickstart",
        title: "Intelligence · Quickstart",
        docPath: "/ms-agent-python/intelligence/quickstart",
        summary:
          "The single-route runtime transport this page switched to: one POST mount plus `useSingleEndpoint` on the provider.",
        status: "partial",
        statusNote:
          "Steps 3 and 4 are implemented against a third runtime mount at `/api/copilotkit-single`. Steps 1, 2 and 5 need a `CPK_INTELLIGENCE_API_KEY` from a hosted Intelligence project, which is an account-scoped resource this harness does not have.",
        hasDemo: true,
      },
      {
        path: "/intelligence/memories",
        title: "Memories & Recall",
        docPath: "/ms-agent-python/intelligence/memories",
        summary:
          "How long-term memory works in CopilotKit Intelligence: user and project scope, activation, reading and writing memories.",
        status: "not-started",
        statusNote: "Tracked for drift only — no demo yet.",
      },
      {
        path: "/learning",
        title: "Learning",
        docPath: "/ms-agent-python/learning",
        summary:
          "Turn real application use into evidence-backed Insights and reviewed, reusable Skills.",
        status: "not-started",
        statusNote: "Tracked for drift only — no demo yet.",
      },
    ],
  },
  {
    title: "Doc Sync",
    routes: [
      {
        path: "/doc-sync",
        title: "Doc drift",
        docPath: "/ms-agent-python",
        summary:
          "Re-fetches the markdown behind every tracked doc page and diffs it against the stored snapshot, flagging changes inside code blocks.",
        status: "reference",
      },
    ],
  },
];

export const ALL_ROUTES: RouteMeta[] = NAV.flatMap((g) => g.routes);

export function findRoute(path: string): RouteMeta | undefined {
  return ALL_ROUTES.find((r) => r.path === path);
}

export function docUrl(route: RouteMeta): string {
  return `https://docs.copilotkit.ai${route.docPath}`;
}

export const STATUS_LABEL: Record<RouteStatus, string> = {
  working: "Working",
  partial: "Partial",
  reference: "Reference",
  broken: "Broken",
  "not-started": "Not started",
};
