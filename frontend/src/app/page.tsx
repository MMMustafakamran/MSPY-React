import Link from "next/link";

import { BackendHealth } from "@/components/backend-health";
import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, KeyValue, Panel, TryIt } from "@/components/ui";
import { DOCS_ROOT, NAV } from "@/lib/nav-config";
import { DocSyncedAt } from "@/components/doc-synced-at";
import { DocDriftPanel } from "@/components/doc-drift-panel";

/** Dynamic: the doc-sync readouts below read the snapshot off disk. */
export const dynamic = "force-dynamic";

export default function Page() {
  const counts = NAV.flatMap((g) => g.routes).reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {},
  );

  return (
    <>
      <RouteHeader path="/" />


      <DocDriftPanel />

      <Panel title="What this is">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          A working test harness for the CopilotKit + Microsoft Agent Framework
          (Python) integration. Each route implements one doc page against a real
          agent, and shows the exact source that makes it work.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Everything here comes from the documentation. No tool, instruction, or
          state schema was invented for this repo — the agent exposes exactly the
          three tools the docs define, and nothing else.
        </p>
        <div className="mt-4">
          <KeyValue
            rows={[
              [
                "Docs tracked",
                <a
                  key="d"
                  href={DOCS_ROOT}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] underline underline-offset-4"
                >
                  {DOCS_ROOT}
                </a>,
              ],
              ["Docs synced", <DocSyncedAt key="docs-synced" withPages />],
              [
                "Routes",
                `${counts.working ?? 0} working · ${counts.partial ?? 0} partial · ${
                  counts.reference ?? 0
                } reference · ${counts["not-started"] ?? 0} not started`,
              ],
            ]}
          />
        </div>
      </Panel>

      <Panel
        title="Connection check"
        description="Both processes must be up before any chat route will respond."
      >
        <BackendHealth />
      </Panel>

      <Panel title="The four agents">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The backend serves four AG-UI endpoints rather than one.{" "}
          <code>state_schema</code> is a property of the agent it is attached to,
          and the docs define two different schemas — <code>language</code> on
          the Shared State pages and <code>searches</code> on State Rendering.
          One agent cannot carry both without departing from the samples. The
          fourth arrived with the 2026-09-04 drift: Agent App Context now
          publishes its own <code>AgentFrameworkAgent</code> subclass, which
          carries no schema and cannot share the Shared State agent.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                <th className="pb-2 pr-4 font-medium">Runtime id</th>
                <th className="pb-2 pr-4 font-medium">Endpoint</th>
                <th className="pb-2 font-medium">Tool · used by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">my_agent</td>
                <td className="py-2 pr-4 font-mono text-xs">:8020/</td>
                <td className="py-2 text-slate-600 dark:text-slate-400">
                  <code>get_weather</code> · Quickstart, Tool Rendering, and every
                  route with no state schema
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">sample_agent</td>
                <td className="py-2 pr-4 font-mono text-xs">:8020/sample_agent</td>
                <td className="py-2 text-slate-600 dark:text-slate-400">
                  <code>update_language</code> · Shared State read/write
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">search_agent</td>
                <td className="py-2 pr-4 font-mono text-xs">:8020/search_agent</td>
                <td className="py-2 text-slate-600 dark:text-slate-400">
                  <code>update_searches</code> · State Rendering
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">context_agent</td>
                <td className="py-2 pr-4 font-mono text-xs">:8020/context_agent</td>
                <td className="py-2 text-slate-600 dark:text-slate-400">
                  no tools · Agent App Context (<code>ContextAwareAgent</code>)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="How a message travels">
        <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <strong>1.</strong> A chat component posts to{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
              /api/copilotkit
            </code>{" "}
            in this Next app.
          </li>
          <li>
            <strong>2.</strong> The Copilot Runtime resolves the agent id and
            forwards the run to the matching AG-UI endpoint via an{" "}
            <code>HttpAgent</code>.
          </li>
          <li>
            <strong>3.</strong> Agent Framework executes the agent, calling the
            model and any server-side tools.
          </li>
          <li>
            <strong>4.</strong> AG-UI events stream back as SSE. Browser-executed
            tools run here, and their results go back so the run can continue.
          </li>
        </ol>
        <div className="mt-4">
          <Callout tone="info">
            The model provider key lives only in the agent process. The browser
            never holds it, because it never talks to the agent directly.
          </Callout>
        </div>
      </Panel>

      <Panel
        title="The landing page's own runtime route"
        description="New with the 2026-09-21 sync: the doc landing page now publishes a route.ts. Mounted as published at /api/copilotkit-landing; no page here points a provider at it."
      >
        <SourceCode file="frontend/src/app/api/copilotkit-landing/route.ts" />
        <div className="mt-4 space-y-3">
          <Callout tone="warn" title="A plain route.ts cannot serve this handler">
            The snippet is titled <code>app/api/copilotkit/route.ts</code>, but
            the handler it mounts is the multi-route one. The Quickstart and the
            Copilot Runtime page both put the same handler at{" "}
            <code>app/api/copilotkit/[[...slug]]/route.ts</code>, and the latter
            says why: the runtime has to serve sub-routes such as{" "}
            <code>/info</code>. A plain <code>route.ts</code> receives its exact
            path only, and at @copilotkit/runtime 1.69.2 the handler answers the
            bare base path with 404 for both verbs it exports.
          </Callout>
          <Callout tone="warn" title="AGENT_URL is never defined">
            The agent URL is read from <code>process.env.AGENT_URL!</code>. No
            tracked page tells the reader to set it: the Quickstart hardcodes{" "}
            <code>http://localhost:8000/</code> and its env blocks carry model
            keys only. The non-null assertion hides the gap from the compiler
            and <code>HttpAgent</code> accepts an undefined URL, so the first
            symptom is a failed run rather than a startup error. It is left
            unset here.
          </Callout>
        </div>
      </Panel>

      <Panel title="Start here">
        <TryIt
          prompts={["Can you tell me a joke?"]}
          expect={
            <>
              On{" "}
              <Link href="/quickstart" className="underline">
                /quickstart
              </Link>
              , a streamed reply.
            </>
          }
          fail="An error banner, or no reply at all — check the connection panel above."
        />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Sidebar dot colours mirror status. The{" "}
          <Link
            href="/status"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            status overview
          </Link>{" "}
          lists every route in one table.
        </p>
      </Panel>
    </>
  );
}
