"use client";

import { useState } from "react";

import { DemoFrame } from "@/components/demo-frame";

import { readAction } from "../read-action";
import {
  candidates,
  clarificationOptions,
  PanelSchema,
  StateSchema,
  type PickerState,
} from "../workspaces";

/**
 * The half of the Jev recipe that runs here, and nothing more.
 *
 * Runs: `workspaces.ts` (the schemas and the catalog), `readAction` (the
 * button-response handler), and the published render block of `Picker`.
 *
 * Does not run, and is not simulated: `choosePanel`. Jev is what decides which
 * prepared control to show and how the rooms rank. That needs
 * `@typesafe-ai/sdk` and a `TYPESAFE_API_KEY` from TypeSafe, a third-party
 * vendor, neither of which this repo has. `explain` does not run either: it
 * needs `@langchain/openai`, also absent. So does `PickerAgent`, because it
 * imports both.
 *
 * The panel therefore has to come from somewhere, and the only honest answer
 * is: from you. The strip above the picker places one of the two prepared
 * controls by hand. It is labelled as a stand-in on screen, the option order is
 * this repo's catalog order and not a Jev ranking, and free text answers with a
 * note saying no decision layer was reached rather than with a panel. Wiring a
 * plausible-looking chooser in here would make the recipe look followed when
 * half of it was never run.
 *
 * Three substitutions inside the published JSX, each marked inline:
 *
 *   `agent.state`     -> a local `useState`; there is no `picker` agent.
 *   `send(content)`   -> a local handler that runs the published `readAction`
 *                        and then stops, where the recipe would run the agent.
 *   `agent.abortRun()`-> a no-op; there is no run to abort. `busy` is never
 *                        true here, so the Cancel button never renders anyway.
 *
 * See FINDINGS.md #21.
 */

/** Which prepared control the tester placed. Jev's job upstream. */
type Placed = "none" | "clarification" | "comparison";

export default function Page() {
  return (
    <DemoFrame
      parentPath="/cookbook/jev-generative-ui"
      subtitle="prepared controls only · the Jev decision layer is not wired"
    >
      <div className="flex h-full flex-col overflow-auto">
        <Picker />
      </div>
    </DemoFrame>
  );
}

function Picker() {
  // SUBSTITUTED for `const { agent, isReady } = useAgent({ agentId: "picker" })`
  // and `const { copilotkit } = useCopilotKit()`. Both compile against this
  // repo's @copilotkit/react-core 1.69.2 — that was checked — but they would
  // address an agent named `picker`, and registering one would mean shipping
  // `PickerAgent`, which cannot be built here.
  const [state, setState] = useState<PickerState>(() => StateSchema.parse({}));
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed>("none");

  // Published as `const busy = pending || agent.isRunning;` and
  // `const { isReady } = useAgent(...)`. Nothing runs asynchronously here.
  const isReady = true;
  const busy = false;

  /** A no-op stand-in for `agent.abortRun()`. Unreachable while `busy` is false. */
  function abortRun() {}

  /**
   * SUBSTITUTED for the published `send`, which ends in
   * `agent.addMessage(...)` followed by `await copilotkit.runAgent({ agent })`.
   * That run is where Jev would be asked. Here the published `readAction` is
   * applied and the turn stops.
   */
  function send(content: string) {
    if (!content.trim()) return;
    setError(null);
    try {
      const { selection } = readAction(content, state);
      if (selection) {
        // readAction handled it with no help from Jev, which is the recipe's
        // own design: "the user has already chosen, so Jev doesn't need to
        // choose again".
        setState(StateSchema.parse(selection));
        setPlaced("none");
        return;
      }
      // Everything else is `choosePanel`'s to answer, and choosePanel is not
      // here. Say so rather than inventing a panel.
      setState({
        ...state,
        panel: null,
        note:
          "No decision layer was reached. choosePanel() needs @typesafe-ai/sdk " +
          "and a TYPESAFE_API_KEY, so nothing chose a control for this request. " +
          "Place one by hand above to exercise the rest.",
      });
      setPlaced("none");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request failed. Try again.");
    }
    setText("");
  }

  /**
   * Places one of the two prepared controls the recipe defines.
   *
   * The titles and the clarification options are the recipe's own, from
   * `choosePanel`'s two `PanelSchema.parse` branches. The comparison list is
   * built the same way the recipe builds it, except that `ranked` there is
   * sorted by Jev's per-room fit scores and this one is not sorted at all: it
   * is `candidates` in catalog order. That difference is the whole point of
   * the page, so it is stated on screen rather than hidden.
   */
  function place(kind: "clarification" | "comparison") {
    setError(null);
    setPlaced(kind);
    setState({
      ...state,
      note: "",
      panel: PanelSchema.parse(
        kind === "clarification"
          ? {
              type: "clarification",
              title: "What kind of work are you doing?",
              options: clarificationOptions,
            }
          : {
              type: "comparison",
              title: "Choose a workspace",
              options: candidates.map(({ id, name, details }) => ({
                id,
                label: `${name}: ${details}`,
              })),
            },
      ),
    });
  }

  return (
    <div className="space-y-4 p-6 text-sm">
      <div
        data-testid="jev-stand-in"
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <p className="font-semibold">
          Jev is not wired. These two buttons stand in for its decision.
        </p>
        <p className="mt-1">
          Upstream, <code>choosePanel()</code> asks Jev which prepared control
          fits and how well each room scores, then sorts the rooms by that
          score. It needs <code>@typesafe-ai/sdk</code> and a{" "}
          <code>TYPESAFE_API_KEY</code>. Neither is in this repo, so nothing
          here chooses or ranks: the list below is the catalog in declaration
          order.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="place-clarification"
            onClick={() => place("clarification")}
            className="rounded-md border border-amber-400 px-3 py-1.5 font-medium"
          >
            Place the clarification panel
          </button>
          <button
            type="button"
            data-testid="place-comparison"
            onClick={() => place("comparison")}
            className="rounded-md border border-amber-400 px-3 py-1.5 font-medium"
          >
            Place the comparison panel
          </button>
          <span className="self-center text-xs">
            placed: <code data-testid="placed">{placed}</code>
          </span>
        </div>
      </div>

      {/*
       * PUBLISHED, `app/page.tsx`, "Finish `Picker` by rendering the form and
       * the current panel":
       *
       *   return <main>
       *     <h1>Find a workspace</h1>
       *     <form onSubmit={(event) => { event.preventDefault(); void send(text); }}>
       *       <label htmlFor="request">What do you need?</label>
       *       <input id="request" value={text} onChange={(event) => setText(event.target.value)} />
       *       <button disabled={!isReady || busy}>Find options</button>
       *     </form>
       *     {busy && <button onClick={() => agent.abortRun()}>Cancel</button>}
       *     {error && <p role="alert">{error}</p>}
       *     <p aria-live="polite">{state.note}</p>
       *     <p>Selected workspace: {state.selectedId ?? "None"}</p>
       *     {state.panel && <section aria-label={state.panel.title}>
       *       <h2>{state.panel.title}</h2>
       *       {state.panel.options.map((option) => <button key={option.id} disabled={busy || !isReady}
       *         onClick={() => void send(state.panel?.type === "clarification"
       *           ? `Clarification answer: ${option.id}` : `Select workspace: ${option.id}`)}>
       *         {option.label}
       *       </button>)}
       *     </section>}
       *   </main>;
       *
       * Shipped below with `agent.abortRun()` replaced by the local `abortRun`
       * described in the header, and a wrapper class so the unstyled markup is
       * legible on camera. Nothing else is changed.
       */}
      {/* [!code highlight] */}
      <main className="space-y-2 rounded-lg border border-slate-300 p-4 dark:border-slate-700 [&_button]:mr-2 [&_button]:rounded [&_button]:border [&_button]:border-slate-400 [&_button]:px-2 [&_button]:py-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_input]:rounded [&_input]:border [&_input]:border-slate-400 [&_input]:px-2 [&_input]:py-1 [&_label]:mr-2">
        <h1>Find a workspace</h1>
        <form onSubmit={(event) => { event.preventDefault(); void send(text); }}>
          <label htmlFor="request">What do you need?</label>
          <input id="request" value={text} onChange={(event) => setText(event.target.value)} />
          <button disabled={!isReady || busy}>Find options</button>
        </form>
        {busy && <button onClick={() => abortRun()}>Cancel</button>}
        {error && <p role="alert">{error}</p>}
        <p aria-live="polite">{state.note}</p>
        <p>Selected workspace: {state.selectedId ?? "None"}</p>
        {state.panel && <section aria-label={state.panel.title}>
          <h2>{state.panel.title}</h2>
          {state.panel.options.map((option) => <button key={option.id} disabled={busy || !isReady}
            onClick={() => void send(state.panel?.type === "clarification"
              ? `Clarification answer: ${option.id}` : `Select workspace: ${option.id}`)}>
            {option.label}
          </button>)}
        </section>}
      </main>

      <p className="text-xs text-slate-500">
        Clicking a room runs the published <code>readAction</code>, which
        applies the selection directly and writes the note. Clicking a
        clarification option runs the same function, which rewrites the message
        for Jev and returns <code>selection: null</code> — and that is where
        this page stops, because Jev is the next step.
      </p>
    </div>
  );
}
