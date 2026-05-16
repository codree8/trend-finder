import type {
  DailyBriefReportBlock,
  DailyBriefReportDocument,
  DailyBriefReportMetric,
  DailyBriefReportSection,
  DailyBriefReportTone,
  DailyBriefReportTrendReference,
} from "@/lib/trends/types";

const toneLabels: Record<DailyBriefReportTone, string> = {
  positive: "Opportunity",
  neutral: "Context",
  warning: "Watch",
  danger: "Risk",
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value: string | null) {
  if (!value) return "No scan yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeTone(tone: DailyBriefReportTone | undefined) {
  return tone ?? "neutral";
}

function renderBadge(label: string, tone: DailyBriefReportTone = "neutral") {
  return `<span class="badge badge-${tone}">${escapeHtml(label)}</span>`;
}

function renderMetrics(metrics: DailyBriefReportMetric[] | undefined) {
  if (!metrics?.length) return "";

  const items = metrics
    .map((metric) => {
      const tone = normalizeTone(metric.tone);

      return `<div class="metric metric-${tone}">
        <p class="metric-value">${escapeHtml(metric.value)}</p>
        <p class="metric-label">${escapeHtml(metric.label)}</p>
        ${metric.helper ? `<p class="metric-helper">${escapeHtml(metric.helper)}</p>` : ""}
      </div>`;
    })
    .join("\n");

  return `<div class="metric-grid">${items}</div>`;
}

function renderBullets(bullets: string[] | undefined) {
  if (!bullets?.length) return "";

  return `<ul class="bullet-list">
    ${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("\n")}
  </ul>`;
}

function renderTrendReferences(
  refs: DailyBriefReportTrendReference[] | undefined,
) {
  if (!refs?.length) return "";

  const items = refs
    .map(
      (ref) => `<article class="trend-ref">
        <div>
          <p class="trend-topic">${escapeHtml(ref.topic)}</p>
          <p class="trend-helper">${escapeHtml(ref.helper)}</p>
        </div>
        <div class="trend-meta">
          ${renderBadge(ref.status, "neutral")}
          ${renderBadge(`Score ${ref.score}`, "positive")}
          ${renderBadge(`Quality ${ref.qualityScore}`, ref.qualityScore >= 70 ? "positive" : ref.qualityScore >= 50 ? "warning" : "danger")}
          ${renderBadge(ref.lifecycleStatus, "warning")}
        </div>
      </article>`,
    )
    .join("\n");

  return `<div class="trend-ref-list">${items}</div>`;
}

function renderBlock(block: DailyBriefReportBlock) {
  const tone = normalizeTone(block.tone);

  return `<article class="block block-${tone}">
    <div class="block-heading">
      ${renderBadge(toneLabels[tone], tone)}
      <p class="block-type">${escapeHtml(block.type.replaceAll("_", " "))}</p>
    </div>
    <h3>${escapeHtml(block.title)}</h3>
    ${block.description ? `<p class="block-description">${escapeHtml(block.description)}</p>` : ""}
    ${block.body ? `<p class="block-body">${escapeHtml(block.body)}</p>` : ""}
    ${renderMetrics(block.metrics)}
    ${renderBullets(block.bullets)}
    ${renderTrendReferences(block.trendRefs)}
  </article>`;
}

function renderSection(section: DailyBriefReportSection) {
  const tone = normalizeTone(section.tone);

  return `<section class="report-section ${section.pageBreakBefore ? "page-break" : ""}">
    <div class="section-kicker">
      <span>${escapeHtml(section.eyebrow)}</span>
      ${renderBadge(toneLabels[tone], tone)}
    </div>
    <h2>${escapeHtml(section.title)}</h2>
    <p class="section-description">${escapeHtml(section.description)}</p>
    <div class="block-list">
      ${section.blocks.map(renderBlock).join("\n")}
    </div>
  </section>`;
}

function renderValidationWarnings(document: DailyBriefReportDocument) {
  const warnings = document.integrity.validationWarnings;

  if (warnings.length === 0) {
    return `<div class="export-note export-note-clean">
      <strong>Export integrity:</strong> sections, blocks, trend references and quick-copy payload are present.
    </div>`;
  }

  return `<div class="export-note export-note-warning">
    <strong>Export cautions:</strong>
    <ul>
      ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("\n")}
    </ul>
  </div>`;
}

export function buildDailyBriefHtmlExport(document: DailyBriefReportDocument) {
  const generatedAt = formatDate(document.generatedAt);
  const latestScanAt = formatDate(document.metadata.latestScanAt);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(document.title)} — ${escapeHtml(document.window)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #100808;
      --panel: #1a0f0f;
      --panel-soft: #211313;
      --line: rgba(251, 192, 125, 0.16);
      --line-muted: rgba(255, 248, 245, 0.1);
      --text: #fff8f2;
      --muted: rgba(255, 248, 245, 0.68);
      --faint: rgba(255, 248, 245, 0.48);
      --gold: #fbc07d;
      --gold-strong: #e5a94b;
      --burgundy: #9a286a;
      --danger: #fca5a5;
      --warning: #facc15;
      --success: #bbf7d0;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        radial-gradient(circle at 14% 0%, rgba(154, 40, 106, 0.28), transparent 32rem),
        radial-gradient(circle at 86% 8%, rgba(251, 192, 125, 0.16), transparent 30rem),
        linear-gradient(180deg, #120909 0%, #0b0505 100%);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
    }

    .page {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 44px 0 64px;
    }

    .hero {
      border: 1px solid var(--line);
      background: rgba(26, 15, 15, 0.78);
      border-radius: 32px;
      padding: 34px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.36);
    }

    .eyebrow {
      margin: 0 0 14px;
      color: var(--gold);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.28em;
      text-transform: uppercase;
    }

    h1, h2, h3, p { margin-top: 0; }

    h1 {
      max-width: 880px;
      margin-bottom: 16px;
      font-size: clamp(40px, 6vw, 72px);
      line-height: 0.92;
      letter-spacing: -0.065em;
    }

    .subtitle {
      max-width: 820px;
      margin-bottom: 28px;
      color: var(--muted);
      font-size: 17px;
    }

    .hero-meta,
    .section-kicker,
    .block-heading,
    .trend-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    .hero-meta { margin-top: 22px; }

    .badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line-muted);
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .badge-positive { border-color: rgba(187, 247, 208, 0.28); color: var(--success); background: rgba(34, 197, 94, 0.08); }
    .badge-neutral { color: var(--muted); background: rgba(255, 248, 245, 0.05); }
    .badge-warning { border-color: rgba(250, 204, 21, 0.28); color: var(--warning); background: rgba(250, 204, 21, 0.08); }
    .badge-danger { border-color: rgba(252, 165, 165, 0.32); color: var(--danger); background: rgba(239, 68, 68, 0.08); }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 28px;
    }

    .summary-card,
    .metric,
    .block,
    .export-note,
    .trend-ref {
      border: 1px solid var(--line-muted);
      background: rgba(15, 8, 8, 0.5);
      border-radius: 22px;
    }

    .summary-card { padding: 16px; }
    .summary-card strong { display: block; margin-bottom: 4px; color: var(--text); }
    .summary-card span { color: var(--muted); font-size: 13px; }

    .report-section {
      margin-top: 28px;
      border: 1px solid var(--line);
      background: rgba(26, 15, 15, 0.62);
      border-radius: 30px;
      padding: 28px;
    }

    .section-kicker {
      justify-content: space-between;
      margin-bottom: 12px;
      color: var(--gold);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }

    h2 {
      margin-bottom: 8px;
      font-size: clamp(26px, 3vw, 38px);
      line-height: 1.05;
      letter-spacing: -0.045em;
    }

    .section-description,
    .block-description,
    .block-body,
    .trend-helper,
    .metric-helper {
      color: var(--muted);
    }

    .block-list {
      display: grid;
      gap: 16px;
      margin-top: 20px;
    }

    .block { padding: 20px; }
    .block-positive { border-color: rgba(187, 247, 208, 0.18); }
    .block-warning { border-color: rgba(250, 204, 21, 0.18); }
    .block-danger { border-color: rgba(252, 165, 165, 0.2); }

    .block-type {
      margin: 0;
      color: var(--faint);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h3 {
      margin: 14px 0 8px;
      font-size: 20px;
      letter-spacing: -0.02em;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .metric { padding: 14px; }
    .metric-value {
      margin: 0;
      color: var(--gold);
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
    }
    .metric-label {
      margin: 7px 0 0;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .metric-helper { margin: 5px 0 0; font-size: 12px; }

    .bullet-list {
      margin: 14px 0 0;
      padding-left: 20px;
      color: var(--muted);
    }

    .bullet-list li + li { margin-top: 8px; }

    .trend-ref-list {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .trend-ref {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      padding: 14px;
      align-items: start;
    }

    .trend-topic {
      margin-bottom: 4px;
      color: var(--text);
      font-weight: 800;
    }

    .trend-helper { margin-bottom: 0; font-size: 13px; }

    .export-note {
      margin-top: 28px;
      padding: 18px;
      color: var(--muted);
    }

    .export-note-clean { border-color: rgba(187, 247, 208, 0.2); }
    .export-note-warning { border-color: rgba(250, 204, 21, 0.24); }
    .export-note ul { margin-bottom: 0; }

    .footer {
      margin-top: 28px;
      color: var(--faint);
      font-size: 12px;
      text-align: center;
    }

    @media (max-width: 860px) {
      .page { width: min(100% - 24px, 1120px); padding-top: 24px; }
      .hero, .report-section { border-radius: 24px; padding: 22px; }
      .summary-grid, .metric-grid { grid-template-columns: 1fr 1fr; }
      .trend-ref { grid-template-columns: 1fr; }
    }

    @media print {
      body { background: #fff; color: #17100f; }
      .page { width: 100%; padding: 0; }
      .hero, .report-section, .block, .metric, .summary-card, .trend-ref, .export-note {
        background: #fff;
        border-color: #dfd3cc;
        box-shadow: none;
      }
      .subtitle, .section-description, .block-description, .block-body, .trend-helper, .metric-helper, .bullet-list, .footer {
        color: #4c403b;
      }
      .page-break { break-before: page; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <p class="eyebrow">Trend Finder · Daily Intelligence Brief</p>
      <h1>${escapeHtml(document.subtitle || document.title)}</h1>
      <p class="subtitle">${escapeHtml(document.quickCopy.summary)}</p>
      <div class="hero-meta">
        ${renderBadge(`Window ${document.window}`, "neutral")}
        ${renderBadge(document.metadata.postureLabel, document.metadata.posture === "offensive" ? "positive" : document.metadata.posture === "defensive" ? "danger" : "warning")}
        ${renderBadge(`${document.metadata.postureConfidence}/100 posture confidence`, "neutral")}
        ${renderBadge(document.metadata.qaStatusLabel, document.metadata.qaStatus === "healthy" ? "positive" : document.metadata.qaStatus === "too_aggressive" ? "danger" : "warning")}
      </div>
      <div class="summary-grid">
        <div class="summary-card"><strong>Generated</strong><span>${escapeHtml(generatedAt)}</span></div>
        <div class="summary-card"><strong>Latest scan</strong><span>${escapeHtml(latestScanAt)}</span></div>
        <div class="summary-card"><strong>Source coverage</strong><span>${escapeHtml(document.metadata.sourceCoverageLabel)}</span></div>
        <div class="summary-card"><strong>Integrity</strong><span>${document.integrity.sectionCount} sections · ${document.integrity.blockCount} blocks · ${document.integrity.trendReferenceCount} refs</span></div>
      </div>
    </header>

    ${document.sections.map(renderSection).join("\n")}

    ${renderValidationWarnings(document)}

    <p class="footer">
      Generated by Trend Finder from the Daily Brief reportDocument schema (${escapeHtml(document.schemaVersion)}). This HTML is a standalone export snapshot.
    </p>
  </main>
</body>
</html>`;
}

export function buildDailyBriefHtmlFilename(
  document: DailyBriefReportDocument,
) {
  const generatedDate = document.generatedAt.slice(0, 10) || "latest";
  return `trend-finder-daily-brief-${document.window}-${generatedDate}.html`;
}
