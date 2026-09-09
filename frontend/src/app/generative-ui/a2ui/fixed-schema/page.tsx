import { RouteHeader } from "@/components/route-header";
import { SourceCode } from "@/components/source-code";
import { Callout, Panel, TryIt } from "@/components/ui";

export default function Page() {
  return (
    <>
      <RouteHeader path="/generative-ui/a2ui/fixed-schema" />

      <Panel title="What it demonstrates">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          A2UI is the agent describing a <em>surface</em> instead of a sentence.
          &ldquo;Fixed schema&rdquo; is the half where the component tree is
          authored once, by hand, and the model never generates it — the tool
          supplies only the data the tree binds to. That is the whole trade: no
          creativity, and nothing to go wrong at render time.
        </p>
        <div className="mt-4">
          <TryIt
            prompts={[
              "Find me one flight from JFK to LHR",
              "What about Chicago to Denver on United?",
            ]}
            expect="A flight card renders in the message stream — two airport codes either side of an arrow, an airline pill, and a total. Asking a second time redraws the same card with the new values."
            fail="The agent answers in prose, or prints a wall of JSON starting with a2ui_operations. Either means the surface was never painted: the first is the tool not being called, the second is the A2UI middleware not being enabled for this agent."
          />
        </div>
      </Panel>

      <Panel
        title="The three operations"
        description="Ordered, not a set."
      >
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Every v0.9 surface is built from <code>createSurface</code>, then{" "}
          <code>updateComponents</code>, then <code>updateDataModel</code>, all
          wrapped in one <code>a2ui_operations</code> array.{" "}
          <code>createSurface</code> has to be first — it names the surface the
          other two address — and the component tree has to land before the data
          model, or the <code>{`{ path }`}</code> bindings resolve against a tree
          that does not exist yet.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <code>display_flight</code> returns all three as a JSON string. It is
          an ordinary tool return value — nothing about it is A2UI-aware. The
          A2UI middleware on the runtime is what recognises the container in the
          event stream and turns it into a painted surface.
        </p>
      </Panel>

      <Panel title="Two ids that have to agree">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <code>A2UI_CATALOG_ID</code> in <code>backend/agents.py</code> and{" "}
          <code>CATALOG_ID</code> in this route&apos;s <code>a2ui/catalog.ts</code>{" "}
          are the same string, and they are a contract. Change one without the
          other and the run still succeeds, the surface still paints, and nothing
          is drawn — the browser has no vocabulary for the components the tree
          names, and there is no error anywhere to read.
        </p>
      </Panel>

      <Callout tone="info" title="This catalog does not use the basic catalog">
        <code>createCatalog</code> can merge CopilotKit&apos;s built-in
        components with <code>includeBasicCatalog: true</code>, which is how the
        doc&apos;s own sample composes <code>Row</code>, <code>Column</code> and{" "}
        <code>Text</code>. It also makes the renderer fetch{" "}
        <code>a2ui.org/specification/v0_9/basic_catalog.json</code> at paint
        time, and that fetch is the failure behind the same page in
        DeepAgentspy-react (<em>Catalog not found</em>, no surface at all). The
        two components here are declared locally, so this route needs no network
        beyond the agent itself.
      </Callout>

      <Panel title="Source">
        <SourceCode file="frontend/src/app/generative-ui/a2ui/fixed-schema/a2ui/definitions.ts" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          The catalog contract. <code>renderers.tsx</code> holds the React half —{" "}
          <code>createCatalog</code> type-checks one against the other, so a
          schema edit that outgrows the renderers fails the build instead of
          painting an empty card.
        </p>
      </Panel>

      <Panel title="Source — the agent tool">
        <SourceCode file="backend/agents.py" region="display-flight" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          The doc&apos;s Python sample, with the schema read from{" "}
          <code>backend/a2ui_schemas/flight_schema.json</code> rather than
          inlined.
        </p>
      </Panel>
    </>
  );
}
