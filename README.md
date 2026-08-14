# LegalTek AI — Frontend (Next.js)

React frontend for LegalTek AI: cases, clients, documents, hearings, billing and
the AI chat. Migrated from the PHP/XAMPP + Babel-in-the-browser setup to the
Next.js App Router.

The API it talks to is **Express**, living in `../LegaltekBackend` (not written
yet — see [Backend contract](#backend-contract)). The database stays **MySQL**.

---

## Running it

```bash
npm install
```

```bash
cp .env.local.example .env.local
```

```bash
npm run dev
```

Opens on http://localhost:3000. Until the Express backend exists you get the
login screen (Firebase Auth is independent of the API); every `/api` call
fails until `BACKEND_URL` points at something real.

`npm run build` → production bundle, `npm start` → serve it.

---

## Layout

```
app/
  layout.jsx        Was index.html — fonts, global CSS, <div id="app-root">
  page.jsx          Was the Root component in app.jsx — Firebase auth gate,
                    users.sync_firebase, then Cases / Clients / Account home
  globals.css       Was global.css, plus the @tailwind directives and the
                    scanShimmer keyframe that DocEditViewer used to inject
components/
  AppShell.jsx      Was the App component in app.jsx — the case workspace
  *.jsx             The original components, now ESM modules
lib/
  api.js            Was utils.jsx (API helpers) + env.js.php
  format.js         Was utils.jsx (parseDbDate + the fmt* helpers)
  icons.jsx         Was utils.jsx (Ico, Spinner, RenderContent, SVG_PATHS)
  firebase.js       Was firebase-config.js, on the modular SDK
_legacy_php/        The old app, kept as the reference for the Express port
```

`@/` resolves to the project root (`jsconfig.json`), so `@/lib/api`,
`@/components/Sidebar`, etc.

---

## What the migration changed

| Before | After |
| --- | --- |
| `<script type="text/babel">` + Babel standalone in the browser | Next.js compiles the JSX ahead of time |
| Every symbol on `window` (`window.Ico = Ico`) | `export` / `import` |
| Tailwind via CDN + inline `tailwind.config` | `tailwindcss` in the build, `tailwind.config.js` |
| Firebase compat SDK off gstatic (`firebase.auth()`) | `firebase` npm package, modular API |
| Keys hardcoded in `firebase-config.js` | `NEXT_PUBLIC_FIREBASE_*` in `.env.local` |
| `env.js.php` echoing `window.LT_ENV` | `process.env.NEXT_PUBLIC_*`, inlined at build |
| `API_URL` → `api.php` | `NEXT_PUBLIC_API_URL` → `/api`, proxied to Express |

Component logic, markup, styling and the API call shapes are unchanged — this
was a packaging migration, not a rewrite.

Two things that had to change to survive server rendering:

- `DocEditViewer.jsx` injected a `<style>` into `document.head` at import time.
  That runs during SSR, where `document` doesn't exist. The keyframe moved to
  `globals.css`.
- `getUserId()` reads `localStorage`, so it now returns the `1` default when
  called on the server instead of throwing.

Fonts stay on a plain `<link>` to Google Fonts rather than `next/font`:
`next/font` downloads the woff2 at **build** time, so a build machine without
access to `fonts.gstatic.com` fails the whole build.

---

## Environment

`.env.local` — see `.env.local.example` for the annotated version.

| Variable | Used by | Notes |
| --- | --- | --- |
| `BACKEND_URL` | `next.config.mjs` | Express origin. Server-side only, never bundled. Restart to change. |
| `NEXT_PUBLIC_API_URL` | browser | Default `/api` (same origin → no CORS). |
| `NEXT_PUBLIC_APP_TIMEZONE` | browser | **Must match the backend's `APP_TIMEZONE`.** MySQL datetimes come back naive; the UI reads them as wall clock in this zone before converting to the viewer's local time. A mismatch shifts every timestamp. |
| `NEXT_PUBLIC_FIREBASE_*` | browser | Public by design — Firebase gates access with security rules and authorized domains. |

`NEXT_PUBLIC_*` values are inlined into the client bundle at build time. Nothing
secret goes in one. DB credentials, the Ollama host and the CourtListener token
belong to the backend's own `.env` (the old root `.env` and
`_legacy_php/config.php` have the current values).

### Request flow

```
browser ──/api?action=…──> Next.js (rewrite in next.config.mjs) ──> Express (BACKEND_URL)
```

Same-origin from the browser's point of view, so no CORS config, no preflight on
uploads, and `BACKEND_URL` never reaches the client. To deploy them separately
instead, set `NEXT_PUBLIC_API_URL` to Express's absolute URL and enable `cors()`
over there.

---

## Backend contract

The frontend was left on the exact contract `api.php` implemented, so the
Express port can be a direct translation. `_legacy_php/api.php` is the reference
implementation and `legaltek.sql` is the schema.

**Routing** — one query parameter selects the handler:

```
GET  /api?action=cases.list&user_id=1
POST /api?action=messages.send        Content-Type: application/json
POST /api?action=documents.upload     Content-Type: multipart/form-data
```

**Response envelope** — always JSON, always this shape:

```json
{ "success": true,  "data": { } }
{ "success": false, "error": "Human-readable message" }
```

The client throws `new Error(json.error)` whenever `success` is false, so the
HTTP status matters less than the envelope.

### Actions

| Group | Actions |
| --- | --- |
| Cases | `cases.list` `cases.create` `cases.update` `cases.delete` `cases.members` `cases.invite` `cases.remove_member` |
| Clients | `clients.list` `clients.create` `clients.update` `clients.delete` |
| Case ↔ client | `cases.clients` `cases.add_client` `cases.remove_client` |
| Invoices | `invoices.list` `invoices.get` `invoices.create` `invoices.update` `invoices.update_status` `invoices.delete` |
| Hearings | `hearings.list` `hearings.get` `hearings.create` `hearings.update` `hearings.delete` |
| Users | `users.list` `users.find_by_email` `users.sync_firebase` |
| Conversations | `conversations.list` `conversations.create` `conversations.rename` `conversations.delete` `conversations.members` `conversations.add_member` `conversations.remove_member` |
| Messages | `messages.list` `messages.send` |
| Folders | `folders.list` `folders.create` `folders.rename` `folders.delete` |
| Documents | `documents.get` `documents.list` `documents.list_all` `documents.upload` `documents.create_empty` `documents.save_text` `documents.delete` `documents.ai_edit` `documents.export_docx` |

`documents.export_docx` is the one action that does **not** return the JSON
envelope — it streams a `.docx` blob, and `DocsPanel` fetches it directly.

### Behaviours the UI depends on

- **`users.sync_firebase`** takes `{ firebase_uid, email, name, photo_url }` and
  must return `{ user_id, personal_case }`. The app blocks on it at login: no
  `personal_case` means the workspace never opens.
- **`messages.send`** may return `{ cancelled: true }` when the conversation was
  deleted mid-generation. The client also aborts the request itself
  (`AbortController`) on delete, so the handler should notice the client hung up
  and stop the model rather than finish generating.
- **`messages.send`** returns `{ user_message, ai_message }`, and `ai_message`
  is `null` when the AI shouldn't answer — group chats only get a reply when the
  message mentions `@Waldy`.
- **Datetimes** go over the wire as naive MySQL strings (`2026-08-13 19:25:00`)
  in `APP_TIMEZONE`. Keep writing them that way, or switch to ISO-8601 with an
  offset — `parseDbDate()` in `lib/format.js` handles both, but not a silent
  change of zone.
- **Uploads** are `.docx` only, sent as a `file` field alongside
  `conversation_id`, `user_id` and optionally `case_id`.
- Uploaded files are served from `/uploads/*`, proxied to the backend by the
  same rewrite.

---

## Still to do

- Write the Express backend in `../LegaltekBackend`, porting
  `_legacy_php/api.php` (routing, MySQL queries, docx extraction, the Ollama
  chat loop, and the CourtListener research path).
- Move `.env` (DB credentials, `OLLAMA_*`, `APP_TIMEZONE`) and the `uploads/`
  directory over to the backend once it runs.
- Rotate the CourtListener token in `_legacy_php/config.php` — that file is
  committed to git, so the token is in the repo history.
