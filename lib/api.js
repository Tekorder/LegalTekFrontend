/* ═══════════════════════════════════════════════
   LegalTek AI — lib/api.js
   API helpers. Was utils.jsx (top half) + env.js.php.

   The action-based contract from api.php is unchanged, so the Express
   backend can be a direct port:
       GET  <API>?action=cases.list&case_id=3
       POST <API>?action=messages.send      (JSON body)
       POST <API>?action=documents.upload   (multipart body)
   Every response is { success: bool, data?: any, error?: string }.
═══════════════════════════════════════════════ */

/* Was window.LT_ENV.API_URL, injected by env.js.php. Default "/api" is
   same-origin and proxied to Express by the rewrite in next.config.mjs. */
export const API = process.env.NEXT_PUBLIC_API_URL || '/api';
export const API_URL = API;

const LT_USER_ID_KEY = 'lt_user_id';

/** Demo: MySQL user_id from users.sync_firebase, persisted after Firebase login */
export function getUserId() {
  if (typeof window === 'undefined') return 1;   // no localStorage during SSR
  try {
    const v = window.localStorage.getItem(LT_USER_ID_KEY);
    if (v !== null && v !== '') {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (_) {}
  return 1;
}

export function setUserId(id) {
  const n = parseInt(id, 10);
  if (Number.isNaN(n) || n < 1) return;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LT_USER_ID_KEY, String(n));
  } catch (_) {}
}

/** Call when Firebase signs out (demo: next login re-syncs user_id) */
export function clearUserId() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LT_USER_ID_KEY);
  } catch (_) {}
}

/* ── API helpers ───────────────────────────────────── */
export async function apiFetch(action, params = {}) {
  const url = `${API}?action=${action}&${new URLSearchParams(params)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'API error');
  return json.data;
}

/** opts.signal — pass an AbortController signal to cancel a long call (see AppShell) */
export async function apiPost(action, body = {}, opts = {}) {
  const res = await fetch(`${API}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'API error');
  return json.data;
}

export async function apiUpload(action, formData, opts = {}) {
  const res = await fetch(`${API}?action=${action}`, {
    method: 'POST',
    body: formData,
    signal: opts.signal,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Upload error');
  return json.data;
}
