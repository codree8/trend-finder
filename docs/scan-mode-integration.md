# Scan Mode Integration v1

Trend Finder now separates the product trigger (`Scan Trends Now`) from the keyword selection strategy used by the backend scanner.

## Scan modes

- `balanced` — default product scan. Uses core AI keywords plus a rotating sample from all category keyword packs.
- `category` — focused category scan. Uses core AI keywords plus the selected category pack.
- `deep` — deeper category scan. Uses more keywords from the selected category pack while keeping source-specific caps.

## Current product behavior

The topbar `Scan Trends Now` button calls:

```json
{
  "windowDays": 30,
  "scanMode": "balanced"
}
```

This keeps the default action broad and safer than scanning one narrow area.

## API request shape

`POST /api/scan` accepts:

```json
{
  "windowDays": 30,
  "scanMode": "balanced | category | deep",
  "category": "Robotics",
  "keywords": ["optional extra keyword"]
}
```

Invalid or missing `scanMode` falls back to `balanced`. Invalid category values are ignored.

## Connector keyword caps

Each source receives a source-specific keyword slice. This prevents the expanded category coverage from turning one scan into an uncontrolled API storm.

- GitHub uses a capped source keyword list.
- Hacker News uses a capped source keyword list.
- RSS can use wider keyword coverage because it filters local feed items.
- YouTube remains quota-aware and capped.
- arXiv remains throttled and capped.

## Scan response metadata

The response now includes scan metadata for product messages and future admin QA:

- `scanMode`
- `requestedScanMode`
- `selectedCategory`
- `scanModeLabel`
- `keywords`
- `keywordCount`
- `sourceKeywordCounts`
- `sourceKeywordCaps`
- `categoryCoverage`

This is metadata only. It does not add auth, cron, email delivery, database-backed saved reports or destructive cleanup.

## Persistence

No migration is required. The scan metadata is stored in the existing `scan_runs.rawPayload` JSON when persistence is enabled.
