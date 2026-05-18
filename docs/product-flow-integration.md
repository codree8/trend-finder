# Product Flow Integration v1

This patch connects the visibility gate from Noise Suppression Core with the product-facing workflow.

## Product rule

Product surfaces should only promote trends according to their visibility status:

- `priority` / `strong` → Act on this
- `watch` → Watch this
- `research_only` → Research-only, validate first
- `suppressed` / `rejected` → hidden from product UI

Raw signals are not deleted. Suppression remains a visibility decision, not a destructive data cleanup.

## Action Queue

The Action Queue now treats visibility as a hard cap:

- suppressed/rejected trends cannot enter the queue
- research-only trends stay in the Research lane even if other metrics look attractive
- watch trends stay in Watch this
- Act on this is reserved for priority/strong visibility plus clean evidence and calibration

## Daily Brief

The Daily Brief now builds its sections from product-visible trends only. Research-only items are allowed, but only in cautious research language. They are not promoted as execution candidates.

## Reports

Report templates now apply template-specific flow rules:

- Executive Brief focuses on summary, priority/watch items, focus and risks
- Creator Pack keeps hidden gems and creator opportunities, but not suppressed noise
- Research Memo keeps research-only and validation language
- Pitch Snapshot excludes research-only trend references so it stays presentation-safe

Export routes remain unchanged. Local report history remains browser-local.
