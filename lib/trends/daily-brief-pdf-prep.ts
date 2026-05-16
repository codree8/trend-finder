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

  return `<div class="metric-grid">
    ${metrics
      .map((metric) => {
        const tone = normalizeTone(metric.tone);

        return `<div class="metric metric-${tone}">
          <p class="metric-value">${escapeHtml(metric.value)}</p>
          <p class="metric-label">${escapeHtml(metric.label)}</p>
          ${metric.helper ? `<p class="metric-helper">${escapeHtml(metric.helper)}</p>` : ""}
        </div>`;
      })
      .join("\n")}
  </div>`;
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

  return `<div class="trend-ref-list">
    ${refs
      .map(
        (ref) => `<article class="trend-ref">
          <div class="trend-ref-main">
            <p class="trend-topic">${escapeHtml(ref.topic)}</p>
            <p class="trend-helper">${escapeHtml(ref.helper)}</p>
          </div>
          <div class="trend-ref-meta">
            ${renderBadge(ref.status, "neutral")}
            ${renderBadge(`Score ${ref.score}`, "positive")}
            ${renderBadge(`Quality ${ref.qualityScore}`, ref.qualityScore >= 70 ? "positive" : ref.qualityScore >= 50 ? "warning" : "danger")}
            ${renderBadge(ref.lifecycleStatus, "warning")}
          </div>
        </article>`,
      )
      .join("\n")}
  </div>`;
}

function renderBlock(block: DailyBriefReportBlock) {
  const tone = normalizeTone(block.tone);

  return `<article class="report-block block-${tone}">
    <div class="block-meta">
      ${renderBadge(toneLabels[tone], tone)}
      <span>${escapeHtml(block.type.replaceAll("_", " "))}</span>
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

  return `<section class="report-section ${section.pageBreakBefore ? "page-break-before" : ""}">
    <div class="section-meta">
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
    return `<aside class="print-note print-note-clean">
      <strong>Export integrity:</strong> No report document cautions for this window.
    </aside>`;
  }

  return `<aside class="print-note print-note-warning">
    <strong>Export cautions:</strong>
    <ul>
      ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("\n")}
    </ul>
  </aside>`;
}

export function buildDailyBriefPdfPrepHtml(
  document: DailyBriefReportDocument,
  options: { autoPrint?: boolean } = {},
) {
  const generatedAt = formatDate(document.generatedAt);
  const latestScanAt = formatDate(document.metadata.latestScanAt);
  const qaTone: DailyBriefReportTone =
    document.metadata.qaStatus === "healthy"
      ? "positive"
      : document.metadata.qaStatus === "too_aggressive"
        ? "danger"
        : "warning";
  const postureTone: DailyBriefReportTone =
    document.metadata.posture === "offensive"
      ? "positive"
      : document.metadata.posture === "defensive"
        ? "danger"
        : "warning";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(document.title)} PDF prep — ${escapeHtml(document.window)}</title>
  <style>
    :root {
      color-scheme: light;
      --paper: #fffaf4;
      --ink: #1d1512;
      --muted: #665852;
      --faint: #8a7b72;
      --line: #ddcec4;
      --line-strong: #c8b5a8;
      --gold: #9c6a24;
      --burgundy: #8b275f;
      --success: #166534;
      --warning: #92400e;
      --danger: #991b1b;
      --soft: #f5ece3;
      --soft-strong: #eadccf;
    }

    * { box-sizing: border-box; }

    html {
      background: #e9ded4;
    }

    body {
      margin: 0;
      background: #e9ded4;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid rgba(29, 21, 18, 0.12);
      background: rgba(255, 250, 244, 0.94);
      backdrop-filter: blur(14px);
    }

    .print-toolbar p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }

    .print-toolbar strong {
      color: var(--ink);
    }

    .print-toolbar button {
      border: 1px solid var(--ink);
      border-radius: 999px;
      background: var(--ink);
      color: var(--paper);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 800;
      padding: 9px 14px;
    }

    .sheet {
      width: min(210mm, calc(100% - 32px));
      min-height: 297mm;
      margin: 22px auto;
      padding: 18mm 16mm;
      background: var(--paper);
      box-shadow: 0 18px 60px rgba(29, 21, 18, 0.18);
    }

    .cover {
      padding-bottom: 14mm;
      border-bottom: 2px solid var(--ink);
    }

    .eyebrow,
    .section-meta,
    .block-meta,
    .meta-label {
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .eyebrow {
      margin: 0 0 12px;
      color: var(--burgundy);
    }

    h1, h2, h3, p { margin-top: 0; }

    h1 {
      max-width: 165mm;
      margin-bottom: 10px;
      font-size: 36px;
      line-height: 0.98;
      letter-spacing: -0.045em;
    }

    .subtitle {
      max-width: 165mm;
      margin-bottom: 18px;
      color: var(--muted);
      font-size: 12.5px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    .meta-card,
    .metric,
    .report-block,
    .trend-ref,
    .print-note {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #fffdf9;
    }

    .meta-card {
      padding: 9px;
      min-height: 58px;
    }

    .meta-label {
      margin-bottom: 4px;
      color: var(--faint);
    }

    .meta-value {
      margin: 0;
      color: var(--ink);
      font-size: 12px;
      font-weight: 800;
      line-height: 1.35;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      border: 1px solid var(--line-strong);
      border-radius: 999px;
      padding: 3px 8px;
      color: var(--muted);
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .badge-positive { border-color: rgba(22, 101, 52, 0.35); color: var(--success); background: rgba(22, 101, 52, 0.07); }
    .badge-neutral { color: var(--muted); background: var(--soft); }
    .badge-warning { border-color: rgba(146, 64, 14, 0.35); color: var(--warning); background: rgba(146, 64, 14, 0.08); }
    .badge-danger { border-color: rgba(153, 27, 27, 0.35); color: var(--danger); background: rgba(153, 27, 27, 0.07); }

    .cover-badges,
    .section-meta,
    .block-meta,
    .trend-ref-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .cover-badges { margin-top: 12px; }

    .report-section {
      padding-top: 10mm;
      break-inside: auto;
      page-break-inside: auto;
    }

    .section-meta {
      justify-content: space-between;
      margin-bottom: 6px;
      color: var(--burgundy);
    }

    h2 {
      margin-bottom: 5px;
      color: var(--ink);
      font-size: 22px;
      line-height: 1.08;
      letter-spacing: -0.03em;
    }

    .section-description,
    .block-description,
    .block-body,
    .trend-helper,
    .metric-helper {
      color: var(--muted);
    }

    .section-description {
      margin-bottom: 10px;
      font-size: 11px;
    }

    .block-list {
      display: grid;
      gap: 9px;
    }

    .report-block {
      padding: 11px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .block-positive { border-left: 4px solid var(--success); }
    .block-warning { border-left: 4px solid var(--warning); }
    .block-danger { border-left: 4px solid var(--danger); }
    .block-neutral { border-left: 4px solid var(--line-strong); }

    .block-meta {
      color: var(--faint);
      justify-content: space-between;
      margin-bottom: 6px;
    }

    h3 {
      margin-bottom: 5px;
      font-size: 14px;
      line-height: 1.2;
      letter-spacing: -0.015em;
    }

    .block-description,
    .block-body,
    .bullet-list,
    .trend-helper {
      font-size: 10.5px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
      margin-top: 8px;
    }

    .metric {
      padding: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .metric-value {
      margin: 0;
      color: var(--gold);
      font-size: 20px;
      font-weight: 900;
      line-height: 1;
    }

    .metric-label {
      margin: 5px 0 0;
      color: var(--ink);
      font-size: 8.5px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .metric-helper {
      margin: 3px 0 0;
      font-size: 9px;
    }

    .bullet-list {
      margin: 8px 0 0;
      padding-left: 16px;
    }

    .bullet-list li + li { margin-top: 4px; }

    .trend-ref-list {
      display: grid;
      gap: 7px;
      margin-top: 8px;
    }

    .trend-ref {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 9px;
      align-items: start;
      padding: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .trend-topic {
      margin-bottom: 3px;
      color: var(--ink);
      font-size: 11px;
      font-weight: 900;
    }

    .trend-helper {
      margin-bottom: 0;
      font-size: 9.5px;
    }

    .trend-ref-meta {
      justify-content: flex-end;
      max-width: 62mm;
    }

    .print-note {
      margin-top: 10mm;
      padding: 10px;
      color: var(--muted);
      font-size: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .print-note-clean { border-left: 4px solid var(--success); }
    .print-note-warning { border-left: 4px solid var(--warning); }
    .print-note ul { margin-bottom: 0; padding-left: 16px; }

    .footer {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 10mm;
      padding-top: 5mm;
      border-top: 1px solid var(--line);
      color: var(--faint);
      font-size: 9px;
    }

    .page-break-before {
      break-before: page;
      page-break-before: always;
    }

    @page {
      size: A4;
      margin: 14mm 12mm;
    }

    @media print {
      html, body {
        background: #fffaf4;
      }

      .print-toolbar {
        display: none !important;
      }

      .sheet {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
        background: #fffaf4;
      }

      .cover {
        break-after: avoid;
      }

      a[href]::after {
        content: "";
      }
    }

    @media (max-width: 900px) {
      .sheet {
        width: calc(100% - 20px);
        padding: 28px 22px;
      }

      .meta-grid,
      .metric-grid {
        grid-template-columns: 1fr 1fr;
      }

      .trend-ref {
        grid-template-columns: 1fr;
      }

      .trend-ref-meta {
        justify-content: flex-start;
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <p><strong>PDF prep layout.</strong> Use browser Print → Save as PDF. This is not a server-generated PDF file.</p>
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <main class="sheet">
    <header class="cover">
      <p class="eyebrow">Trend Finder · Print-safe Daily Intelligence Brief</p>
      <h1>${escapeHtml(document.subtitle || document.title)}</h1>
      <p class="subtitle">${escapeHtml(document.quickCopy.summary)}</p>
      <div class="cover-badges">
        ${renderBadge(`Window ${document.window}`, "neutral")}
        ${renderBadge(document.metadata.postureLabel, postureTone)}
        ${renderBadge(`${document.metadata.postureConfidence}/100 posture confidence`, "neutral")}
        ${renderBadge(document.metadata.qaStatusLabel, qaTone)}
        ${renderBadge(`${document.integrity.sectionCount} sections`, "neutral")}
      </div>
      <div class="meta-grid">
        <div class="meta-card"><p class="meta-label">Generated</p><p class="meta-value">${escapeHtml(generatedAt)}</p></div>
        <div class="meta-card"><p class="meta-label">Latest scan</p><p class="meta-value">${escapeHtml(latestScanAt)}</p></div>
        <div class="meta-card"><p class="meta-label">Source coverage</p><p class="meta-value">${escapeHtml(document.metadata.sourceCoverageLabel)}</p></div>
        <div class="meta-card"><p class="meta-label">Integrity</p><p class="meta-value">${document.integrity.blockCount} blocks · ${document.integrity.trendReferenceCount} refs</p></div>
      </div>
    </header>

    ${document.sections.map(renderSection).join("\n")}

    ${renderValidationWarnings(document)}

    <footer class="footer">
      <span>Trend Finder · ${escapeHtml(document.schemaVersion)}</span>
      <span>PDF prep HTML · ${escapeHtml(document.window)} · ${escapeHtml(generatedAt)}</span>
    </footer>
  </main>

  ${options.autoPrint ? `<script>window.addEventListener("load", () => window.setTimeout(() => window.print(), 300));</script>` : ""}
</body>
</html>`;
}

export function buildDailyBriefPdfPrepFilename(
  document: DailyBriefReportDocument,
) {
  const generatedDate = document.generatedAt.slice(0, 10) || "latest";
  return `trend-finder-daily-brief-pdf-prep-${document.window}-${generatedDate}.html`;
}
