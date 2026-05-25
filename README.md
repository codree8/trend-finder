# Trend Finder

Trend Finder is an AI trend intelligence radar. It scans real sources, stores raw signals in PostgreSQL, clusters them into topics, scores trend quality, and turns the output into a dashboard, watchlist, action queue, daily brief and exportable reports.

The product now supports a **controlled scheduled scan flow** for production use: protected cron endpoints, GitHub Actions workflows, scan locking and daily retention cleanup. It still intentionally avoids email delivery, public user accounts, billing and team workspace logic.

## Current status

Implemented:

- Real source scanning through GitHub, Hacker News, RSS and arXiv.
- Optional YouTube connector behind `ENABLE_YOUTUBE_CONNECTOR` and `YOUTUBE_API_KEY`.
- Reddit is model-supported but intentionally not implemented in the active scan flow yet.
- PostgreSQL/Drizzle persistence for raw signals, scan runs, topic clusters, snapshots, cron locks and saved watchlist trends.
- Manual scan from the dashboard through `POST /api/scan`.
- Protected scheduled scan through `POST /api/internal/cron/scan`.
- Protected scheduled retention cleanup through `POST /api/internal/cron/cleanup`.
- GitHub Actions workflows for hourly scanning and daily cleanup.
- Database lock guard so scheduled scan/cleanup jobs do not overlap.
- 30-day default retention cleanup for raw scan data, topic mentions, trend snapshots and scan logs.
- Dashboard with KPI cards, radar/timeline/source breakdown, hidden gems, signal table, Creator Mode and scan health.
- Category keyword packs and scan modes: balanced, category and deep.
- Noise suppression, trend quality gates, lifecycle scoring and evidence/action consistency checks.
- Watchlist intelligence delta.
- Action Queue / Priority Radar.
- Daily Brief with product-facing summary and report-ready structure.
- Reports Hub with PDF, HTML, JSON, print-ready and markdown copy flows.
- Local report history snapshots.
- Settings/preferences for product mode, default brief window, report template and visible sections.
- Admin QA pages for scoring lab, source connectors, beta readiness, deployment readiness and system boundaries.
- First-run, empty and error states for the main user-facing pages.

Not implemented by design:

- Authentication and user accounts.
- Email sending.
- Billing or team workspace logic.
- Public multi-tenant access control.
- Automatic report/email delivery.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Local shadcn-style UI components
- Recharts
- Drizzle ORM
- Neon/PostgreSQL
- ESLint with Next core web vitals and TypeScript rules
- GitHub Actions for scheduled production triggers

## Design direction

Trend Finder uses a dark espresso/burgundy base with controlled red and gold signal accents. The goal is a premium intelligence dashboard, not a neon hacker toy.

```txt
Primary: #a60d0e
Secondary: #dda936
Accent: #fbecc2
Base light: #fff8f5
Foreground/dark base: #241616
Deep card/sidebar: #2c1a1a
```

## Getting started

Install dependencies:

```bash
npm install
```

Create `.env.local` in the project root. Do not commit this file.

```bash
DATABASE_URL="your_neon_or_postgres_connection_string"

# Required only for protected cron endpoints.
# The GitHub repository secret TREND_FINDER_CRON_SECRET must match this value in production.
CRON_SECRET="generate_a_long_random_secret"

# Optional cron tuning.
CRON_SCAN_MODE="balanced"
CRON_SCAN_WINDOW_DAYS=30
CRON_RETENTION_DAYS=30

# Optional but recommended. The scan still works without it, but GitHub may rate-limit harder.
GITHUB_TOKEN="your_github_token"

# Optional. Disabled by default to protect YouTube quota.
ENABLE_YOUTUBE_CONNECTOR=false
YOUTUBE_API_KEY="your_youtube_data_api_key"

# Optional. Enabled by default. arXiv requires no API key.
ENABLE_ARXIV_CONNECTOR=true

# Future / disabled connector. Not active in the current production flow.
ENABLE_REDDIT_CONNECTOR=false
REDDIT_CLIENT_ID=""
REDDIT_CLIENT_SECRET=""
```

Run database migrations after `DATABASE_URL` is set:

```bash
npm run db:migrate
```

Start the app:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000/dashboard
```

Then run **Scan Trends Now** from the dashboard. The app needs at least one stored scan before the radar, Daily Brief and reports become useful.

## Scripts

```bash
npm run dev          # Start the local dev server
npm run clean        # Remove .next and local TypeScript build cache
npm run build        # Run a clean Next.js production build
npm run start        # Start the production server after build
npm run lint         # Run real ESLint checks
npm run typecheck    # Run TypeScript without emitting files
npm run qa           # Run lint and typecheck together
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply Drizzle migrations
npm run db:push      # Push schema directly, useful only during local iteration
npm run db:studio    # Open Drizzle Studio
```

## Main pages

```txt
/                         Public landing page
/demo                     Product explainer with PDF and HTML export
/dashboard                Main trend radar and scan flow
/watchlist                Saved trend movement and baseline comparison
/action-queue             Decision radar: act, monitor, research or avoid
/daily-brief              Product-facing daily intelligence brief
/reports                  Export hub for PDF, HTML, JSON, print and markdown
/reports/history          Local report snapshot history
/settings                 Product preferences and visible section settings
/admin/scoring-lab        Scoring transparency and QA lab
/admin/source-connectors  Connector readiness and regression QA
/admin/beta-readiness     Beta readiness checklist
/admin/deployment-readiness Deployment readiness checklist
/admin/system-boundaries  Production boundaries, cron policy and safety notes
```

## API routes

```txt
POST /api/scan
GET  /api/trends?window=24h|7d|30d
GET  /api/trends/[slug]?window=24h|7d|30d
GET  /api/watchlist?window=24h|7d|30d
POST /api/watchlist?window=24h|7d|30d
DELETE /api/watchlist/[trendKey]
GET  /api/action-queue?window=24h|7d|30d
GET  /api/daily-brief?window=24h|7d|30d
GET  /api/daily-brief/export/json
GET  /api/daily-brief/export/html
GET  /api/daily-brief/export/pdf-prep
GET  /api/daily-brief/export/pdf
GET  /api/daily-brief/export/pdf/health
GET  /api/daily-brief/export/readiness
GET  /api/demo-explainer/export/pdf
GET  /api/demo-explainer/export/html
GET  /api/export/json
GET  /api/export/csv
GET  /api/export/html
POST /api/internal/cron/scan
GET  /api/internal/cron/scan
POST /api/internal/cron/cleanup
GET  /api/internal/cron/cleanup
```

The internal cron endpoints require `CRON_SECRET` through either:

```txt
Authorization: Bearer <secret>
x-cron-secret: <secret>
```

Manual scan body example:

```json
{
  "windowDays": 30,
  "scanMode": "balanced",
  "keywords": ["AI agent", "local LLM", "AI coding"]
}
```

Focused category scan example:

```json
{
  "windowDays": 30,
  "scanMode": "category",
  "category": "Agents"
}
```

Scheduled scan body example:

```json
{
  "windowDays": 30,
  "scanMode": "balanced"
}
```

Retention cleanup body example:

```json
{
  "retentionDays": 30
}
```

## Scheduled scan setup

This project uses GitHub Actions as the scheduler instead of Vercel Cron, which keeps the setup friendly for small/Neon Free deployments.

Included workflows:

```txt
.github/workflows/trend-finder-hourly-scan.yml
.github/workflows/trend-finder-daily-cleanup.yml
```

Required GitHub repository secrets:

```txt
TREND_FINDER_APP_URL       https://your-production-domain.com
TREND_FINDER_CRON_SECRET   same value as CRON_SECRET in the deployed app
```

Production environment variables:

```txt
CRON_SECRET                must match TREND_FINDER_CRON_SECRET
CRON_SCAN_MODE             balanced by default
CRON_SCAN_WINDOW_DAYS      30 by default
CRON_RETENTION_DAYS        30 by default
```

Default cadence:

```txt
Hourly scan:     17 * * * *
Daily cleanup:   43 3 * * *
```

The scan route uses a database lock named `trend-scan` with a 20-minute TTL. The cleanup route uses a database lock named `retention-cleanup` with a 10-minute TTL. If a previous run is still active, the endpoint returns a safe skipped response instead of starting a second overlapping job.

## Retention policy

The daily cleanup deletes old transient scan data after the configured retention window. The default is 30 days.

Deleted after retention:

```txt
raw_signals
topic_mentions
trend_snapshots
scan_runs
```

Preserved:

```txt
topics
saved_trends
reports
browser-local preferences
browser-local report history
cron_job_locks
```

This keeps Neon storage under control while preserving watchlist decisions, reports and the canonical topic layer. PostgreSQL may not show storage dropping instantly after deletes because normal vacuum behavior reuses freed table space over time.

## Data flow

```txt
manual or scheduled scan
  -> source connectors
  -> normalized SourceSignal objects
  -> raw_signals table
  -> topic clustering and canonical identity
  -> trend snapshots for 24h, 7d and 30d windows
  -> dashboard, watchlist, action queue, daily brief and reports
```

The dashboard reads from stored snapshots. It should not call live source APIs on every page load.

## First-run behavior

If `DATABASE_URL` is missing, the main product pages show a setup state instead of a raw runtime error.

Recommended first-run order:

1. Add `DATABASE_URL` to `.env.local`.
2. Add `CRON_SECRET` if you want to test internal cron endpoints.
3. Run `npm run db:migrate`.
4. Start the app with `npm run dev`.
5. Open `/dashboard`.
6. Run **Scan Trends Now**.
7. Review `/daily-brief`, `/action-queue`, `/watchlist` and `/reports`.

## QA checklist before sharing a demo

Run:

```bash
npm run qa
npm run build
```

`npm run qa` covers lint and TypeScript. `npm run build` is kept as a separate clean production build step so build-cache issues are easier to isolate.

Then manually verify:

- Dashboard loads after a scan.
- Balanced scan works without `GITHUB_TOKEN`.
- GitHub scan is cleaner with `GITHUB_TOKEN`.
- arXiv can be toggled with `ENABLE_ARXIV_CONNECTOR`.
- YouTube stays disabled unless both the feature flag and API key are set.
- Category scan works for key categories.
- Watchlist save/remove works.
- Action Queue groups candidates correctly.
- Daily Brief loads for 24h, 7d and 30d windows.
- Daily Brief PDF, HTML, JSON, print-ready and markdown export paths open.
- Product explainer PDF and HTML exports open or download correctly from `/demo`.
- Reports history saves local snapshots.
- `POST /api/internal/cron/scan` rejects missing/invalid secrets.
- `POST /api/internal/cron/cleanup` rejects missing/invalid secrets.
- Scheduled scan returns `ok=true` or a safe skipped lock response.
- Scheduled cleanup deletes old transient rows while preserving watchlist and reports.
- Admin pages are treated as QA views, not as a real protected admin layer.

## Deployment boundary

The current project is production-shaped for a controlled personal/demo deployment, not a public multi-user SaaS.

Before exposing it widely:

- Protect `/api/scan` and admin-like routes if the app is public.
- Add authentication or at least an admin secret guard for manual production scan actions.
- Keep `CRON_SECRET` private and rotate it if it is exposed.
- Use GitHub Actions secrets, not committed env files.
- Decide whether watchlist/report history should be per-user instead of global/local.
- Keep email delivery disabled unless there is a clear product reason and consent flow.

## Architecture rule

Correct flow:

```txt
scan -> normalize -> store raw signals -> cluster topics -> calculate scores -> save snapshots -> product pages read snapshots
```

That is what makes Trend Finder a trend intelligence system instead of a slow live search page.
