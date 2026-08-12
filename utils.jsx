/* ═══════════════════════════════════════════════
   LegalTek AI — utils.jsx
   Shared utilities: API helpers, icons, formatters
   Loaded first — exposes everything via window.LT
═══════════════════════════════════════════════ */

/* ── API base ──────────────────────────────────────────
   Comes from .env via env.js.php (window.LT_ENV.API_URL).
   The literal below is only a fallback if env.js.php didn't load. */
const API = window.LT_ENV?.API_URL || "http://localhost/LegalTek/api.php";

const LT_USER_ID_KEY = "lt_user_id";

/** Demo: MySQL user_id from users.sync_firebase, persisted after Firebase login */
function getUserId() {
  try {
    const v = localStorage.getItem(LT_USER_ID_KEY);
    if (v !== null && v !== "") {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (_) {}
  return 1;
}

function setUserId(id) {
  const n = parseInt(id, 10);
  if (Number.isNaN(n) || n < 1) return;
  try {
    localStorage.setItem(LT_USER_ID_KEY, String(n));
  } catch (_) {}
  window.USER_ID = n;
}

/** Call when Firebase signs out (demo: next login re-syncs user_id) */
function clearUserId() {
  try {
    localStorage.removeItem(LT_USER_ID_KEY);
  } catch (_) {}
  window.USER_ID = 1;
}

window.USER_ID = getUserId();

/* ── API helpers ───────────────────────────────────── */
async function apiFetch(action, params = {}) {
  const url = `${API}?action=${action}&${new URLSearchParams(params)}`;
  const res  = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "API error");
  return json.data;
}

async function apiPost(action, body = {}) {
  const res = await fetch(`${API}?action=${action}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "API error");
  return json.data;
}

async function apiUpload(action, formData) {
  const res  = await fetch(`${API}?action=${action}`, { method: "POST", body: formData });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Upload error");
  return json.data;
}

/* ── Date group helper ─────────────────────────────── */
function dateGroup(dateStr) {
  if (!dateStr) return "Last month";
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
     new Date(d.getFullYear(),   d.getMonth(),   d.getDate()))
    / 86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7)  return "This week";
  return "Last month";
}

/* ── Format time from DB datetime ─────────────────── */
function fmtTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
}

/* ── Format date for case cards (e.g. "Mar 31, 2026") ─ */
function fmtDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/* ── Format a number as USD currency (e.g. "$1,250.00") ─ */
function fmtMoney(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/* ══════════════════════════════════════════════════════
   SVG ICONS
══════════════════════════════════════════════════════ */
const SVG_PATHS = {
  shield:   "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  plus:     "M12 5v14M5 12h14",
  send:     "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  file:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  fileplus: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6",
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  close:    "M18 6L6 18M6 6l12 12",
  settings: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  spinner:  "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  empty:    "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  users:       "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  userplus:    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6",
  folder:      "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  folderopen:  "M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-1.72.97L5 19z",
  pencil:      "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  chevright:   "M9 18l6-6-6-6",
  home:        "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  maximize:    "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
  minimize:    "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3",
  link:        "M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L16 13M14 11a5 5 0 0 1 0 7l-1.5 1.5a5 5 0 0 1-7-7l2-2",
  chart:       "M4 19h16M4 15l4-8 4 5 4-9 4 6",
  dollar:      "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  calendar:    "M8 2v4M16 2v4M3.5 9h17M4 4h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
};

function Ico({ name, size = 18, stroke = "currentColor", strokeWidth = 2, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={SVG_PATHS[name] ?? ""} />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   MINI-MARKDOWN RENDERER  (**bold**, bullet •, newlines)
══════════════════════════════════════════════════════ */
function RenderContent({ text }) {
  return (
    <>
      {text.split("\n").map((line, idx) => {
        if (!line.trim()) return <br key={idx} />;
        const parts    = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, i) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={i} className="text-purple-300 font-semibold">{p.slice(2, -2)}</strong>
            : p
        );
        return <p key={idx} className="mb-0.5 leading-relaxed">{rendered}</p>;
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SPINNER
══════════════════════════════════════════════════════ */
function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      className="animate-spin">
      <path d={SVG_PATHS.spinner} />
    </svg>
  );
}

/* ── Expose to global scope for other scripts ──────── */
window.API           = API;
window.getUserId     = getUserId;
window.setUserId     = setUserId;
window.clearUserId   = clearUserId;
window.apiFetch      = apiFetch;
window.apiPost       = apiPost;
window.apiUpload     = apiUpload;
window.dateGroup     = dateGroup;
window.fmtTime       = fmtTime;
window.fmtDate       = fmtDate;
window.fmtMoney      = fmtMoney;
window.SVG_PATHS     = SVG_PATHS;
window.Ico           = Ico;
window.RenderContent = RenderContent;
window.Spinner       = Spinner;
