"use client";

import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import type { ReactNode } from "react";

/**
 * One provider for the whole app, so chat state survives navigation between
 * test routes. Pages needing an isolated conversation ask for one with a
 * `threadId` rather than a second provider.
 *
 * Two notes on the props:
 *
 * `showDevConsole="auto"` mounts the Inspector on localhost. It is needed
 * because `CopilotKitProvider` defaults it to false — `<CopilotKit>` is the
 * component that takes `enableInspector` and defaults to on. Never mount
 * `<CopilotKitInspector />` by hand: it forwards `core ?? null`, so a bare
 * instance reports "CopilotKit core not attached".
 *
 * `headers` is how the Authentication page forwards a bearer token to the
 * AG-UI server. It is only sent when a token is configured, so the app runs
 * unauthenticated by default.
 */

const RUNTIME_URL = "/api/copilotkit";

// No `publicLicenseKey`. As of the 2026-09-15 sync the Threads Drawer page
// publishes the provider with `runtimeUrl` alone and states the drawer resolves
// its entitlement through the Runtime, so the credential is server-side
// configuration rather than a prop here. See `lib/intelligence-runtime.ts`.
//
// /ms-agent-python/inspector used to contradict that by publishing
// `publicLicenseKey` on the provider. The 2026-09-21 sync replaced the prop
// with `runtimeUrl="/api/copilotkit"`, so the two pages now agree and no
// tracked page sets a browser-side key any more.
const AUTH_TOKEN = process.env.NEXT_PUBLIC_AUTH_BEARER_TOKEN;

export function Providers({ children }: { children: ReactNode }) {
  return (
    // [1] quickstart / inspector / authentication: provider
    // [!code highlight]
    <CopilotKitProvider
      runtimeUrl={RUNTIME_URL}
      {...(AUTH_TOKEN
        ? { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        : {})}
      showDevConsole="auto"
      onError={(event) => {
        console.error(`[CopilotKit ${event.code}]`, event.error);
      }}
    >
      {children}
    </CopilotKitProvider>
  );
}
