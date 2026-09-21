/**
 * `lib/workspaces.ts` from
 * https://docs.copilotkit.ai/ms-agent-python/cookbook/jev-generative-ui,
 * shipped verbatim.
 *
 * The recipe builds this file from two code blocks: step 1 publishes the
 * `candidates` array, then says "add the shape of the UI state to the same
 * file" and publishes the schemas. Both blocks are below, in that order, with
 * nothing between them and nothing changed.
 *
 * This is one of the two published files in the recipe that runs here. It
 * needs zod and nothing else, and it compiles on this repo's zod 4.4.3
 * (declared `^4.4.3`) rather than the `zod@4.6.5` the recipe pins. `readAction`
 * in `./read-action.ts` is the other. Everything that touches Jev, LangChain or
 * AG-UI is quoted on the route page instead, because it cannot run here.
 *
 * One deviation, and it is the location: the recipe puts this at `lib/` with
 * the `@/*` alias pointing at the project root. This repo's alias points at
 * `src/`, and its convention is that a doc page's code lives under that page's
 * route. See README §9 #21.
 */

// `Guidance` below is exported but unused in this repo: its only consumer is
// `choose-panel.ts`, which cannot exist here. Kept so the file stays as
// published.

// [!code highlight]
import { z } from "zod";

export const candidates = [
  { id: "quiet", name: "Quiet room", details: "Enclosed, quiet, one person" },
  { id: "team", name: "Team table", details: "Open, collaborative, six people" },
  { id: "studio", name: "Studio", details: "Enclosed, whiteboard, four people" },
];

export const PanelSchema = z.object({
  type: z.enum(["clarification", "comparison"]),
  title: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
});
export const StateSchema = z.object({
  panel: PanelSchema.nullable().default(null),
  selectedId: z.string().nullable().default(null),
  note: z.string().default(""),
});
export type PickerState = z.infer<typeof StateSchema>;
export type Guidance = { name: string; content: string }[];
export const clarificationOptions = [
  { id: "focus", label: "Quiet focus time" },
  { id: "collaboration", label: "Working with a team" },
];
