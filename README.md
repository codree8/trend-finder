# Trend Finder Starter

Premium AI trend intelligence dashboard starter.

This version is intentionally built with mock data first. The goal is to lock the dashboard UX, scoring language, filters, report exports and visual identity before adding live API connectors.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style local UI components
- Recharts
- Drizzle ORM schema scaffold
- Vercel Cron scaffold

## Design Direction

Trend Finder uses a dark espresso/burgundy base, red as the signal color and gold as the momentum color.

Core palette:

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

For the first visual phase, env values are not required because the app uses mock data.

## Current Pages

```txt
/dashboard   Main dashboard
/reports     Report/export preview
/settings    Source preset overview
```

## API Routes

```txt
POST /api/scan                  Manual mock scan
GET  /api/cron/daily-scan       Daily scan endpoint scaffold
GET  /api/export/json           JSON export
GET  /api/export/csv            CSV export
GET  /api/export/html           HTML report export
```

## Next Development Phases

1. Replace mock data with PostgreSQL snapshots.
2. Wire Drizzle + Neon.
3. Implement GitHub, Hacker News and RSS connectors first.
4. Add Reddit and YouTube carefully because of API rules and quota limits.
5. Add topic clustering and historical scoring.
6. Turn Creator Mode into real generated content ideas.

## Important Architecture Rule

The dashboard should read from the database, not directly from live APIs on every page load.

Correct flow:

```txt
scan -> normalize -> store raw signals -> cluster topics -> calculate scores -> save snapshots -> dashboard reads snapshots
```

That is what makes it a trend intelligence system instead of a slow live search page.
