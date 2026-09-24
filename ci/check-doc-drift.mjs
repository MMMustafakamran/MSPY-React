import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { mergeChangelog, renderRun } from './lib/changelog.mjs';
import { checkLinkedPageGaps } from './lib/linked-pages.mjs';
import { checkPageCoverage, formatCoverageTable } from './check-page-coverage.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'doc-snapshot', 'manifest.json');
const PAGES_DIR = path.join(ROOT_DIR, 'doc-snapshot', 'pages');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'doc-snapshot', 'CHANGELOG.md');

const CONCURRENCY = 6;
const TIMEOUT_MS = 10000;

function sha256(text) {
  return crypto.createHash('sha256').update(normalizeText(text), 'utf8').digest('hex');
}

function normalizeText(raw) {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function categorizeSeverity(oldText, newText) {
  const oldCodeFences = (oldText.match(/```/g) || []).length;
  const newCodeFences = (newText.match(/```/g) || []).length;
  if (oldCodeFences !== newCodeFences) return 'HIGH (Code fence count changed)';

  const oldCodeLines = oldText.split('\n').filter((l) => l.startsWith('    ') || l.startsWith('```'));
  const newCodeLines = newText.split('\n').filter((l) => l.startsWith('    ') || l.startsWith('```'));
  if (oldCodeLines.join('\n') !== newCodeLines.join('\n')) {
    return 'HIGH (Code block content changed)';
  }

  const oldHeadings = oldText.split('\n').filter((l) => l.startsWith('#')).join('\n');
  const newHeadings = newText.split('\n').filter((l) => l.startsWith('#')).join('\n');
  if (oldHeadings !== newHeadings) {
    return 'MEDIUM (Headings / Structure changed)';
  }

  return 'LOW (Prose / text phrasing updated)';
}

async function checkPage(docPath, pageMeta) {
  const url = `https://docs.copilotkit.ai${docPath}.md`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': 'CopilotKit-DocDrift-Detector/1.0',
        Accept: 'text/markdown, text/plain, */*',
      },
    });

    if (res.status === 404) {
      return {
        docPath,
        file: pageMeta.file,
        status: '404',
        drifted: true,
        severity: 'HIGH (Page 404 / Removed)',
      };
    }

    if (!res.ok) {
      return {
        docPath,
        file: pageMeta.file,
        status: String(res.status),
        error: `HTTP ${res.status} ${res.statusText}`,
        drifted: false,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/markdown') && !contentType.includes('text/plain')) {
      // HTML fallback response (soft 404 or SPA redirect)
      return {
        docPath,
        file: pageMeta.file,
        status: 'invalid-content-type',
        error: `Expected markdown, received ${contentType}`,
        drifted: false,
      };
    }

    const fetchedText = await res.text();
    const fetchedHash = sha256(fetchedText);

    if (fetchedHash === pageMeta.sha256) {
      return { docPath, file: pageMeta.file, drifted: false, status: 'ok' };
    }

    // Hash differs - determine severity
    let oldContent = '';
    try {
      oldContent = await fs.readFile(path.join(PAGES_DIR, pageMeta.file), 'utf8');
    } catch {
      // no previous file
    }

    const severity = categorizeSeverity(oldContent, fetchedText);
    return {
      docPath,
      file: pageMeta.file,
      drifted: true,
      severity,
      // Kept so the changelog can show what moved. The snapshot is overwritten
      // moments later, so this is the only surviving copy of the old text.
      oldText: oldContent,
      oldHash: pageMeta.sha256.slice(0, 8),
      newHash: fetchedHash.slice(0, 8),
      fullHash: fetchedHash,
      fetchedText,
      bytes: Buffer.byteLength(fetchedText, 'utf8'),
      lines: fetchedText.split('\n').length,
      status: 'drifted',
    };
  } catch (err) {
    return {
      docPath,
      file: pageMeta.file,
      drifted: false,
      status: 'fetch-error',
      error: err.message,
    };
  }
}

export async function applyDocUpdates(driftedPages) {
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  let updatedCount = 0;

  for (const p of driftedPages) {
    if (p.fetchedText && p.file) {
      const filePath = path.join(PAGES_DIR, p.file);
      await fs.writeFile(filePath, p.fetchedText, 'utf8');

      if (manifest.pages[p.docPath]) {
        manifest.pages[p.docPath].sha256 = p.fullHash;
        manifest.pages[p.docPath].bytes = p.bytes;
        manifest.pages[p.docPath].lines = p.lines;
        manifest.pages[p.docPath].date = new Date().toUTCString();
      }
      updatedCount++;
      console.log(` ✅ Updated ${p.file} (${p.docPath})`);
    }
  }

  manifest.syncedAt = new Date().toISOString();
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`\n💾 Successfully updated ${updatedCount} markdown file(s) and saved doc-snapshot/manifest.json.`);
  return updatedCount;
}

/**
 * Record the run in doc-snapshot/CHANGELOG.md.
 *
 * Written *after* the snapshot, and from the drifted pages rather than by
 * re-reading it, because applying the update destroys the evidence: the next
 * run compares clean and would have nothing to say. `/doc-sync` has always done
 * this; the CLI did not, so every `npm run drift:sync` synced past a change
 * without leaving a record of it.
 */
async function writeChangelogEntry({ driftedPages, newPages, manifest }) {
  const ranAt = new Date().toISOString();
  const entry = renderRun({ ranAt, pages: driftedPages, newPages, manifest });
  if (!entry) return false;

  let existing = '';
  try {
    existing = await fs.readFile(CHANGELOG_PATH, 'utf8');
  } catch {
    // First change in a fresh clone creates the file.
  }

  await fs.writeFile(CHANGELOG_PATH, mergeChangelog(existing, ranAt.slice(0, 10), entry), 'utf8');
  console.log(`📝 Recorded this sync in doc-snapshot/CHANGELOG.md.`);
  return true;
}

/**
 * The gap the hash check cannot see: pages that appeared upstream.
 *
 * Every URL the sitemap lists under this repo's docs root is either tracked
 * (a manifest page), already acknowledged (`sitemap.knownUnmapped`, seeded by
 * /doc-sync), or new. New is drift -- a page nobody has read, with no route,
 * no recorder entry and no diff. Ten of them were missed on 2026-09-04 because
 * only the in-app /doc-sync action made this comparison and nothing in CI ran
 * it. The same logic as `buildSitemapFinding` in
 * frontend/src/lib/doc-sync/actions.ts, without the Next.js import chain.
 *
 * `lastmod` is ignored on purpose: it is the site's build stamp, not a
 * per-page modification time.
 */
let _manifestCache;
function manifestRoutes(docPath) {
  return (_manifestCache?.pages?.[docPath]?.routes ?? []).join(', ') || '-';
}

export async function checkSitemapGaps(manifest) {
  _manifestCache = manifest;
  const root = new URL(manifest.docsRoot);
  const prefix = `${root.origin}${root.pathname.replace(/\/+$/, '')}/`;

  let xml;
  try {
    const res = await fetch(`${root.origin}/sitemap.xml`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'CopilotKit-DocDrift-Detector/1.0' },
    });
    if (!res.ok) return { error: `sitemap HTTP ${res.status}`, newUnmapped: [], missingFromSitemap: [] };
    xml = await res.text();
  } catch (err) {
    return { error: err.message, newUnmapped: [], missingFromSitemap: [] };
  }

  const upstream = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    // The section root itself is listed without the trailing slash.
    .filter((u) => u.startsWith(prefix) || u === prefix.slice(0, -1));

  const covered = new Set(Object.keys(manifest.pages).map((docPath) => `${root.origin}${docPath}`));
  const known = new Set(manifest.sitemap?.knownUnmapped ?? []);
  const upstreamSet = new Set(upstream);

  return {
    urlsUnderRoot: upstream.length,
    newUnmapped: upstream.filter((u) => !covered.has(u) && !known.has(u)),
    // Tracked but no longer listed. Alone this is a hint, not a removal --
    // the per-page 404 check above is the other half of that verdict.
    missingFromSitemap: [...covered].filter((u) => !upstreamSet.has(u)),
  };
}

export async function checkAllDocDrift() {
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const entries = Object.entries(manifest.pages);

  console.log(`\n🔍 Checking doc drift across ${entries.length} tracked pages against live docs...`);

  const results = [];
  const queue = [...entries];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const [docPath, pageMeta] = item;
      const res = await checkPage(docPath, pageMeta);
      results.push(res);
      process.stdout.write(res.drifted ? '!' : res.error ? '?' : '.');
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  process.stdout.write('\n\n');

  const driftedPages = results.filter((r) => r.drifted);
  const errors = results.filter((r) => r.error);

  const sitemap = await checkSitemapGaps(manifest);
  if (sitemap.error) {
    console.log(`ℹ️  Sitemap unreachable (${sitemap.error}); new upstream pages NOT checked this run.`);
  } else {
    console.log(
      `🗺️  Sitemap: ${sitemap.urlsUnderRoot} URLs under ${manifest.docsRoot}, ` +
        `${sitemap.newUnmapped.length} new, ${sitemap.missingFromSitemap.length} tracked page(s) no longer listed.`,
    );
    for (const u of sitemap.missingFromSitemap) console.log(`   · not in sitemap: ${u}`);
  }

  // The sitemap is not a complete index of every section (see ci/lib/linked-pages.mjs),
  // so the snapshots are read as a second, independent source of page names.
  const linked = await checkLinkedPageGaps(manifest, PAGES_DIR);
  if (linked.error) {
    console.log(`ℹ️  Snapshot link scan failed (${linked.error}); linked-page gaps NOT checked this run.`);
  } else {
    console.log(
      `🔗 Snapshot links: ${linked.scanned} page(s) scanned, ${linked.candidates} in-section link target(s) ` +
        `tracked nowhere — ${linked.untracked.length} live, ${linked.broken.length} dead.`,
    );
  }

  // One list, so a page found by either source is reported once. The sitemap
  // misses whole sections; the link scan misses anything nothing links to.
  const newPages = [...new Set([...(sitemap.newUnmapped ?? []), ...(linked.untracked ?? [])])].sort();

  return {
    total: entries.length,
    checked: results.length,
    drifted: driftedPages.length > 0 || newPages.length > 0,
    driftedPages,
    sitemap,
    linked,
    newPages,
    errors,
  };
}

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const autoUpdate = args.includes('--update') || args.includes('--sync') || args.includes('-u');

  // Scope, said out loud on every run. Tracked pages are hashed; the sitemap
  // is compared for pages that appeared upstream (new = drift, exit 2).
  // Renames and removals are only hinted -- a tracked page that 404s AND has
  // left the sitemap is reported, but nothing here decides it was renamed.
  process.on('exit', () => {
    console.log(
      '\nℹ️  Scope: tracked pages hashed + sitemap compared for new pages.\n' +
        '   A page that 404s and has left the sitemap is listed; whether it was\n' +
        '   renamed is a judgement for /doc-sync and the reader.',
    );
  });

  const result = await checkAllDocDrift();

  // Manifest -> route -> recorder coverage, printed in the same prepare-job
  // output. Reported only: the drift exit code below is decided by drift
  // alone, so a coverage gap never masks (or fakes) a doc change.
  try {
    console.log(formatCoverageTable(checkPageCoverage()));
  } catch (err) {
    console.log(`ℹ️  Page coverage not checked (${err.message}).`);
  }
  console.log('');

  if (result.newPages.length > 0) {
    const fromSitemap = new Set(result.sitemap.newUnmapped ?? []);
    console.log('🆕 [NEW UPSTREAM PAGES] Live upstream, tracked nowhere in this repo:');
    for (const u of result.newPages) {
      // Saying which source found it matters: a page only the link scan sees is
      // also evidence that this section is missing from the sitemap.
      console.log(` • ${u}  ${fromSitemap.has(u) ? '(sitemap)' : '(linked from a tracked page)'}`);
    }
    console.log('   Snapshot them from http://localhost:3020/doc-sync, or add them to\n' +
      '   sitemap.knownUnmapped in doc-snapshot/manifest.json to acknowledge them.\n');
  }
  if (result.linked?.broken?.length > 0) {
    console.log('🔗 [DEAD LINKS IN TRACKED PAGES] In-section links whose markdown endpoint 404s:');
    for (const b of result.linked.broken) console.log(` • ${b.docPath}`);
    console.log('   These are upstream defects, not repo gaps — they belong in the QA report.\n');
  }
  const gone = result.driftedPages.filter((p) => p.status === '404' &&
    result.sitemap.missingFromSitemap?.includes(`https://docs.copilotkit.ai${p.docPath}`));
  if (gone.length > 0) {
    console.log('🗑️  [REMOVED OR RENAMED] 404 on the markdown endpoint AND gone from the sitemap:');
    for (const p of gone) console.log(` • ${p.docPath}  (route(s): ${manifestRoutes(p.docPath)})`);
    console.log('   The route(s) still serve and the recorder still passes them. Decide, then delete.\n');
  }

  if (result.driftedPages.length > 0) {
    console.log('🚨 [DOC DRIFT DETECTED] The following live documentation pages have changed:');
    console.log('───────────────────────────────────────────────────────────────────────────');
    for (const p of result.driftedPages) {
      console.log(` • [${p.severity}] ${p.docPath}`);
      if (p.oldHash && p.newHash) {
        console.log(`   Hash: ${p.oldHash} ➔ ${p.newHash} (${p.file})`);
      }
    }
    console.log('───────────────────────────────────────────────────────────────────────────');

    const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));

    if (autoUpdate) {
      console.log('\n🔄 Applying changes to local markdown snapshot files (--update flag)...');
      await writeChangelogEntry({ driftedPages: result.driftedPages, newPages: result.newPages, manifest });
      await applyDocUpdates(result.driftedPages);
      console.log('✨ Local markdown files are now in sync with live docs.');
      process.exit(0);
    } else {
      if (process.stdin.isTTY) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await rl.question('\n❓ Would you like to update and overwrite the local markdown files now? (y/N): ');
        rl.close();

        if (answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes') {
          console.log('\n🔄 Applying changes to local markdown files...');
          await writeChangelogEntry({ driftedPages: result.driftedPages, newPages: result.newPages, manifest });
      await applyDocUpdates(result.driftedPages);
          console.log('✨ Local markdown files are now in sync with live docs.');
          process.exit(0);
        }
      }

      console.log('\n👉 Local markdown files NOT modified. Pass `--update` or visit http://localhost:3020/doc-sync to sync.');
      process.exit(2);
    }
  }
  if (result.driftedPages.length === 0) {
    // A sync cannot clear this: nothing was snapshotted, so there is no entry to
    // write and the gate stays shut until the page is tracked or acknowledged.
    if (result.newPages.length > 0) process.exit(2);
    console.log(`✅ [NO DOC DRIFT] All ${result.total} documentation pages match the local snapshot.`);
    if (result.errors.length > 0) {
      console.log(`ℹ️  Note: ${result.errors.length} page(s) could not be fetched due to network timeout.`);
    }
    process.exit(0);
  }
}
