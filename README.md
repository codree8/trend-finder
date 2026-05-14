# Trend Finder

Premium AI trend intelligence dashboard.

This version now includes the first real data layer: GitHub, Hacker News and RSS connectors, a manual scan API, a daily cron scan API and a PostgreSQL/Drizzle schema for storing raw signals and scan runs.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style local UI components
- Recharts
- Drizzle ORM
- Neon/PostgreSQL
- Vercel Cron

## Design Direction

Trend Finder uses a dark espresso/burgundy base, red as the signal color and gold as the momentum color.

```txt
Primary: #a60d0e
Secondary: #dda936
Accent: #fbecc2
Base light: #fff8f5
Foreground/dark base: #241616
Deep card/sidebar: #2c1a1a
```

The target is 7.5/10 wow: premium radar, controlled glow, serious intelligence tool. Not a neon hacker template.

## Getting Started

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000/dashboard
```

## Environment

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

For a UI-only run, env values are not required. For persistence and live scans, configure:

```env
DATABASE_URL=
GITHUB_TOKEN=
CRON_SECRET=
```

`GITHUB_TOKEN` is optional but strongly recommended because unauthenticated GitHub API limits are much lower.

## Current Pages

```txt
/dashboard   Main dashboard
/reports     Report/export preview
/settings    Source preset overview
```

## API Routes

```txt
POST /api/scan                  Manual live scan: GitHub + Hacker News + RSS
GET  /api/cron/daily-scan       Daily live scan endpoint, protected by CRON_SECRET if set
GET  /api/export/json           JSON export
GET  /api/export/csv            CSV export
GET  /api/export/html           HTML report export
```

Manual scan body example:

```json
{
  "windowDays": 7,
  "keywords": ["AI agent", "local LLM", "AI coding"]
}
```

## Database

Generate and run migrations once `DATABASE_URL` is configured:

```bash
npm run db:generate
npm run db:migrate
```

A hand-written initial SQL migration is also included in `drizzle/migrations/0001_initial_trend_finder.sql` so the schema is visible immediately.

## Current Data Flow

```txt
manual/daily scan
  -> source connectors
  -> normalized SourceSignal objects
  -> raw_signals table when DATABASE_URL exists
  -> scan_runs table summary
```

The dashboard still renders mock trend cards for now. That is intentional. The next phase is to aggregate `raw_signals` into topic clusters and trend snapshots, then switch the dashboard from mock data to database-backed trend scores.

## Implemented Connectors

```txt
GitHub       repository search for recent AI-related repos
Hacker News  Algolia search by recent AI keywords
RSS          configured AI/product/research feeds
```

## Next Development Phases

1. Add topic clustering from raw signals.
2. Calculate 24h, 7d and 30d snapshots.
3. Replace mock dashboard data with database snapshots.
4. Add Reddit OAuth connector.
5. Add YouTube connector carefully because of quota cost.
6. Add Creator Mode generation based on real trends.

## Important Architecture Rule

The dashboard should read from the database, not directly from live APIs on every page load.

Correct flow:

```txt
scan -> normalize -> store raw signals -> cluster topics -> calculate scores -> save snapshots -> dashboard reads snapshots
```

That is what makes it a trend intelligence system instead of a slow live search page.
