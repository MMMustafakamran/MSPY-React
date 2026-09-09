// zod 3, not the zod 4 the rest of this app is on, and not a preference.
//
// `@copilotkit/a2ui-renderer` depends on zod ^3.25 and its catalog API leaks
// that: `CatalogDefinitions` is typed against zod 3's `ZodObject`, so a zod 4
// schema does not type-check. Casting past that would build and then fail
// silently, which is the part worth knowing — the props schema is not just
// documentation. `GenericBinder` in `@a2ui/web_core` walks it with
// `_def.typeName` and `_def.shape()` to decide which props are `{ path }`
// bindings, and zod 4 moved both. A zod 4 catalog paints a surface whose
// bindings are never resolved: the card renders, with every value blank.
//
// Two copies of zod 3 in one tree is fine here. The binder matches on
// `typeName` strings rather than `instanceof` precisely so a schema built by a
// different module instance still reads correctly — its own comment says so.
//
// See README §9, known issue 14. Everything else in this app, including the zod schemas the
// frontend tools are declared with, stays on zod 4.
import { z } from "zod-v3";
import type { CatalogDefinitions } from "@copilotkit/a2ui-renderer";

/**
 * The component vocabulary the agent's fixed schema is written against.
 *
 * Definitions are platform-agnostic — Zod props and a description each. The
 * React half lives in `./renderers`, and `createCatalog` type-checks one
 * against the other, so a schema that outgrows the renderers fails the build
 * rather than painting an empty surface at runtime.
 *
 * Deliberately self-contained: the catalog does NOT merge CopilotKit's basic
 * catalog. `includeBasicCatalog: true` would give the schema `Row`, `Column`
 * and `Text` for free, but it also makes the renderer resolve
 * `https://a2ui.org/specification/v0_9/basic_catalog.json` at paint time, and
 * that fetch is the single point of failure behind DeepAgentspy-react's
 * "Catalog not found" finding on this same page. Two components declared here
 * need no network at all, and the layout they would have composed is the
 * renderer's job under a fixed schema anyway.
 */

/**
 * A prop that is either a literal or a `{ path }` binding into the data model.
 * The binder resolves bindings before render, so renderers only see strings —
 * see the `s()` helper in `./renderers`.
 */
const DynString = z.union([z.string(), z.object({ path: z.string() })]);

export const definitions = {
  FlightCard: {
    description:
      "The itinerary card: origin and destination airport codes, the airline, " +
      "and one child component holding the fare.",
    props: z.object({
      origin: DynString,
      destination: DynString,
      airline: DynString,
      child: z
        .string()
        .describe("The id of the child component rendered in the card footer."),
    }),
  },
  PriceTag: {
    description: "A stylized total price, e.g. '$289'.",
    props: z.object({
      amount: DynString,
    }),
  },
} satisfies CatalogDefinitions;

export type Definitions = typeof definitions;
