/* ═══════════════════════════════════════════════
   LegalTek AI — lib/format.js
   Date / money formatters. Was utils.jsx (middle).

   DB DATETIMES → VIEWER'S LOCAL TIME

   The API sends naive strings ("2026-08-13 19:25:00") written in the
   server's zone — APP_TIMEZONE, UTC. `new Date()` reads those as the
   browser's local time, so they used to print verbatim — never converted.
   parseDbDate() tags them with the server zone instead, and the toLocale*
   formatters below render the result wherever the viewer is.
═══════════════════════════════════════════════ */

/* Was window.LT_ENV.APP_TIMEZONE from env.js.php. Must match the zone the
   Express backend writes timestamps in (its own APP_TIMEZONE). */
export const SERVER_TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'UTC';

/** UTC offset of `timeZone`, in ms, at the given instant (DST-aware). */
function tzOffsetMs(date, timeZone) {
  const p = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)) p[part.type] = part.value;

  return Date.UTC(+p.year, +p.month - 1, +p.day,
                  +p.hour % 24, +p.minute, +p.second) - date.getTime();
}

/**
 * Turn any date value the API returns into a real instant.
 *   "2026-08-13T19:25:00Z" / "…-05:00" → offset is explicit, trust it
 *   "2026-08-13 14:25:00"              → wall clock in SERVER_TZ
 *   "2026-08-13"                       → calendar day, no zone shift
 */
export function parseDbDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;

  const s = String(value).trim();
  const plain = (str) => { const d = new Date(str); return isNaN(d) ? null : d; };

  // Already carries a zone (optimistic rows use toISOString()) — browser converts it
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(s)) return plain(s);

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return plain(s);
  const [, y, mo, d, h, mi, se] = m;

  // Date-only (issue_date, due_date…): a calendar day, not an instant.
  // Local midnight keeps it on the same day; UTC midnight would show the day before.
  if (h === undefined) return new Date(+y, +mo - 1, +d);

  // Naive datetime: read the numbers as SERVER_TZ wall clock. Second pass in
  // case the first guess landed on the other side of a DST change.
  const guess = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se ?? 0));
  const once = guess - tzOffsetMs(new Date(guess), SERVER_TZ);
  return new Date(guess - tzOffsetMs(new Date(once), SERVER_TZ));
}

/* ── Date group helper ─────────────────────────────── */
export function dateGroup(dateStr) {
  if (!dateStr) return 'Last month';
  const d = parseDbDate(dateStr);
  if (!d) return 'Last month';
  const now = new Date();
  const diff = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
     new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    / 86400000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff <= 7) return 'This week';
  return 'Last month';
}

/* ── Format time from DB datetime, in the viewer's zone ── */
export function fmtTime(dateStr) {
  const d = parseDbDate(dateStr);
  if (!d) return '';
  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

/* ── Format date for case cards (e.g. "Mar 31, 2026") ─ */
export function fmtDate(dateStr) {
  const d = parseDbDate(dateStr);
  if (!d) return '';
  return d.toLocaleDateString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/* ── Format a number as USD currency (e.g. "$1,250.00") ─ */
export function fmtMoney(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
