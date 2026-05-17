# Scan Keyword Coverage

Trend Finder currently exposes 15 product-facing AI categories. The scan layer needs a broader keyword foundation than the original generic AI keyword list, but the scanner must stay rate-limit aware and avoid collecting noisy, generic content.

This document describes the foundation added in **Keyword Coverage Foundation v1**. The foundation is intentionally not wired into `/api/scan` yet; that happens in **Scan Mode Integration v1**.

## Categories covered

The category keyword packs cover:

- Agents
- Coding
- Video
- Image
- Audio
- Open Source
- Local LLM
- Automation
- Research
- Marketing
- Business
- Education
- Security
- Robotics
- General AI

Each pack uses AI-specific phrases, not generic category words. For example, Robotics uses terms such as `embodied AI`, `robotics foundation model`, `vision-language-action model`, `robot policy learning` and `sim2real robotics` instead of only `robot` or `robotics`.

## Files

- `lib/config/ai-categories.ts` — canonical category list and `AiCategory` type.
- `lib/config/category-keyword-packs.ts` — keyword packs and coverage summary helper.
- `lib/config/scan-keyword-limits.ts` — scan modes and source-specific keyword caps.
- `lib/config/build-scan-keywords.ts` — centralized keyword builder with rotation and dedupe.
- `lib/config/scan-keywords.ts` — existing runtime default keywords kept unchanged for now.

## Scan modes

### Balanced

Default target for the next integration patch. It combines core AI keywords with a small rotating sample from every category.

Purpose: broad product coverage without turning every manual scan into a large, noisy scrape.

### Category

Uses core AI keywords plus a larger sample from one selected category.

Purpose: when the user filters Dashboard to a category such as Robotics, the app can offer `Scan Robotics` and actually search that area.

### Deep

Uses core AI keywords plus the broadest available sample from one selected category, still capped by source-specific limits.

Purpose: intentional deeper research scan for one domain. It should not become the default because it can be slower and can use more API quota.

## Source-specific caps

The builder can produce a wider internal keyword list, but each source should receive a safe subset:

- GitHub: moderate cap
- Hacker News: moderate cap
- RSS: wider cap because feed filtering is local and less quota-sensitive
- YouTube: smaller cap because the API quota cost is higher
- arXiv: smaller cap because requests are throttled and research queries can be broad

These caps are defined centrally in `scan-keyword-limits.ts` so the integration patch does not hardcode keyword slicing in multiple connector files.

## Rotation

The builder rotates category keyword samples using a seed. A seed can be a date, scan id or explicit number. This lets repeated balanced scans cover more of each category over time without sending every keyword to every source on every scan.

## Current status

This patch only adds the foundation. Existing scan behavior remains unchanged until the next patch wires `buildScanKeywords` into `/api/scan` and `runTrendScan`.
