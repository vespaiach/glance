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
| Email | [Resend](https://resend.com) HTTP API (sign-in links) |
| Tooling | npm, Node 24, [Biome](https://biomejs.dev) (lint + format), Vitest + Testing Library + `fake-indexeddb` |

## Architecture

```
Browser (one per screen)                               Next.js server (one Node process)
┌──────────────────────────────────────────┐          ┌─────────────────────────────────────┐
│ Screens (features/*)                     │          │ app/api/**/route.ts                 │
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
app/            thin route files (views, API Route Handlers, service worker)
src/domain/     schemas, types and pure business rules
src/data/       Dexie store, repos and hooks, sync engine and worker, transports
src/features/   one folder per view: Screen container + pure components
src/ui/         shared design-system components
src/shell/      app shell, nav bar, providers (now, settings, season, network, idle)
src/theme/      StyleX tokens, season themes, fonts
src/server/     server-only: db, auth, services, weather, mail, jobs, SSE bus
src/fixtures/   demo data for development
src/copy.ts     every user-facing string
db/migrations/  PostgreSQL schema
docs/           spec, technical design, plan, design handoff and prompts
```

## Development

### Requirements

- **Node 24** (see `.nvmrc`) and npm
- **PostgreSQL** (any recent version) running locally, with a `glance` database: `createdb glance`. Tests don't need it (they run on PGlite)
- A [Resend](https://resend.com) API key: the server needs one to boot, and it sends the sign-in emails

### Get started

```bash
npm ci
```

```bash
npm run dev
```

Open <http://localhost:3000>. The dev server reads `.env.development` (committed: `DATABASE_URL=postgres://localhost:5432/glance`, photos in `.data/`, git-ignored), then `.env.development.local` (git-ignored) for your own `RESEND_API_KEY` or a different `DATABASE_URL`. Migrations run on boot; without a reachable database the server logs the error and stops.

The dev server is also a **demo build**: it opens Today on seeded fixture data with no backend and no sign-in, and **`/dev/gallery`** shows every component in all four seasons. Fixture URL params reproduce any design state, e.g. `/today?season=winter&net=offline` or `/notes?sheet=newnote` (full list in [product spec §6](docs/product-spec.md)). The server still checks its config at boot, so put your own `RESEND_API_KEY=re_…` in `.env.development.local`; without one it stops with `Invalid server config: RESEND_API_KEY`.

### Real sign-in and offline

Sign-in, sync and the service worker only run in a production build. Run `npm run build`, then `npm start` with `DATABASE_URL`, `DATA_DIR` (an empty folder), `APP_URL=http://localhost:3000`, `RESEND_API_KEY` and `MAIL_FROM` (an address on a domain verified in Resend, or `Glance <onboarding@resend.dev>`, which only delivers to your Resend account's own email). Request a link on `/signin` and open it from the email. Browsers treat `localhost` as secure, so the service worker and the offline cold start work there too.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (demo build, no service worker) |
| `npm run check` | Biome lint and format check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unit, component, data and sync tests) |
| `npm run build` | Production build |
| `npm start` | Serve the production build (needs `DATABASE_URL`, `DATA_DIR`, `APP_URL`, `RESEND_API_KEY`, `MAIL_FROM`) |

CI runs `check` → `typecheck` → `test` → `build`. A pre-commit hook in `.githooks/` is installed by `npm ci`.

## Documentation

- [`docs/product-spec.md`](docs/product-spec.md) — what the app does, with requirement IDs (`TODAY-02`, `SYNC-03` …)
- [`docs/tech-design.md`](docs/tech-design.md) — decisions, architecture, sync protocol, server design
- [`docs/execution-plan.md`](docs/execution-plan.md) — tasks and status
- [`CLAUDE.md`](CLAUDE.md) — coding and workflow rules for contributors

## License

[MIT](LICENSE)
