/**
 * The CLI half of the doc-drift changelog.
 *
 * `frontend/src/app/lib/doc-sync/changelog.ts` is the other half. Both write the
 * same file, so both must render the same title and intro — a mismatch would
 * mean each writer rewrites the other's header on every run. The section format
 * (`## YYYY-MM-DD`, newest first, KEEP_ENTRIES dated entries) is shared too, so
 * a CLI sync and a `/doc-sync` sync on the same day fold into one entry instead
 * of fighting over the slot.
 *
 * What differs is the body: the UI has annotated hunks to draw from, this has
 * hashes and the two texts. The excerpt here is the first changed region rather
 * than a real diff, and it says so, because claiming more precision than the
 * data supports is how a changelog starts lying.
 *
 * Pure — no fs. The caller owns reading and writing the file.
 */

/** Must match KEEP_ENTRIES in the TypeScript module. */
export const KEEP_ENTRIES = 3;

export const TITLE = '# Doc drift changelog';

export const INTRO = [
  'What the CopilotKit docs changed under this repo, written by whichever sync',
  'ran — the `/doc-sync` page or `npm run drift:sync`. Only pages that actually',
  'moved are recorded — a sync that finds everything unchanged writes nothing',
  'here at all.',
  '',
  `Holds the ${KEEP_ENTRIES} most recent dated entries. When a change lands on a fourth`,
  'date, the oldest entry is dropped. Entries are counted, not aged, so a gap of',
  'weeks between changes does not expire anything.',
].join('\n');

/** Splits an existing changelog into its dated `## YYYY-MM-DD` sections. */
export function splitSections(markdown) {
  const heading = /^## (\d{4}-\d{2}-\d{2})[^\n]*$/gm;
  const found = [];

  for (let m = heading.exec(markdown); m !== null; m = heading.exec(markdown)) {
    found.push({ date: m[1], start: m.index });
  }

  return found.map((entry, i) => {
    const stop = i + 1 < found.length ? found[i + 1].start : markdown.length;
    const block = markdown.slice(entry.start, stop);
    // Drop the heading line itself; it is regenerated on write.
    return { date: entry.date, body: block.replace(/^## [^\n]*\n?/, '').trim() };
  });
}

/**
 * Folds a run into the existing changelog, newest first, pruned to
 * `KEEP_ENTRIES` dated entries.
 *
 * Several runs on one date share that date's entry rather than each claiming a
 * slot, so a day spent re-running the sync cannot evict the two previous dates.
 */
export function mergeChangelog(existing, date, run) {
  const sections = splitSections(existing);
  const sameDay = sections.find((s) => s.date === date);

  if (sameDay) {
    sameDay.body = `${run}\n\n${sameDay.body}`.trim();
  } else {
    sections.push({ date, body: run });
  }

  const kept = sections
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, KEEP_ENTRIES);

  const rendered = kept.map((s) => `## ${s.date}\n\n${s.body}`).join('\n\n---\n\n');
  return `${TITLE}\n\n${INTRO}\n\n${rendered}\n`;
}

/** `HIGH (Code fence count changed)` -> `High` + `Code fence count changed`. */
function splitSeverity(severity) {
  const m = /^([A-Z]+)\s*\((.*)\)\s*$/.exec(severity ?? '');
  if (!m) return { word: 'Info', reason: severity || 'Content changed' };
  return { word: m[1][0] + m[1].slice(1).toLowerCase(), reason: m[2] };
}

const RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function highestSeverity(pages) {
  let best = 'low';
  let bestRank = 0;
  for (const p of pages) {
    const key = /^[A-Z]+/.exec(p.severity ?? '')?.[0] ?? 'LOW';
    if ((RANK[key] ?? 0) > bestRank) {
      bestRank = RANK[key] ?? 0;
      best = key.toLowerCase();
    }
  }
  return best;
}

/**
 * The first changed region, as a diff block.
 *
 * Not a real diff: it walks in from both ends to find the window that actually
 * differs, then prints it. That is exact when a page gains or loses a
 * contiguous block — the common case — and merely wide when edits are
 * scattered, which is why the entry calls it a region and not a diff.
 */
/** Line endings and the BOM are storage details, not changes. */
function normalize(raw) {
  return raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

function excerpt(oldText, newText, max = 8) {
  if (typeof oldText !== 'string' || typeof newText !== 'string') return null;
  // Snapshots on disk may be CRLF (git checkout on Windows) while the fetched
  // page is LF. Without this every line reads as changed and the excerpt is
  // the whole page.
  const a = normalize(oldText).split('\n');
  const b = normalize(newText).split('\n');

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;

  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA -= 1;
    endB -= 1;
  }

  const removed = a.slice(start, endA + 1).filter((l) => l.trim());
  const added = b.slice(start, endB + 1).filter((l) => l.trim());
  if (removed.length === 0 && added.length === 0) return null;

  const half = Math.max(1, Math.floor(max / 2));
  const lines = [
    ...removed.slice(0, half).map((l) => `- ${l.trim()}`),
    ...added.slice(0, max - Math.min(removed.length, half)).map((l) => `+ ${l.trim()}`),
  ];

  const truncated = removed.length + added.length > lines.length;
  // Four backticks: doc pages are full of three-backtick fences, and an excerpt
  // that closes its own container silently corrupts the rest of the file.
  return ['````diff', ...lines, ...(truncated ? ['  … region truncated'] : []), '````'].join('\n');
}

/**
 * One CLI sync's worth of markdown, or null when there is nothing to record.
 *
 * `newPages` are upstream pages this repo tracks nowhere. They are recorded
 * because the whole point of the changelog is that the snapshot overwrites its
 * own evidence: a page that appeared today and was acknowledged tomorrow leaves
 * no other trace.
 */
export function renderRun({ ranAt, pages = [], newPages = [], manifest, source = 'npm run drift:sync' }) {
  if (pages.length === 0 && newPages.length === 0) return null;

  const time = ranAt.slice(11, 16);
  const count = pages.length + newPages.length;
  const lines = [
    `### ${time} UTC — ${count} page${count === 1 ? '' : 's'}, highest severity ` +
      `${highestSeverity(pages)} · _${source}_`,
    '',
  ];

  for (const page of pages) {
    const { word, reason } = splitSeverity(page.severity);
    const routes = manifest?.pages?.[page.docPath]?.routes ?? [];
    const where = [`\`${page.docPath}\``];
    if (routes.length > 0) {
      where.push(`route${routes.length === 1 ? '' : 's'} ${routes.map((r) => `\`${r}\``).join(', ')}`);
    }
    if (page.file) where.push(`\`${page.file}\``);

    lines.push(`**${word} — ${page.docPath}**`, '');
    lines.push(where.join(' · '), '');
    lines.push(
      `${reason}. Hash ${page.oldHash ?? '?'} ➔ ${page.newHash ?? '?'}.`,
      '',
    );
    const diff = excerpt(page.oldText, page.fetchedText);
    if (diff) lines.push(diff, '');
  }

  for (const url of newPages) {
    lines.push(`**New — ${url}**`, '');
    lines.push(
      'Listed upstream, tracked nowhere in this repo. Not snapshotted by this run.',
      '',
    );
  }

  return lines.join('\n').trimEnd();
}
