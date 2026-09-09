"use client";

/**
 * The React half of the catalog — one renderer per entry in `./definitions`.
 *
 * `CatalogRenderers<Definitions>` ties the two together: a renderer missing,
 * misnamed, or reading a prop the definition does not declare is a type error,
 * not a blank surface.
 */
import type { CatalogRenderers } from "@copilotkit/a2ui-renderer";

import type { Definitions } from "./definitions";

/**
 * `DynString` props are typed `string | { path }`, but the binder resolves the
 * binding before the renderer runs — a renderer only ever receives the resolved
 * string. One helper keeps that narrowing in a single place.
 */
const s = (v: unknown): string => (typeof v === "string" ? v : "");

export const renderers: CatalogRenderers<Definitions> = {
  FlightCard: ({ props, children }) => (
    <div
      data-testid="a2ui-flight-card"
      className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        Itinerary
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-2xl font-semibold tracking-wider text-slate-900 dark:text-slate-100">
          {s(props.origin)}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-3 shrink-0 text-slate-400"
          aria-hidden
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
        <span className="font-mono text-2xl font-semibold tracking-wider text-slate-900 dark:text-slate-100">
          {s(props.destination)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {s(props.airline)}
        </span>
        {props.child ? children(props.child) : null}
      </div>
    </div>
  ),

  PriceTag: ({ props }) => (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        Total
      </span>
      <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100">
        {s(props.amount)}
      </span>
    </div>
  ),
};
