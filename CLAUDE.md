# LegalTek AI — Frontend

Next.js (App Router) client for a legal case-management app: cases, clients,
documents, hearings, billing, and an AI chat.

**Read `README.md` first.** It is thorough and current — the API contract, the
action list, the request flow, and the environment table all live there. This
file covers only the conventions and traps a reader would not infer from the
code.

## Companion repo

The API is Express, in a **separate git repository** at `../LegalTekBackend`,
with its own `CLAUDE.md`. The database is MySQL (`legaltek`); the schema lives
with the backend at `../LegalTekBackend/db/legaltek.sql`.

Both halves plus MySQL must be running for anything past the login screen.
Firebase Auth works standalone, so the login page always renders.

```bash
npm install && cp .env.local.example .env.local && npm run dev
```

## Terminology: cases, not projects

The domain noun is **case** — that is the term the legal profession uses, and it
matches the database (`cases`, `case_members`, `case_clients`, `case_id`) and
every API action (`cases.list`, `cases.invite`).

Earlier UI copy said "project" in places. It has all been corrected. When adding
copy, say case, matter, or hearing — never project. "Project" in this codebase
now refers only to a Firebase project or the repo root, never to legal work.

## Shape of the app

One route. `app/page.jsx` is a client component that gates everything behind
Firebase Auth, then hands off:

```
page.jsx           auth gate → users.sync_firebase → home
  HomeSidebar      Cases / Clients / Account
  CasesHome        case list + create modal
  ClientsHome
  AccountHome
  AppShell         the case workspace, once a case is selected
    Sidebar        conversations
    ChatArea       messages + input
    DocsPanel / AnalyzePanel / ClientsPanel / BillingPanel / HearingsPanel
    TeamPanel, InviteToChatModal, DocumentEditor, DocEditViewer
```

`AppShell` switches panels with a single `view` state string rather than routing.
There is no server rendering to speak of: the app is Firebase-gated and
localStorage-backed, so the first server pass renders a spinner and hydration
takes over.

## Conventions

- `@/` resolves to the repo root (`jsconfig.json`) — `@/lib/api`,
  `@/components/Sidebar`.
- **All API traffic goes through `lib/api.js`** (`apiFetch`, `apiPost`,
  `apiUpload`). It owns the `?action=` URL shape and unwraps the
  `{success, data|error}` envelope into a value or a thrown `Error`. Do not call
  `fetch` against the API directly — the one exception is
  `documents.export_docx`, which streams a `.docx` blob instead of JSON.
- `lib/format.js` for dates (`parseDbDate`, `fmt*`, `dateGroup`),
  `lib/icons.jsx` for `Ico` / `Spinner` / `RenderContent`.
- Components are `.jsx` with `'use client'`, Tailwind for layout, inline
  `style={{}}` for the gold/navy brand colors. Match the surrounding file.
- User id: `getUserId()` from `lib/api.js`, backed by localStorage after
  `users.sync_firebase`. Returns `1` during SSR rather than throwing.

## Things that will bite you

- **No module-level browser globals.** `DocEditViewer.jsx` used to inject a
  `<style>` into `document.head` at import time, which crashes SSR where
  `document` does not exist. Keyframes belong in `app/globals.css`. Anything
  touching `window`/`document`/`localStorage` goes inside an effect or behind a
  `typeof window === 'undefined'` guard.
- **Do not switch to `next/font`.** It downloads the woff2 at *build* time, so a
  build machine without access to `fonts.gstatic.com` fails the whole build.
  Fonts stay on a plain `<link>` in `app/layout.jsx`.
- **`NEXT_PUBLIC_APP_TIMEZONE` must match the backend's `APP_TIMEZONE`.** MySQL
  datetimes arrive naive (`2026-08-13 19:25:00`); the UI reads them as wall
  clock in that zone before converting to the viewer's local time. A mismatch
  shifts every timestamp in the app and nothing errors.
- **`NEXT_PUBLIC_*` is inlined into the browser bundle at build time.** Never
  put a secret in one. DB credentials, the Ollama host, and the CourtListener
  token belong to `../LegalTekBackend/.env`. This repo's only env file is
  `.env.local`; `BACKEND_URL` is read server-side by `next.config.mjs` and never
  reaches the client.
- **The app blocks on `users.sync_firebase` returning `personal_case`.** No
  `personal_case` means the workspace never opens — you get the "Could not load
  your workspace" screen, not a crash.
- **Chat deletion aborts in-flight generation** via `AbortController`.
  `AbortError` is expected and must stay swallowed (see `AppShell.jsx`), not
  surfaced as an error. `messages.send` may also answer `{cancelled: true}`.
- **Uploads are `.docx` only**, sent as a `file` field with `conversation_id`,
  `user_id`, and optionally `case_id`. Uploaded files live on the backend and
  are served through the `/uploads/*` rewrite — this repo has no `uploads/`
  directory.
