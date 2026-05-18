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

This project uses local environment variables for database access and optional source connectors.

Create a local `.env.local` file in the project root:

```bash
touch .env.local

# Required for database-backed scans, dashboard data, watchlist, reports and history.(neon)
DATABASE_URL=

# Optional but recommended.
# Improves GitHub API reliability and reduces rate-limit issues.
GITHUB_TOKEN="your_github_token_here"

# Optional.
# YouTube is implemented but disabled by default to protect quota.
# Enable only after adding a valid YouTube Data API key.
ENABLE_YOUTUBE_CONNECTOR=false
YOUTUBE_API_KEY="your_youtube_api_key_here"

# Optional.
# arXiv requires no API key. Enabled by default because it uses one lightweight
# public Atom API request per scan. Set false if you want only product/community sources.
ENABLE_ARXIV_CONNECTOR=true

# Future / disabled connector.
# Reddit is not active in the current production flow yet.
ENABLE_REDDIT_CONNECTOR=false
REDDIT_CLIENT_ID=""
REDDIT_CLIENT_SECRET=""

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
