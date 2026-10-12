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
| Server | Next.js Route Handlers, SQLite via `better-sqlite3` (raw SQL + numbered migrations) |
| Photos | `sharp` (display and thumbnail WebP copies), `exif-reader` |
| Weather | [Open-Meteo](https://open-meteo.com) forecast and geocoding (no API key) |
| Email | Nodemailer over SMTP (sign-in links) |
| Tooling | npm, Node 24, [Biome](https://biomejs.dev) (lint + format), Vitest + Testing Library + `fake-indexeddb` |
| Hosting | One Docker container with a `/data` volume, Caddy in front for HTTPS |

## Architecture

```
Browser (one per screen)                               Next.js server (one Node process)
┌──────────────────────────────────────────┐          ┌────────────────────────────────────┐
│ Screens (features/*)                     │          │ app/api/**/route.ts                │
│   read ─▶ data hooks (useLiveQuery)      │          │   session → Valibot → service      │
│   write ─▶ repos ─▶ Dexie (row + outbox) │          │ server/services ─▶ SQLite          │
│                        ▲                 │  HTTPS   │ server/bus ─▶ SSE per account      │
│ Sync worker ───────────┘                 │◀────────▶│ server/jobs (expiry, backups)      │
│   push outbox · pull changes · SSE/poll  │  cookie  │ server/weather · server/mail       │
│ Service worker: app shell + photo cache  │          │ /data: glance.db, photos/, backups/│
└──────────────────────────────────────────┘          └────────────────────────────────────┘
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
db/migrations/  SQLite schema
docs/           spec, technical design, plan, deploy and QA guides
```

## Development

### Requirements

- **Node 24** (see `.nvmrc`) and npm
- Optional: a local SMTP catcher such as [Mailpit](https://mailpit.axllent.org) on port 1025, to read sign-in emails

### Get started

```bash
npm ci
```

```bash
npm run dev
```

Open <http://localhost:3000>. The dev server reads `.env.development` (committed): data goes to `.data/` (git-ignored) and email to `smtp://localhost:1025`. Migrations run on boot.

The dev server is also a **demo build**: choose **Continue as demo** on the sign-in screen to use seeded fixture data with no backend, and open **`/dev/gallery`** to see every component in all four seasons. Fixture URL params reproduce any design state, e.g. `/today?season=winter&net=offline` or `/notes?sheet=newnote` (full list in [product spec §6](docs/product-spec.md)).

To try real sign-in, run a mail catcher on port 1025, request a link on `/signin` and open it from the caught email.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (demo build, no service worker) |
| `npm run check` | Biome lint and format check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unit, component, data and sync tests) |
| `npm run build` | Production build |
| `npm start` | Serve the production build (needs `DATA_DIR`, `APP_URL`, `SMTP_URL`, `MAIL_FROM`) |

CI runs `check` → `typecheck` → `test` → `build`, then builds and smoke-tests the Docker image. A pre-commit hook in `.githooks/` is installed by `npm ci`.

The service worker only runs in a production build. To test offline behavior locally, follow the "Local run" setup in [`docs/qa-checklist.md`](docs/qa-checklist.md).

## Documentation

- [`docs/product-spec.md`](docs/product-spec.md) — what the app does, with requirement IDs (`TODAY-02`, `SYNC-03` …)
- [`docs/tech-design.md`](docs/tech-design.md) — decisions, architecture, sync protocol, server design
- [`docs/execution-plan.md`](docs/execution-plan.md) — tasks and status
- [`docs/deploy.md`](docs/deploy.md) — Docker, Caddy, backups and restore
- [`docs/qa-checklist.md`](docs/qa-checklist.md) — manual release checks
- [`CLAUDE.md`](CLAUDE.md) — coding and workflow rules for contributors

## License

[MIT](LICENSE)
