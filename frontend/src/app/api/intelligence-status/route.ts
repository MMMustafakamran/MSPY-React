import { NextResponse } from "next/server";

/**
 * Whether this server actually holds the credentials the Intelligence
 * Quickstart's step 1 writes.
 *
 * The demo strip on `/intelligence/quickstart/demo-chat` needs to say more than
 * "a thread list rendered". `npx copilotkit@latest login` + `project select`
 * write `CPK_INTELLIGENCE_API_KEY` into `.env`, so the honest question the clip
 * has to answer is: is *that key* present on the server, and does the store it
 * points at return this run's thread?
 *
 * Only the last four characters are returned. Enough to tell two projects
 * apart on screen, useless to anyone who reads the recording.
 */

const firstSet = (...values: (string | undefined)[]) =>
  values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim();

export function GET() {
  const key = firstSet(
    process.env.CPK_INTELLIGENCE_API_KEY,
    process.env.INTELLIGENCE_API_KEY,
  );
  const license = firstSet(process.env.COPILOTKIT_LICENSE_TOKEN);

  return NextResponse.json({
    configured: Boolean(key && license),
    hasKey: Boolean(key),
    hasLicense: Boolean(license),
    keyTail: key ? key.slice(-4) : null,
  });
}
