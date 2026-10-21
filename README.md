# Glance

**A family wall calendar for the web.** Glance turns a wall-mounted tablet, a spare laptop or any touch screen into a shared noticeboard for one household: today's schedule, the weather, family notes and a photo frame, readable from across the room.

## What it's for

- **Anyone in the room** can see what's happening now and next, today's weather and the latest family notes at a glance — and tap to add or edit an event or a note. Nobody signs in at the screen.
- **The account holder** (usually a parent) owns the family's single account (one email, magic-link sign-in), signs screens in, picks the background and uploads photos.
- **It keeps working when things go wrong.** Every screen is local-first: it starts and stays usable offline, queues changes until the server is back, and shows each failing zone (calendar, weather, notes, photos) on its own instead of a blank page.
- **It rests when nobody's looking.** After a period without touch, or during quiet hours, the screen switches to a dimmed Ambient view.

Views: **Today**, **Calendar**, **Weather**, **Notes**, **Photos**, **Settings** (with Background) and **Ambient**. Layouts are designed for 1920×1080 and 1280×800 wall screens, laptops, iPad portrait and phones, and the colors follow the four seasons.

## Stack

| Area | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, run as a SPA), React 19, TypeScript (strict) |
| Styling | [StyleX](https://stylexjs.com) with design tokens and season themes; Geist fonts; Lucide icons |
| Client data | [Dexie](https://dexie.org) (IndexedDB) as the local store, sync engine in a Web Worker via Comlink |
| Offline | [Serwist](https://serwist.pages.dev) service worker (PWA) |
| Validation | [Valibot](https://valibot.dev) schemas shared by client and server |
| Server | Next.js Route Handlers, PostgreSQL via `pg` (raw SQL + numbered migrations; PGlite in tests) |
| Photos | `sharp` (display and thumbnail WebP copies), `exif-reader` |
| Weather | [Open-Meteo](https://open-meteo.com) forecast and geocoding (no API key) |
| Email | Sign-in links through [Resend](https://resend.com), [Mailtrap](https://mailtrap.io) or [Mailgun](https://www.mailgun.com) over HTTP, any SMTP server via `nodemailer`, or a local Mailpit |
| Tooling | npm, Node 24, [Biome](https://biomejs.dev) (lint + format), Vitest + Testing Library + `fake-indexeddb` |

## Architecture

```
Browser (one per screen)                               Next.js server (one Node process)
┌──────────────────────────────────────────┐          ┌─────────────────────────────────────┐
│ Screens (features/*)                     │          │ src/app/api/**/route.ts             │
│   read ─▶ data hooks (useLiveQuery)      │          │   session → Valibot → service       │
│   write ─▶ repos ─▶ Dexie (row + outbox) │          │ server/services ─▶ PostgreSQL       │
│                        ▲                 │  HTTPS   │ server/bus ─▶ SSE per account       │
│ Sync worker ───────────┘                 │◀────────▶│ server/jobs (expiry, link cleanup)  │
│   push outbox · pull changes · SSE/poll  │  cookie  │ server/weather · server/mail        │
│ Service worker: app shell + photo cache  │          │ DATA_DIR: photos                    │
└──────────────────────────────────────────┘          └─────────────────────────────────────┘
```

- **Local-first.** Screens never call the network for app data. They read IndexedDB through hooks and write through repos, which save the row and an outbox entry in one transaction. A sync worker pushes the outbox, pulls versioned changes and listens on an SSE stream (polling every 30 s as a fallback). The last write to reach the server wins.
- **Pure business rules.** Event status, the Today hero, note expiry, seasons, time formats and so on are pure functions in `src/domain`, of `(data, now, settings)`. Derived values are computed, never stored.
- **Thin server.** Route Handlers only check the session (and `Origin` on writes), validate with Valibot, call a service and map its `Result` to HTTP. Services scope every query by account.
- **Enforced boundaries.** Biome import rules keep each module in its lane (e.g. `ui` can't touch data, `server` can't import client code).

```
src/app/        thin route files (views, API Route Handlers, service worker)
src/domain/     schemas, types and pure business rules
src/data/       Dexie store, repos and hooks, sync engine and worker, transports
src/features/   one folder per view: Screen container + pure components
src/ui/         shared design-system components
src/shell/      app shell, nav bar, providers (now, settings, season, network, idle)
src/theme/      StyleX tokens, season themes, fonts
src/server/     server-only: db, auth, services, weather, mail, jobs, SSE bus
src/fixtures/   demo data for development
src/copy.ts     every user-facing string
db-migrations/  PostgreSQL schema
docs/           spec, technical design, plan, design handoff and prompts
```

## Development

### Requirements

- **Node 24** (see `.nvmrc`) and npm
- **PostgreSQL** (any recent version) running locally, with a `glance` database: `createdb glance`. Tests don't need it (they run on PGlite)
- [Mailpit](https://mailpit.axllent.org) (`brew install mailpit`, then `mailpit`): the dev server sends sign-in emails to it over SMTP on port 1025; read them at <http://localhost:8025>

### Get started

```bash
npm ci
```

```bash
npm run dev
```

Open <http://localhost:3000>. The dev server reads `.env.development` (committed: `DATABASE_URL=postgres://localhost:5432/glance`, photos in `.data/`, git-ignored, mail to Mailpit with `MAIL_PROVIDER=mailpit`), then `.env.development.local` (git-ignored) for a different `DATABASE_URL` or mail provider (`.env.example` lists every variable). Migrations run on boot; without a reachable database the server logs the error and stops.

The dev server runs the real app: sign in on `/signin` and read the code in Mailpit at <http://localhost:8025>. **`/dev/gallery`** shows every component in all four seasons. `npm run dev:demo` is a **demo build** instead: it opens Today on seeded fixture data with no backend and no sign-in, and fixture URL params reproduce any design state, e.g. `/today?season=winter&net=offline` or `/notes?sheet=newnote` (full list in [product spec §6](docs/product-spec.md)). The server still checks its config at boot; a missing or bad variable stops it with `Invalid server config:` and the variable names.

### Real sign-in and offline

The service worker and the offline cold start only run in a production build. Run `npm run build`, then `npm start` with `DATABASE_URL`, `DATA_DIR` (an empty folder), `APP_URL=http://localhost:3000`, `MAIL_FROM` and a mail provider: `MAIL_PROVIDER=mailpit` sends to Mailpit on `localhost:1025`, or `RESEND_API_KEY` alone uses Resend (with `MAIL_FROM` on a domain verified in Resend, or `Glance <onboarding@resend.dev>`, which only delivers to your Resend account's own email). Request a link on `/signin` and open it from the email. Browsers treat `localhost` as secure, so the service worker and the offline cold start work there too.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (real sign-in and sync, no service worker) |
| `npm run dev:demo` | Dev server as a demo build (fixture data, no sign-in) |
| `npm run check` | Biome lint and format check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unit, component, data and sync tests) |
| `npm run build` | Production build |
| `npm start` | Serve the production build (needs `DATABASE_URL`, `DATA_DIR`, `APP_URL`, `MAIL_FROM` and the mail provider's variables) |

CI runs `check` → `typecheck` → `test` → `build`. A pre-commit hook in `.githooks/` is installed by `npm ci`.

## Documentation

- [`docs/product-spec.md`](docs/product-spec.md) — what the app does, with requirement IDs (`TODAY-02`, `SYNC-03` …)
- [`docs/tech-design.md`](docs/tech-design.md) — decisions, architecture, sync protocol, server design
- [`docs/execution-plan.md`](docs/execution-plan.md) — tasks and status
- [`CLAUDE.md`](CLAUDE.md) — coding and workflow rules for contributors

## License

[MIT](LICENSE)
