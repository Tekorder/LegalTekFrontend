/* ═══════════════════════════════════════════════
   LegalTek AI — lib/api.js
   API helpers for the Express backend.

   One endpoint, one action parameter:
       GET  <API>?action=cases.list&case_id=3
       POST <API>?action=messages.send      (JSON body)
       POST <API>?action=documents.upload   (multipart body)
   Every response is { success: bool, data?: any, error?: string }.
═══════════════════════════════════════════════ */

/* Default "/api" is same-origin and proxied to Express by the rewrite in
   next.config.mjs. */
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

/* ── Response envelope ─────────────────────────────────
   Read the body as text first, then parse. res.json() on a non-JSON body
   fails with "Unexpected token 'I'" (Next's proxy answers a plain-text
   "Internal Server Error" when the backend is down), which says nothing
   about the actual problem. */
async function unwrap(res, action) {
  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    if (res.status === 500 || res.status === 502 || res.status === 504) {
      throw new Error(
        `Cannot reach the API for "${action}" (HTTP ${res.status}). ` +
        `Is the Express backend running at BACKEND_URL?`
      );
    }
    throw new Error(
      `"${action}" returned ${res.status} but not JSON: ${text.slice(0, 120) || '(empty body)'}`
    );
  }

  if (!json.success) throw new Error(json.error ?? 'API error');
  return json.data;
}

/* ── API helpers ───────────────────────────────────── */
export async function apiFetch(action, params = {}) {
  const url = `${API}?action=${action}&${new URLSearchParams(params)}`;
  const res = await fetch(url);
  return unwrap(res, action);
}

/** opts.signal — pass an AbortController signal to cancel a long call (see AppShell) */
export async function apiPost(action, body = {}, opts = {}) {
  const res = await fetch(`${API}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  return unwrap(res, action);
}

export async function apiUpload(action, formData, opts = {}) {
  const res = await fetch(`${API}?action=${action}`, {
    method: 'POST',
    body: formData,
    signal: opts.signal,
  });
  return unwrap(res, action);
}
