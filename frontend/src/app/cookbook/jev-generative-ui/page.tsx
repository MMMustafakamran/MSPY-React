import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, CodeBlock, Panel, TryIt } from "@/components/ui";

/** The recipe's install line, as published. */
const INSTALL = `npm install @copilotkit/core@1.73.0 @copilotkit/react-core@1.73.0 @copilotkit/runtime@1.73.0 @ag-ui/client@0.0.59 @ag-ui/core@0.0.59 @typesafe-ai/sdk@0.6.0 rxjs@7.8.1 zod@4.6.5 @langchain/openai@1.5.13 @langchain/core@1.2.11`;

/** What the ten pins meet in this repo. */
const PINS = `package                             recipe pins   declared here   installed here
----------------------------------  ------------  --------------  --------------
@copilotkit/core                    1.73.0        (transitive)    1.69.2
@copilotkit/react-core              1.73.0        ^1.69.2         1.69.2
@copilotkit/runtime                 1.73.0        ^1.69.2         1.69.2
@ag-ui/client                       0.0.59        0.0.57          0.0.57
@ag-ui/core                         0.0.59        (transitive)    0.0.58 hoisted, 0.0.57 under @ag-ui/client
@typesafe-ai/sdk                    0.6.0         -               ABSENT
rxjs                                7.8.1         (transitive)    7.8.1
zod                                 4.6.5         ^4.4.3          4.4.3
@langchain/openai                   1.5.13        -               ABSENT
@langchain/core                     1.2.11        (transitive)    1.2.8

# @copilotkit/react-core 1.69.2 published 2026-08-26; 1.73.0 published 2026-09-19.
# @typesafe-ai/sdk 0.6.0 published 2026-09-15, engines node>=20, no declared dependencies.
# Nothing here was installed, upgraded or added to satisfy this page.`;

/** The three modules that do not resolve, compiled. */
const MISSING_MODULES = `$ npx tsc --noEmit    # a throwaway probe importing the recipe's three vendor modules
src/__jevprobe/missing.ts(1,47): error TS2307: Cannot find module
  '@typesafe-ai/sdk' or its corresponding type declarations.
src/__jevprobe/missing.ts(2,28): error TS2307: Cannot find module
  '@langchain/openai' or its corresponding type declarations.
src/__jevprobe/missing.ts(3,31): error TS2307: Cannot find module
  '@copilotkit/intelligence-langgraph' or its corresponding type declarations.`;

/** The env block, as published. */
const ENV = `TYPESAFE_API_KEY=your-typesafe-key
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5.4`;

/** `lib/choose-panel.ts`, all three published blocks, in the published order. */
const CHOOSE_PANEL = `import { TypeSafeClient, choice, score } from "@typesafe-ai/sdk";
import { candidates, PanelSchema, clarificationOptions } from "./workspaces";
import type { Guidance, PickerState } from "./workspaces";

export async function choosePanel(
  message: string,
  state: PickerState,
  publishedGuidance: Guidance,
  signal: AbortSignal,
) {
  const client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY });
  const questions: Record<string, ReturnType<typeof choice> | ReturnType<typeof score>> = {
    control: choice(
      "Choose the useful next control. Apply relevant publishedGuidance within these rules. " +
      "Ask for clarification only if the goal is unclear. If the message already answers " +
      "a clarification, compare candidates or defer; never ask it again. " +
      "Use agent for explanations or requests outside the prepared controls. " +
      "Panels only preview; they never confirm a selection.",
      {
        clarification: "Ask whether the user needs focus or collaboration.",
        comparison: "Offer workspace candidates matching a clear need.",
        agent: "Explain or handle a request outside these controls.",
      },
    ),
  };

  for (const candidate of candidates) {
    questions[\`fit_\${candidate.id}\`] = score(
      \`How well does candidate \${candidate.id} fit the request and relevant publishedGuidance?\`,
      ["Poor fit", "Unclear fit", "Good fit", "Strong fit"],
    );
  }
  const result = await client.systemOne({
    model: "jev-1.13.0",
    state: { latestMessage: message, selectedId: state.selectedId, candidates, publishedGuidance },
    questions,
  }, { signal });

  const control = result.answers.control;
  if (control?.type !== "choice") throw new Error("Missing Jev control answer");
  const ranked = candidates.map((candidate) => {
    const answer = result.answers[\`fit_\${candidate.id}\`];
    if (answer?.type !== "score" || !Number.isFinite(answer.score)) {
      throw new Error("Missing or invalid candidate score");
    }
    return { ...candidate, score: answer.score };
  }).sort((a, b) => b.score - a.score);

  if (control.choice === "agent") return { panel: null };
  if (!["clarification", "comparison"].includes(control.choice)) {
    throw new Error("Unknown Jev control");
  }
  const panel = PanelSchema.parse(control.choice === "clarification" ? {
    type: "clarification", title: "What kind of work are you doing?",
    options: clarificationOptions,
  } : {
    type: "comparison", title: "Choose a workspace",
    options: ranked.map(({ id, name, details }) => ({ id, label: \`\${name}: \${details}\` })),
  });
  return { panel };
}`;

/** The AG-UI adapter, as published. */
const PICKER_AGENT = `export class PickerAgent extends AbstractAgent {
  constructor() { super({ agentId: "picker" }); }
  override clone() { return new PickerAgent(); }

  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((subscriber) => {
      const controller = new AbortController();
      void runPicker(input, controller.signal, (event) => subscriber.next(event))
        .then(() => subscriber.complete())
        .catch(() => {
          if (!subscriber.closed) {
            subscriber.next({ type: EventType.RUN_ERROR,
              message: "The picker could not finish. Try again.", code: "PICKER_FAILED" });
            subscriber.complete();
          }
        });
      return () => controller.abort();
    });
  }
}`;

/** The runtime mount, as published. */
const ROUTE = `import { CopilotRuntime, createCopilotEndpoint } from "@copilotkit/runtime/v2";
import { PickerAgent } from "@/lib/picker-agent";

export const runtime = "nodejs";
const endpoint = createCopilotEndpoint({
  runtime: new CopilotRuntime({ agents: { picker: new PickerAgent() } }),
  basePath: "/api/copilotkit",
});
const handler = (request: Request) => endpoint.fetch(request);
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };`;

/** The Automatic Learning helper, as published. */
const LEARNED_GUIDANCE = `import { SkillRegistry } from "@copilotkit/intelligence-langgraph";

const registry = new SkillRegistry();
export async function loadGuidance() {
  await registry.initialize();
  const snapshot = await registry.acquireSnapshot();
  return {
    revision: registry.status.revision,
    stale: registry.status.stale,
    guidance: snapshot.skills.map((skill) => ({
      name: skill.name,
      content: skill.files.find((file) => file.path === "SKILL.md")?.text ?? "",
    })).filter((skill) => skill.content.length > 0),
  };
}`;

/** What did compile, and against what. */
const COMPILES = `$ npx tsc --noEmit    # PickerAgent + runPicker + route.ts, snippets verbatim, probe files
(no output)

$ npx tsc --noEmit    # the published app/page.tsx Picker, verbatim, probe file
(no output)

# @copilotkit/runtime 1.69.2, @copilotkit/react-core 1.69.2, @ag-ui/client 0.0.57,
# @ag-ui/core 0.0.58, rxjs 7.8.1, zod 4.4.3, typescript 5.9.3, next 16.3.2, react 19.2.8`;

export default function Page() {
  return (
    <>
      <RouteHeader path="/cookbook/jev-generative-ui" />

      <Panel title="What runs here, and what does not">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          The recipe splits cleanly in two. Your application owns the schemas,
          the catalog, the prepared controls, their fixed labels and the
          confirmed actions; Jev decides which control fits and how the rooms
          rank. The first half needs nothing this repo does not already have.
          The second needs <code>@typesafe-ai/sdk</code> and a Jev API key from
          TypeSafe, a third-party vendor, and no key exists here.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                <th className="pb-2 pr-4 font-medium">Published file</th>
                <th className="pb-2 pr-4 font-medium">Here</th>
                <th className="pb-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 dark:divide-slate-800 dark:text-slate-400">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">lib/workspaces.ts</td>
                <td className="py-2 pr-4 text-emerald-700 dark:text-emerald-400">
                  runs, verbatim
                </td>
                <td className="py-2">zod only. Compiles on zod 4.4.3.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">
                  readAction (from lib/picker-agent.ts)
                </td>
                <td className="py-2 pr-4 text-emerald-700 dark:text-emerald-400">
                  runs, verbatim
                </td>
                <td className="py-2">
                  Depends only on the catalog. Split into its own file, since
                  the rest of picker-agent.ts cannot compile.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">
                  app/page.tsx, the render block
                </td>
                <td className="py-2 pr-4 text-amber-700 dark:text-amber-400">
                  runs, with three marked substitutions
                </td>
                <td className="py-2">
                  Its state comes from useState, not from an agent that does not
                  exist.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">lib/choose-panel.ts</td>
                <td className="py-2 pr-4 text-rose-700 dark:text-rose-400">
                  quoted only
                </td>
                <td className="py-2">
                  @typesafe-ai/sdk absent, TYPESAFE_API_KEY absent.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">
                  lib/picker-agent.ts, the rest
                </td>
                <td className="py-2 pr-4 text-rose-700 dark:text-rose-400">
                  quoted only
                </td>
                <td className="py-2">
                  explain needs @langchain/openai; respond and runPicker need
                  choosePanel.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">
                  app/api/copilotkit/[[...slug]]/route.ts
                </td>
                <td className="py-2 pr-4 text-rose-700 dark:text-rose-400">
                  quoted only
                </td>
                <td className="py-2">
                  It compiles, but it imports PickerAgent and its published path
                  is this harness&apos;s own runtime route.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">lib/learned-guidance.ts</td>
                <td className="py-2 pr-4 text-rose-700 dark:text-rose-400">
                  quoted only
                </td>
                <td className="py-2">
                  @copilotkit/intelligence-langgraph absent, and it needs a
                  provisioned Learning container.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <TryIt
            prompts={[
              "Place the comparison panel, then click Studio.",
              "Place the clarification panel, then click Quiet focus time.",
              "Type: I need somewhere to work",
            ]}
            expect="Clicking a room writes 'Selected Studio. No booking was made.' and sets Selected workspace, which is the published readAction running. Clicking a clarification option clears the panel and stops, which is where Jev would take over. Free text answers with a note saying no decision layer was reached."
            fail="A panel appears on its own after free text. Nothing here can choose one, so that would mean something is faking the Jev call."
          />
        </div>
      </Panel>

      <Panel title="Findings">
        <div className="space-y-4">
          <Callout tone="warn" title="The install line pins a floor four minors above this repo">
            Ten packages, all pinned exactly. Three of them move CopilotKit from
            1.69.2 to 1.73.0, which is the version every other page in this
            section is tested against here. Nothing was installed, upgraded or
            added for this page.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {INSTALL}
            </pre>
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {PINS}
            </pre>
          </Callout>

          <Callout tone="warn" title="Three modules do not resolve">
            <code>@typesafe-ai/sdk</code> and <code>@langchain/openai</code> are
            absent from this tree, and so is{" "}
            <code>@copilotkit/intelligence-langgraph</code>, which the Automatic
            Learning section adds. All three exist on npm at the pinned
            versions; they are simply not here, and installing them is outside
            what this harness may do.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {MISSING_MODULES}
            </pre>
          </Callout>

          <Callout tone="warn" title="The Jev key comes from a third-party vendor">
            <code>TYPESAFE_API_KEY</code> is issued through the TypeSafe
            quickstart at <code>docs.typesafe.ai</code>, a vendor outside
            CopilotKit. It is the one credential on the page with no free or
            local substitute: <code>choosePanel</code> is the entire decision
            layer, so without the key the recipe has no generative UI in it at
            all.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {ENV}
            </pre>
          </Callout>

          <Callout tone="warn" title="Two of the ten pinned packages are never imported">
            No snippet on the page imports from <code>@copilotkit/core</code> or
            from <code>@langchain/core</code>. Both are pinned exactly in the
            install line. They are a transitive of{" "}
            <code>@copilotkit/react-core</code> and a peer of{" "}
            <code>@langchain/openai</code> respectively, so pinning them is not
            wrong, but a reader has no way to tell which of the ten lines
            correspond to code they are about to write. Conversely{" "}
            <code>rxjs</code> and <code>@ag-ui/core</code> <em>are</em> imported
            by name and are undeclared in this repo, resolving only because
            CopilotKit hoists them.
          </Callout>

          <Callout tone="warn" title="The page pins its own extension against a version that does not exist">
            The Automatic Learning section says to install{" "}
            <code>@copilotkit/intelligence-langgraph@1.71.2</code>
            &ldquo;alongside the pinned stack above&rdquo;. The stack above is
            1.73.0. On npm that package has exactly two published versions,
            0.1.0 and 1.71.2, so the skew cannot be closed by bumping it, and
            the page does not say whether a 1.71.2 registry client is expected
            to work against 1.73.0 runtime types.
          </Callout>

          <Callout tone="warn" title="The run-error handler discards the cause the Learning section tells you to surface">
            The Automatic Learning section says: &ldquo;Let initialization
            failures reach the run-error handler; do not silently claim the
            learned configuration ran with empty guidance.&rdquo; The run-error
            handler it points at is the <code>.catch</code> below, which takes
            no argument, logs nothing, and emits one fixed string. A failed{" "}
            <code>registry.initialize()</code> therefore reaches the user as
            &ldquo;The picker could not finish. Try again.&rdquo; and reaches
            the developer as nothing at all. Every other throw in the recipe is
            given a distinct message (<code>Missing Jev control answer</code>,{" "}
            <code>Unknown workspace selection</code>) and all of them are
            flattened here.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {PICKER_AGENT}
            </pre>
          </Callout>

          <Callout tone="warn" title="It mounts the runtime with an API no other page in this section uses">
            The recipe uses <code>createCopilotEndpoint</code> plus{" "}
            <code>endpoint.fetch(request)</code>. The Quickstart, Copilot
            Runtime and the section landing page all publish{" "}
            <code>createCopilotRuntimeHandler</code> for the same job, and the
            Copilot Runtime page names a third,{" "}
            <code>createCopilotEndpointSingleRoute</code>, for the plain{" "}
            <code>route.ts</code> case. Three mounting APIs across one section,
            with no page relating any of them to the others. This one compiles
            at the installed 1.69.2.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {ROUTE}
            </pre>
          </Callout>

          <Callout tone="warn" title="Its published paths collide with the harness, and it offers no alternative">
            &ldquo;Before you start&rdquo; says to use a Next.js App Router
            project with the <code>@/*</code> alias, and to place everything
            inside <code>src/</code> if the project uses one, which this repo
            does. Followed literally that puts the recipe&apos;s{" "}
            <code>app/page.tsx</code> over the harness landing page and its{" "}
            <code>app/api/copilotkit/[[...slug]]/route.ts</code> over the
            runtime route every other page in this section shares.{" "}
            <code>basePath: &quot;/api/copilotkit&quot;</code> is hardcoded in
            the snippet and the frontend&apos;s{" "}
            <code>runtimeUrl=&quot;/api/copilotkit&quot;</code> matches it, so
            there is no documented way to mount this recipe beside an existing
            CopilotKit app. The page is written for a fresh project and never
            says so in those words.
          </Callout>

          <Callout tone="warn" title="The model id is hardcoded twice and the env var is decorative">
            <code>client.systemOne({"{"} model: &quot;jev-1.13.0&quot; {"}"})</code>{" "}
            pins a Jev model in code, with no note on how to find a current one
            and no link to a model list. On the OpenAI side the reverse
            happens: <code>.env.local</code> sets{" "}
            <code>OPENAI_MODEL=gpt-5.4</code> and the code then reads{" "}
            <code>process.env.OPENAI_MODEL || &quot;gpt-5.4&quot;</code>, so
            the variable can be deleted with no effect. The Quickstart has the
            mirror-image defect in README §9 #7, where the env block and the
            code disagree.
          </Callout>

          <Callout tone="success" title="What did compile, verbatim, at 1.69.2">
            Worth recording as a negative result. The AG-UI adapter, the runtime
            route and the whole published <code>Picker</code> component, all
            typecheck unchanged against the installed 1.69.2 tree, so nothing on
            this page is known to <em>need</em> the 1.73.0 floor the install
            line sets. Only the three absent modules fail, and they fail for
            being absent rather than for being wrong. The probe files were
            deleted after the run.
            <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {COMPILES}
            </pre>
          </Callout>

          <Callout tone="warn" title="Live, in the sitemap, and absent from the section sidebar">
            <code>/ms-agent-python/cookbook/jev-generative-ui</code> resolves
            200 and is listed in <code>sitemap.xml</code>. The sidebar tree the
            section serves has no Cookbook folder at all: it carries a
            top-level link to <code>/cookbook</code>, outside the section. So
            the page is reachable from the section only by URL, search or
            sitemap.
          </Callout>
        </div>
      </Panel>

      <Panel
        title="The decision layer, quoted"
        description="lib/choose-panel.ts, all three published blocks in order. Not shipped: it imports @typesafe-ai/sdk and calls Jev with a key this repo does not have."
      >
        <CodeBlock
          filename="lib/choose-panel.ts (quoted, not shipped)"
          language="typescript"
          code={CHOOSE_PANEL}
        />
      </Panel>

      <Panel
        title="The Automatic Learning extension, quoted"
        description="lib/learned-guidance.ts. Needs @copilotkit/intelligence-langgraph plus a provisioned Learning container with published Skills, which is the same wall README §9 #16 and #19 describe."
      >
        <CodeBlock
          filename="lib/learned-guidance.ts (quoted, not shipped)"
          language="typescript"
          code={LEARNED_GUIDANCE}
        />
      </Panel>

      <Callout tone="info" title="The rest of the recipe">
        Everything on the page, including the blocks not quoted here, is in the
        snapshot at{" "}
        <code>doc-snapshot/pages/ms-agent-python__cookbook__jev-generative-ui.md</code>,
        which is what drift is measured against.
      </Callout>

      <Panel title="Source · the published schemas and catalog">
        <SourceCode file="frontend/src/app/cookbook/jev-generative-ui/workspaces.ts" />
      </Panel>

      <Panel title="Source · the published readAction">
        <SourceCode file="frontend/src/app/cookbook/jev-generative-ui/read-action.ts" />
      </Panel>

      <Panel title="Source · the demo that mounts them">
        <SourceCode file="frontend/src/app/cookbook/jev-generative-ui/demo-chat/page.tsx" />
      </Panel>
    </>
  );
}
