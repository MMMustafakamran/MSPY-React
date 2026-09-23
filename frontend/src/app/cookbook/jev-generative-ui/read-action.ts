/**
 * `readAction` from
 * https://docs.copilotkit.ai/ms-agent-python/cookbook/jev-generative-ui,
 * step 3, shipped verbatim.
 *
 * The recipe publishes this inside `lib/picker-agent.ts`, the file that also
 * holds `explain` (needs `@langchain/openai`, absent here), `respond` and
 * `runPicker` (both need `./choose-panel`, which needs `@typesafe-ai/sdk` and a
 * Jev API key, both absent here) and the `PickerAgent` adapter. None of that
 * can run in this repo, so the one function in that file which depends on
 * nothing but `./workspaces` is split out here and the rest is quoted on the
 * route page. The function body, its signature and its comments are unchanged.
 * That split is the deviation; see FINDINGS.md #21.
 *
 * This is the recipe's own half of the decision: a room selection is applied
 * directly, without asking Jev, "the user has already chosen, so Jev doesn't
 * need to choose again". That is why it runs here at all.
 */

// The recipe's import line is
//   import { candidates, clarificationOptions, StateSchema, type PickerState } from "./workspaces";
// inside picker-agent.ts, which also uses StateSchema. Only the two names this
// function reads are imported here; nothing else in the line applies.
import { candidates, clarificationOptions, type PickerState } from "./workspaces";

// [!code highlight]
export function readAction(message: string, state: PickerState) {
  if (message.startsWith("Select workspace: ")) {
    const id = message.slice("Select workspace: ".length);
    const selected = candidates.find((c) => c.id === id);
    if (!selected) throw new Error("Unknown workspace selection");
    return { message, selection: {
      ...state, selectedId: id, note: `Selected ${selected.name}. No booking was made.`,
    } };
  }
  if (message.startsWith("Clarification answer: ")) {
    const id = message.slice("Clarification answer: ".length);
    const answer = clarificationOptions.find((o) => o.id === id);
    if (!answer) throw new Error("Unknown clarification answer");
    message = `I answered the workspace clarification: ${answer.label}. Show matching workspaces.`;
  }
  return { message, selection: null };
}
