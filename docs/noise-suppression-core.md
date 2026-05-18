# Noise Suppression Core v1

Trend Finder does not delete weak raw signals after a scan. It classifies every enriched trend with a visibility gate and hides only the weak/noisy items from product-facing surfaces.

## Statuses

- `priority` — strong enough for the product radar to treat as an action candidate.
- `strong` — useful signal, generally safe for Act/Watch decisions.
- `watch` — visible, but needs more confirmation before action.
- `research_only` — visible as cautious research or early hidden-gem signal.
- `suppressed` — hidden from product UI, still inspectable in admin/debug contexts.
- `rejected` — unusable signal shape or very weak evidence.

## Initial thresholds

The visibility score is a composite of trend score, hidden-gem score, topic quality, source confidence, freshness, validation and consistency checks.

- `0–19` usually becomes `rejected` when no hidden-gem exception exists.
- `20–34` usually becomes `suppressed`.
- `35–49` becomes `research_only`.
- `50–64` becomes `watch`.
- `65–79` becomes `strong`.
- `80–100` becomes `priority`.

## Hidden-gem exception

A trend with a lower trend score can stay visible when it has meaningful hidden-gem potential, enough topic quality, no high noise risk, and fresh evidence. Those items are shown as `research_only`, not as an aggressive Act recommendation.

## Non-destructive rule

No raw signals are deleted in v1. Suppression is a product visibility decision, not a database cleanup operation.
