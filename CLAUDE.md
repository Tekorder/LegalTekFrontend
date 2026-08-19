# LegalTek AI — Frontend

Next.js (App Router) client for a legal case-management app: cases, clients,
documents, billing, an AI chat, and Labs (document agents).

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
copy, say case or matter — never project. "Project" in this codebase
now refers only to a Firebase project or the repo root, never to legal work.

## Shape of the app

One route. `app/page.jsx` is a client component that gates everything behind
Firebase Auth, then hands off:

```
page.jsx           auth gate → users.sync_firebase → home
  HomeSidebar      Cases / Clients / Labs / Account
  CasesHome        case list + create modal
  ClientsHome
  LabsHome         card grid of every lab (parent page, like CasesHome)
    LabRunner      the run screen for one lab — generic, descriptor-driven
  AccountHome
  AppShell         the case workspace, once a case is selected
    Sidebar        conversations
    ChatArea       messages + input
    DocsPanel / AnalyzePanel / ClientsPanel / BillingPanel
    TeamPanel, InviteToChatModal, DocumentEditor, DocEditViewer
```

`components/HearingsPanel.jsx` is present but **unreferenced** — hearings were
removed from the UI and the `hearings` table was dropped from the schema, but a
merge restored the file. The backend still exposes `hearings.*` actions against
a table that no longer exists.

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

## Labs are descriptor-driven — do not hardcode one

`LabsHome` renders a card per lab from `labs.list`, and `LabRunner` builds its
upload control, its input form, and its results table from that same
descriptor. Neither component knows what a ledger or a contract is.

That means **a new lab needs no frontend work at all** — register it in
`../LegalTekBackend/src/labs/index.js` and it appears with a working screen. It
also means the temptation to special-case a lab here is the thing to resist: if
a lab needs a new control, add a new `input.type` that every lab can use, and a
new `column.type` for the table, rather than branching on a lab id. The one
existing exception is the expanded-row detail (`LedgerDetail` vs
`FieldsDetail`), where the evidence genuinely differs in kind — a ledger shows
a transactions table, a contract shows quoted clauses.

Individual labs are **not** sidebar entries. `Labs` is one destination and the
grid is the index, exactly as `Cases` lists cases.

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
- **Two upload shapes, two field names.** Document uploads send one file as
  `file`; lab runs send many as `files` (repeat the field) plus `lab` and a
  JSON `inputs` string. The backend's multer config allowlists exactly those
  two names — any other field name carrying a file is rejected. `apiUpload`
  passes FormData straight through and needs no change for either.
  `documents.upload` is still `.docx` only; labs accept whatever their
  descriptor's `accepts` lists. Uploaded files live on the backend and are
  served through the `/uploads/*` rewrite — this repo has no `uploads/`
  directory.
- **Never render a ledger date through `parseDbDate`/`fmtDate`.** Those exist
  for naive MySQL *datetimes* and re-anchor them to `NEXT_PUBLIC_APP_TIMEZONE`.
  A ledger date is a bare calendar date (`2025-10-01`); putting it through that
  path can shift it a day, and that field is the one that drives a legal
  filing. `LabRunner` renders date columns as the raw string on purpose.
