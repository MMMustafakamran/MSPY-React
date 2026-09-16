/**
 * New-page discovery that does not depend on the sitemap.
 *
 * The sitemap is the only thing `checkSitemapGaps` reads, and for some sections
 * it is close to empty: docs.copilotkit.ai lists 4 URLs under /angular/agno and
 * none at all under /angular/agno/intelligence, while listing 10 intelligence
 * pages for each React flavour. A section that is missing from the sitemap has
 * no new-page detection at all, silently — the run still prints a tidy
 * "0 new" and exits 0.
 *
 * This reads the other source we already have: the snapshots themselves. Doc
 * pages link to their siblings, so a page this repo should be tracking is
 * almost always named by a page it already tracks. That is how
 * /angular/agno/intelligence/quickstart hid — linked twice from the tracked
 * Intelligence overview, absent from the sitemap, tracked nowhere.
 *
 * Two outcomes, deliberately kept apart:
 *   - `untracked` — the link resolves, the page is real, this repo ignores it.
 *   - `broken`    — the link 404s. That is a defect in the docs, not a gap here.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const TIMEOUT_MS = 10000;
const CONCURRENCY = 6;

/** Markdown links, minus anchors, mail/external schemes and image embeds. */
function linkedPaths(text) {
  const out = new Set();
  for (const m of text.matchAll(/(?<!!)\[[^\]]*\]\((\/[^)\s"'#]+)(?:#[^)\s]*)?\)/g)) {
    const p = m[1].replace(/\/+$/, '');
    // `.md`, `.png` and friends are assets or already-resolved endpoints.
    if (/\.[a-z0-9]{1,5}$/i.test(p)) continue;
    out.add(p);
  }
  return out;
}

async function resolves(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'CopilotKit-DocDrift-Detector/1.0' },
    });
    return res.status;
  } catch {
    return 0; // unreachable — reported as unknown rather than guessed at
  }
}

/**
 * @param manifest  the parsed doc-snapshot/manifest.json
 * @param pagesDir  absolute path to doc-snapshot/pages
 */
export async function checkLinkedPageGaps(manifest, pagesDir) {
  const root = new URL(manifest.docsRoot);
  const section = root.pathname.replace(/\/+$/, '');

  let files;
  try {
    files = (await fs.readdir(pagesDir)).filter((f) => f.endsWith('.md'));
  } catch (err) {
    return { error: err.message, untracked: [], broken: [], scanned: 0 };
  }

  const candidates = new Set();
  for (const file of files) {
    const text = await fs.readFile(path.join(pagesDir, file), 'utf8');
    for (const p of linkedPaths(text)) {
      // Only this repo's own section. A link to /slack or /reference/angular is
      // another section's business, and claiming it here would bury the signal.
      if (p === section || !p.startsWith(`${section}/`)) continue;
      candidates.add(p);
    }
  }

  const tracked = new Set(Object.keys(manifest.pages));
  const known = new Set(
    (manifest.sitemap?.knownUnmapped ?? []).map((u) => {
      try {
        return new URL(u).pathname.replace(/\/+$/, '');
      } catch {
        return String(u).replace(/\/+$/, '');
      }
    }),
  );

  const unknown = [...candidates].filter((p) => !tracked.has(p) && !known.has(p)).sort();

  const untracked = [];
  const broken = [];
  const queue = [...unknown];

  async function worker() {
    while (queue.length > 0) {
      const docPath = queue.shift();
      if (!docPath) break;
      // The markdown endpoint is what the drift checker would hash, so it is the
      // endpoint that decides whether this page is trackable at all.
      const status = await resolves(`${root.origin}${docPath}.md`);
      if (status === 200) untracked.push(`${root.origin}${docPath}`);
      else if (status === 404) broken.push({ docPath, status });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return {
    scanned: files.length,
    candidates: unknown.length,
    untracked: untracked.sort(),
    broken: broken.sort((a, b) => a.docPath.localeCompare(b.docPath)),
  };
}
