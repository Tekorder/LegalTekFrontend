# LegalTek AI — Frontend (Next.js)

React frontend for LegalTek AI: cases, clients, documents, hearings, billing, and the AI chat. Migrated from the PHP/XAMPP + Babel-in-the-browser setup to the Next.js App Router.

The API it talks to is **Express**, living in `../LegalTekBackend`. The database
is **MySQL** (`legaltek`, served by XAMPP in local dev).

---

## Running it

Both halves have to be up, plus MySQL.

**1. MySQL** — start it from the XAMPP control panel (it is not registered as a
Windows service, so it does not come up on boot).

**2. Backend** — `../LegalTekBackend`, listens on 4000:

```bash
cd ../LegalTekBackend && npm install && npm start
```

**3. Frontend** — this folder:

```bash
npm install && cp .env.local.example .env.local && npm run dev
```

Opens on http://localhost:3000. Firebase Auth works without the backend, so you
can always reach the login screen; everything past it needs all three running.

`npm run build` → production bundle, `npm start` → serve it.

---

## Layout

```
app/
  layout.jsx        Fonts, global CSS, <div id="app-root">
  page.jsx          Firebase auth gate, users.sync_firebase, then the
                    Cases / Clients / Account home
  globals.css       @tailwind directives, brand styles, keyframes
components/
  AppShell.jsx      The case workspace — sidebar + chat + panels
  *.jsx             Panels, modals and the document editor
lib/
  api.js            apiFetch / apiPost / apiUpload + the response envelope
  format.js         parseDbDate + the fmt* helpers
  icons.jsx         Ico, Spinner, RenderContent, SVG_PATHS
  firebase.js       Firebase Auth on the modular SDK
```

The SQL schema lives with the backend, at `../LegalTekBackend/db/legaltek.sql`.

`@/` resolves to the repo root (`jsconfig.json`), so `@/lib/api`,
`@/components/Sidebar`, etc.

---

## Constraints worth knowing

The app is entirely client-rendered — every route is Firebase-auth gated and
localStorage-backed, so there is nothing meaningful to render on the server.
Two consequences:

- **No browser globals at module scope.** Anything touching
  `window` / `document` / `localStorage` must sit inside an effect or behind a
  `typeof window === 'undefined'` guard, because module bodies execute during
  SSR. Keyframes and injected styles belong in `globals.css`, not in a
  component. `getUserId()` returns its `1` default on the server rather than
  throwing.
- **Fonts stay on a plain `<link>` to Google Fonts, not `next/font`.**
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
belong to the backend's own `.env`, which is the single source of truth for
them. This repo's only env file is `.env.local`.

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

`../LegalTekBackend` implements this contract; `src/routes.js` there is the
authoritative list of actions, and `db/legaltek.sql` is the schema.

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
| Users | `users.list` `users.find_by_email` `users.sync_firebase` |
| Conversations | `conversations.list` `conversations.create` `conversations.rename` `conversations.delete` `conversations.members` `conversations.add_member` `conversations.remove_member` |
| Messages | `messages.list` `messages.send` |
| Folders | `folders.list` `folders.create` `folders.rename` `folders.delete` |
| Documents | `documents.get` `documents.list` `documents.list_all` `documents.upload` `documents.create_empty` `documents.save_text` `documents.delete` `documents.ai_edit` `documents.export_docx` |
| Labs | `labs.list` `labs.run` |

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
- **Uploads** come in two shapes. `documents.upload` sends one `.docx` as a
  `file` field alongside `conversation_id`, `user_id` and optionally `case_id`.
  `labs.run` sends many files as a repeated `files` field, plus `lab` (the lab
  id) and `inputs` (a JSON string). The backend allowlists exactly those two
  field names.
- **`labs.run` always answers `success: true`**, with per-row status inside.
  A batch where some files fail still returns the rows that succeeded.
- Uploaded files are served from `/uploads/*`, proxied to the backend by the
  same rewrite.

---

## Still to do

- **Rotate the CourtListener token.** A token was committed in `a87c920` and
  pushed to `origin/main`, so it is in this repo's public history. The
  working-tree copy has been scrubbed, but that does not un-leak it — only
  issuing a fresh token at CourtListener does. The current value is still live
  in `../LegalTekBackend/.env`, keeping the research path working until it is
  replaced.
- Optionally purge that token from git history (`git filter-repo`, then a
  coordinated force-push). Rotation makes this cosmetic, so it is not urgent.

### Cleanup already done

- This folder's duplicate `uploads/` is gone — the 30 files were verified
  byte-identical to `../LegalTekBackend/uploads/` (where `config.uploadDir`
  points) and are served through the `/uploads/*` rewrite.
- A stale root `.env` and `.env.example` are gone. They described settings this
  repo does not use (`DB_PASS`, `OLLAMA_*`), so copying the wrong template was a
  live footgun. `.env.local.example` is the only template now.
- `olamalab/`, an unrelated app that was vendored in here, moved to
  `../olamalab`.
