"use client";

/**
 * The catalog the browser registers, wiring definitions to renderers.
 *
 * `CATALOG_ID` is half of a contract. The other half is `A2UI_CATALOG_ID` in
 * `backend/agents.py`, which `display_flight` puts in its `createSurface`
 * operation. If the two ever disagree the run still succeeds and the surface
 * still paints — with no component vocabulary, so nothing is drawn and there is
 * no error to read. Change one, change the other.
 */
import { createCatalog } from "@copilotkit/a2ui-renderer";

import { definitions } from "./definitions";
import { renderers } from "./renderers";

export const CATALOG_ID = "copilotkit://flight-fixed-catalog";

export const catalog = createCatalog(definitions, renderers, {
  catalogId: CATALOG_ID,
  // See ./definitions for why the basic catalog stays out of this.
  includeBasicCatalog: false,
});
