/**
 * Checks that run before anything expensive starts.
 *
 * Each one exists because it actually cost a run:
 *  - a stale server still holding a port served requests with an old API key
 *    while a freshly started one sat beside it
 *  - a placeholder OPENAI_API_KEY let all 20 pages record and fail on 401,
 *    discovered only at the end
 *  - Next.js compiles routes on demand, and the cold first hit blew the
 *    recorder's preflight timeout
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BACKEND_PORT, FRONTEND_DIR, FRONTEND_PORT, FRONTEND_URL, isWindows } from './config.mjs';

/** PIDs currently listening on a port. Empty when the port is free. */
export function listenersOnPort(port) {
  try {
    if (isWindows) {
      const out = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const pids = out
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid) && pid !== '0');
      return [...new Set(pids)];
    }
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return [...new Set(out.split(/\r?\n/).filter(Boolean))];
  } catch {
    // Non-zero exit from netstat/lsof means "nothing matched".
    return [];
  }
}

/**
 * Refuse to start on top of an already-bound port.
 *
 * Windows will happily let a second process bind a port another process is
 * already listening on, and requests then land on whichever accepts first. A
 * stale server carrying old environment variables is indistinguishable from
 * the new one, so this fails loudly instead of guessing.
 */
export function assertPortsFree({ allowReuse = false } = {}) {
  const conflicts = [];
  for (const [name, port] of [
    ['backend', BACKEND_PORT],
    ['frontend', FRONTEND_PORT],
  ]) {
    const pids = listenersOnPort(port);
    if (pids.length > 0) conflicts.push({ name, port, pids });
  }

  const busy = { backend: false, frontend: false };
  for (const c of conflicts) busy[c.name] = true;

  if (conflicts.length === 0) return busy;

  console.error('\n🔍 [Preflight] Ports already in use:');
  for (const c of conflicts) {
    console.error(`   [x] ${c.name} port ${c.port} held by PID(s): ${c.pids.join(', ')}`);
  }

  if (allowReuse) {
    console.warn(
      '   ⚠️ --allow-port-reuse given; recording against these servers and not starting new ones.\n',
    );
    return busy;
  }

  console.error(
    '\n❌ Refusing to start a second server on a busy port — a stale process may hold\n' +
      '   outdated environment variables and answer requests instead of the new one.\n' +
      '   Stop the listed PIDs, or pass --allow-port-reuse to record against them.\n',
  );
  throw new Error(`Port(s) in use: ${conflicts.map((c) => `${c.name}:${c.port}`).join(', ')}`);
}

/**
 * Confirm a usable model credential before recording anything.
 *
 * Cheap here, expensive later: without it every page records a full demo that
 * can only end in an auth error.
 */
export async function assertModelCredentials() {
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (azureEndpoint) {
    if (!process.env.AZURE_OPENAI_API_KEY) {
      throw new Error('AZURE_OPENAI_ENDPOINT is set but AZURE_OPENAI_API_KEY is missing.');
    }
    console.log('✅ [Preflight] Azure OpenAI credentials present (not verified live).');
    return;
  }

  if (!openaiKey || openaiKey.trim() === '' || openaiKey.trim() === 'sk-...') {
    throw new Error(
      'OPENAI_API_KEY is missing or still the .env.example placeholder ("sk-...").\n' +
        'Set a real key in backend/.env or the repo-root .env before recording.',
    );
  }

  process.stdout.write('⏳ [Preflight] Verifying model credentials... ');
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${openaiKey}` },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 401 || res.status === 403) {
      process.stdout.write('❌\n');
      throw new Error(`OPENAI_API_KEY rejected by OpenAI (HTTP ${res.status}).`);
    }
    if (!res.ok) {
      // Rate limits or transient 5xx are not a reason to block a run.
      process.stdout.write(`⚠️ inconclusive (HTTP ${res.status}); continuing.\n`);
      return;
    }
    process.stdout.write('✅ valid\n');
  } catch (err) {
    if (err instanceof Error && /rejected by OpenAI/.test(err.message)) throw err;
    process.stdout.write('⚠️ could not reach OpenAI; continuing.\n');
    return;
  }

  // A valid key with no balance passes /v1/models and then fails every
  // prompt. On 2026-09-11 that recorded 30 "agent never answered" pages
  // across the repos before anyone read a backend log. One one-token
  // completion tells the difference up front.
  process.stdout.write('⏳ [Preflight] Verifying model balance... ');
  try {
    const model = process.env.OPENAI_CHAT_MODEL_ID || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429) {
      const body = await res.text().catch(() => '');
      if (/insufficient_quota|credit_balance|no credits/i.test(body)) {
        process.stdout.write('❌\n');
        throw new Error(
          'OpenAI account has no credits remaining (insufficient_quota). ' +
            'Every page would record an agent that never answers. Add credits, then re-run.',
        );
      }
      process.stdout.write('⚠️ rate limited; continuing.\n');
      return;
    }
    process.stdout.write(res.ok ? '✅ has balance\n' : `⚠️ inconclusive (HTTP ${res.status}); continuing.\n`);
  } catch (err) {
    if (err instanceof Error && /no credits remaining/.test(err.message)) throw err;
    process.stdout.write('⚠️ could not probe; continuing.\n');
  }
}

/**
 * Refuse to record the Rich Threads pages on an expired Intelligence license.
 *
 * `COPILOTKIT_LICENSE_TOKEN` is a signed JWT whose `exp` is what eventually
 * locks the prebuilt drawer. When that happens nothing errors: the drawer
 * renders a "requires a license" panel, the headless routes answer read-only,
 * and a recording of either passes — a green clip of a locked feature. The
 * expiry is decoded here, offline, so the run fails before that footage exists.
 *
 * The token lives in frontend/.env.local (Next.js does not read the files
 * env.mjs loads), so this reads that file directly. Absent token: the threads
 * pages degrade by design, so only a warning is printed.
 */
export function assertThreadsLicenseFresh({ warnWithinDays = 7 } = {}) {
  let token = process.env.COPILOTKIT_LICENSE_TOKEN;
  if (!token) {
    try {
      const raw = readFileSync(path.join(FRONTEND_DIR, '.env.local'), 'utf8');
      const m = raw.match(/^\s*COPILOTKIT_LICENSE_TOKEN\s*=\s*["']?([^"'\r\n]+)/m);
      token = m?.[1]?.trim();
    } catch {
      /* no .env.local */
    }
  }

  if (!token) {
    console.warn('⚠️ [Preflight] COPILOTKIT_LICENSE_TOKEN not set; /threads/* will record locked.');
    return;
  }

  let exp;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    exp = typeof payload.exp === 'number' ? payload.exp * 1000 : undefined;
  } catch {
    throw new Error('COPILOTKIT_LICENSE_TOKEN is not a decodable JWT.');
  }
  if (!exp) {
    console.warn('⚠️ [Preflight] License token carries no exp claim; cannot check expiry.');
    return;
  }

  const daysLeft = (exp - Date.now()) / 86_400_000;
  const when = new Date(exp).toISOString().slice(0, 10);
  if (daysLeft <= 0) {
    throw new Error(
      `COPILOTKIT_LICENSE_TOKEN expired on ${when}. The threads drawer renders locked and the\n` +
        '   recording would still pass. Re-mint with `npx copilotkit@latest init` or pass\n' +
        '   --skip-license-check to record the other pages.',
    );
  }
  if (daysLeft <= warnWithinDays) {
    console.warn(`⚠️ [Preflight] License token expires ${when} (${daysLeft.toFixed(1)} days).`);
    return;
  }
  console.log(`✅ [Preflight] License token valid until ${when}.`);
}
