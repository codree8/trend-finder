# Trend Finder

Trend Finder is an AI trend intelligence radar. It scans real source movement, stores raw signals in PostgreSQL, clusters them into topics, scores trend quality, and turns the output into a dashboard, watchlist, action queue, daily brief and exportable reports.

The project is built for a public landing/demo presentation plus a protected live radar. The landing page and product explainer are public. The live dashboard, report data, manual scan and admin QA pages are protected with a lightweight access-code flow instead of a full user-account system.

## What is implemented

- Public landing page for product positioning.
- Public `/demo` product explainer with PDF and HTML export.
- Demo/admin access gate for the live product experience.
- Real source scanning through GitHub, Hacker News, RSS and arXiv.
- Optional YouTube connector behind `ENABLE_YOUTUBE_CONNECTOR` and `YOUTUBE_API_KEY`.
- PostgreSQL/Drizzle persistence for raw signals, scan runs, topic clusters, snapshots, cron locks and saved watchlist trends.
- Admin-only manual scan through `POST /api/scan`.
- Protected scheduled scan through `POST /api/internal/cron/scan`.
- Protected scheduled retention cleanup through `POST /api/internal/cron/cleanup`.
- GitHub Actions workflows for hourly scanning and daily cleanup.
- Database lock guard so manual/cron scans and cleanup jobs do not overlap.
- 30-day default retention cleanup for transient scan data.
- Dashboard with KPI cards, radar/timeline/source breakdown, hidden gems, signal table, Creator Mode and scan health.
- Semantic/vector search backed by a protected server-side `/api/search` endpoint and a pgvector search index.
- Category keyword packs and scan modes: balanced, category and deep.
- Noise suppression, trend quality gates, lifecycle scoring and evidence/action consistency checks.
- Watchlist intelligence delta.
- Action Queue / Priority Radar.
- Daily Brief with product-facing summary and report-ready structure.
- Reports Hub with PDF, HTML, JSON, print-ready and markdown copy flows.
- Admin QA pages for scoring lab, source connectors, beta readiness, deployment readiness and system boundaries.

## What is intentionally not implemented

- Public registration/login user accounts.
- Multi-tenant SaaS workspaces.
- Billing.
- Email delivery.
- Autonomous posting or automatic report sending.
- Public write access for scan/watchlist/admin operations.

## Access model

Public routes:

```txt
/
/demo
/api/demo-explainer/export/pdf
/api/demo-explainer/export/html
```

Demo code access:

```txt
/dashboard
/watchlist
/action-queue
/daily-brief
/reports
/settings
GET /api/trends
GET /api/watchlist
GET /api/action-queue
GET /api/daily-brief
GET /api/export/*
GET /api/daily-brief/export/*
```

Admin password access:

```txt
/admin/*
POST /api/scan
POST /api/watchlist
DELETE /api/watchlist/[trendKey]
```

Cron access:

```txt
POST /api/internal/cron/scan
POST /api/internal/cron/cleanup
```

Cron routes require:

```txt
Authorization: Bearer <CRON_SECRET>
```

Do not pass secrets through query strings.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Local shadcn-style UI components
- Recharts
- Drizzle ORM
- Neon/PostgreSQL
- pgvector extension for semantic search documents
- ESLint with Next core web vitals and TypeScript rules
- GitHub Actions for scheduled production triggers

## Local setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.local.example .env.local
```

Fill in your own values. Do not commit `.env.local`.

Minimum local variables:

```bash
DATABASE_URL="your_neon_or_postgres_connection_string"
APP_URL="http://localhost:3000"
APP_ACCESS_SECRET="generate_a_long_random_secret"
DEMO_ACCESS_CODE="your_local_demo_code"
ADMIN_ACCESS_PASSWORD="your_local_admin_password"
CRON_SECRET="generate_a_different_long_random_secret"
```

Generate secure secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run database migrations after `DATABASE_URL` is set:

```bash
npm run db:migrate
```

Search v4 adds a semantic search migration that creates the `vector` extension and the `semantic_search_documents` / `semantic_search_index_state` tables. Neon is the intended database target. If you use a different local PostgreSQL server, make sure pgvector is available before running migrations.

Start the app:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

The first time you enter the live app, use your `DEMO_ACCESS_CODE` or `ADMIN_ACCESS_PASSWORD`. Admin access is required to run **Scan Trends Now**.

## Environment variables

See `.env.local.example` for the full safe template.

Important variables:

```txt
DATABASE_URL                  Neon/PostgreSQL connection string
APP_URL                       Local or production app URL
APP_ACCESS_SECRET             Signs the httpOnly access cookie
DEMO_ACCESS_CODE              Shared demo code for product viewers
ADMIN_ACCESS_PASSWORD         Private password for admin/operator actions
CRON_SECRET                   Secret used by GitHub Actions cron calls
CRON_SCAN_MODE                balanced by default
CRON_SCAN_WINDOW_DAYS         30 by default
CRON_RETENTION_DAYS           30 by default
GITHUB_TOKEN                  Optional, improves GitHub rate-limit reliability
ENABLE_ARXIV_CONNECTOR        true by default
ENABLE_YOUTUBE_CONNECTOR      false by default to protect quota
YOUTUBE_API_KEY               Required only if YouTube connector is enabled
```

For a public Skool/community demo, share only the `DEMO_ACCESS_CODE`. Never share `ADMIN_ACCESS_PASSWORD`, `APP_ACCESS_SECRET`, `CRON_SECRET`, `DATABASE_URL` or API keys.

## Scripts

```bash
npm run dev          # Start the local dev server
npm run clean        # Remove .next and local TypeScript build cache
npm run build        # Run a clean Next.js production build
npm run start        # Start the production server after build
npm run lint         # Run ESLint checks
npm run typecheck    # Run TypeScript without emitting files
npm run qa           # Run lint and typecheck together
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply Drizzle migrations
npm run db:push      # Push schema directly, useful only during local iteration
npm run db:studio    # Open Drizzle Studio
```

## Search

The top search bar is backed by Search v4: a protected server-side semantic/vector search endpoint. It builds a compact pgvector-powered search index from the current radar window and ranks results with a hybrid score:

- semantic vector similarity across trend context, aliases, sources, evidence and angles
- PostgreSQL full-text ranking over stored search documents
- exact/partial title boosts for obvious matches
- trend score, hidden-gem score and source-count boosts for product relevance

It searches across:

- trend names, canonical keys and aliases
- categories and source names
- evidence titles and source URLs
- creator angles, report-ready hooks and action recommendations

Keyboard shortcuts:

```txt
Ctrl/Cmd + K  Open search
/             Open search when not typing
Enter         Open the best result
Esc           Close search
```

`/api/search` requires demo access, because it reads the live stored radar index. If the semantic index table is missing or pgvector is unavailable, the endpoint falls back to the ranked lexical search so the UI does not break during local setup.

## Main pages

```txt
/                           Public landing page
/demo                       Public product explainer with PDF/HTML export
/access                     Demo/admin access page
/dashboard                  Main trend radar and manual scan flow
/watchlist                  Saved trend movement and baseline comparison
/action-queue               Decision radar: act, monitor, research or avoid
/daily-brief                Product-facing daily intelligence brief
/reports                    Export hub for PDF, HTML, JSON, print and markdown
/reports/history            Local report snapshot history
/settings                   Product preferences and visible section settings
/admin/scoring-lab          Scoring transparency and QA lab
/admin/source-connectors    Connector readiness and regression QA
/admin/beta-readiness       Beta readiness checklist
/admin/deployment-readiness Deployment readiness checklist
/admin/system-boundaries    Production boundaries, cron policy and safety notes
```

## API routes

```txt
POST /api/access
GET  /api/access
DELETE /api/access

POST /api/scan
GET  /api/trends?window=24h|7d|30d
GET  /api/trends/[slug]?window=24h|7d|30d
GET  /api/search?q=agents&scope=all&window=7d   # semantic/vector search
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
POST /api/internal/cron/cleanup
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
semantic_search_documents
semantic_search_index_state
```

This keeps Neon storage under control while preserving watchlist decisions, reports and the canonical topic layer. PostgreSQL may not show storage dropping instantly after deletes because normal vacuum behavior reuses freed table space over time.

## Public repository safety

Before making the repository public:

```bash
git grep -n "neon.tech"
git grep -n "postgresql://"
git grep -n "DATABASE_URL"
git grep -n "GITHUB_TOKEN"
git grep -n "YOUTUBE_API_KEY"
```

Also check history if the repository ever contained real secrets:

```bash
git log -p --all -S "neon.tech"
git log -p --all -S "postgresql://"
git log -p --all -S "DATABASE_URL"
```

If a real secret was committed, rotate it and clean the Git history before publishing.

## QA checklist before sharing a demo

Run:

```bash
npm run qa
npm run build
```

Then manually verify:

- `/` opens publicly.
- `/demo` opens publicly.
- `/dashboard` redirects to `/access` without a code.
- Demo code opens product pages.
- Demo code cannot open `/admin/*`.
- Demo code cannot run `POST /api/scan`.
- Admin password can open `/admin/*`.
- Admin password can run **Scan Trends Now**.
- Cron scan rejects missing/invalid bearer secrets.
- Cron cleanup rejects missing/invalid bearer secrets.
- Scheduled scan returns `ok=true` or a safe skipped lock response.
- Scheduled cleanup deletes old transient rows while preserving watchlist and reports.
- Daily Brief PDF, HTML, JSON, print-ready and markdown export paths open.
- Product explainer PDF and HTML exports open/download correctly from `/demo`.
- Mobile layout is usable.

## Architecture rule

Correct flow:

```txt
scan -> normalize -> store raw signals -> cluster topics -> calculate scores -> save snapshots -> product pages read snapshots
```

That is what makes Trend Finder a trend intelligence system instead of a slow live search page.
