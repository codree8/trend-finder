# Dashboard Category Scan UX v1

Patch 3 connects the dashboard category filter to the scan-mode foundation from Patch 1 and Patch 2.

## What changed

The global `Scan Trends Now` button still runs a balanced AI scan. When a dashboard category filter is active, the dashboard now offers a focused category scan for that category.

Examples:

- `Robotics` filter active → `Scan Robotics`
- empty Robotics result set → `Scan Robotics`, `Deep scan Robotics`, and `Show all trends`
- `All` filter active → no category scan prompt is shown

## Request payloads

Focused category scan:

```json
{
  "windowDays": 30,
  "scanMode": "category",
  "category": "Robotics"
}
```

Deep category scan:

```json
{
  "windowDays": 30,
  "scanMode": "deep",
  "category": "Robotics"
}
```

## Product behavior

Category empty states no longer tell the user that their profile is hiding everything. They explain that the current scan does not have enough reliable signal for the selected category and offer a focused scan.

The dashboard listens to the existing `trend-finder:scan-completed` browser event, so category scans refresh the dashboard the same way as the global balanced scan.

## Boundaries

This patch does not add noise suppression, destructive deletes, new connectors, cron, email, auth, or database-backed saved reports. It only improves the dashboard category scan UX.
