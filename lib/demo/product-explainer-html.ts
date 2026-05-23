import type { ExplainerDocument, ExplainerSection } from "@/lib/demo/product-explainer-document";
import { buildProductExplainerFilename } from "@/lib/demo/product-explainer-document";

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderSectionGroup(title: string, sections: ExplainerSection[]) {
  return `
    <section class="section-group">
      <p class="eyebrow">${escapeHtml(title)}</p>
      <div class="section-grid">
        ${sections
          .map(
            (section) => `
              <article class="card tone-${escapeHtml(section.tone)}">
                <h3>${escapeHtml(section.title)}</h3>
                <p>${escapeHtml(section.description)}</p>
                <ul>
                  ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                </ul>
              </article>`,
          )
          .join("")}
      </div>
    </section>`;
}

export function buildProductExplainerHtmlExport(document: ExplainerDocument) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(document.title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #160d0d;
      --panel: rgba(31, 18, 18, 0.88);
      --panel-strong: rgba(43, 25, 25, 0.94);
      --text: #fff8f5;
      --muted: rgba(255, 248, 245, 0.72);
      --line: rgba(251, 236, 194, 0.16);
      --gold: #dda936;
      --cream: #fbecc2;
      --red: #a60d0e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 18% 0%, rgba(166, 13, 14, 0.28), transparent 32%),
        radial-gradient(circle at 82% 14%, rgba(221, 169, 54, 0.16), transparent 34%),
        linear-gradient(135deg, #241616 0%, #160d0d 55%, #2c1a1a 100%);
      color: var(--text);
      line-height: 1.6;
      padding: 44px 22px;
    }
    .shell { max-width: 1120px; margin: 0 auto; }
    .hero {
      border: 1px solid var(--line);
      border-radius: 32px;
      background: rgba(22, 13, 13, 0.72);
      padding: clamp(28px, 5vw, 56px);
      box-shadow: 0 20px 80px rgba(0,0,0,.28);
    }
    .eyebrow {
      margin: 0 0 12px;
      color: var(--gold);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .22em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 880px;
      margin: 0;
      font-size: clamp(34px, 7vw, 78px);
      line-height: .94;
      letter-spacing: -.065em;
    }
    h2 {
      margin: 0 0 18px;
      font-size: clamp(26px, 4vw, 42px);
      line-height: 1;
      letter-spacing: -.045em;
    }
    h3 { margin: 0; font-size: 19px; letter-spacing: -.02em; }
    p { color: var(--muted); margin: 12px 0 0; }
    .hero-summary { max-width: 760px; font-size: 18px; }
    .meta { margin-top: 24px; color: rgba(251,236,194,.7); font-size: 13px; }
    .core {
      margin-top: 18px;
      border-left: 3px solid var(--gold);
      padding: 16px 18px;
      border-radius: 18px;
      background: rgba(221,169,54,.08);
      color: rgba(255,248,245,.88);
    }
    .process { margin-top: 28px; display: grid; gap: 16px; }
    .step {
      border: 1px solid var(--line);
      border-radius: 26px;
      background: var(--panel);
      padding: 24px;
      page-break-inside: avoid;
    }
    .step-header { display: grid; gap: 10px; }
    .step-output {
      margin-top: 16px;
      color: var(--cream);
      border: 1px solid rgba(221,169,54,.25);
      background: rgba(221,169,54,.08);
      border-radius: 18px;
      padding: 12px 14px;
      font-weight: 700;
    }
    ul { margin: 16px 0 0; padding-left: 20px; color: rgba(255,248,245,.78); }
    li + li { margin-top: 8px; }
    .section-group { margin-top: 46px; }
    .section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .card {
      border: 1px solid var(--line);
      border-radius: 26px;
      background: var(--panel-strong);
      padding: 24px;
      page-break-inside: avoid;
    }
    .tone-positive { box-shadow: inset 0 0 0 1px rgba(221,169,54,.08); }
    .tone-warning { box-shadow: inset 0 0 0 1px rgba(221,169,54,.20); }
    .tone-danger { box-shadow: inset 0 0 0 1px rgba(166,13,14,.24); }
    .footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
      color: rgba(255,248,245,.58);
      font-size: 13px;
    }
    @media (max-width: 760px) {
      body { padding: 18px 12px; }
      .hero, .step, .card { border-radius: 22px; padding: 20px; }
      .section-grid { grid-template-columns: 1fr; }
    }
    @media print {
      body { background: #fff; color: #201514; padding: 24px; }
      .hero, .step, .card { background: #fff; color: #201514; border-color: #ddd; box-shadow: none; }
      p, ul { color: #493e3b; }
      .eyebrow, .step-output { color: #6b4a08; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Trend Finder / System Explainer</p>
      <h1>${escapeHtml(document.title)}</h1>
      <p class="hero-summary">${escapeHtml(document.subtitle)}</p>
      <p>${escapeHtml(document.summary)}</p>
      <div class="core">${escapeHtml(document.corePromise)}</div>
      <p class="meta">Generated ${escapeHtml(formatDate(document.generatedAt))}</p>
    </section>

    <section class="section-group">
      <p class="eyebrow">End-to-end workflow</p>
      <h2>From raw signals to usable intelligence.</h2>
      <div class="process">
        ${document.steps
          .map(
            (step) => `
              <article class="step">
                <div class="step-header">
                  <p class="eyebrow">${escapeHtml(step.eyebrow)}</p>
                  <h3>${escapeHtml(step.title)}</h3>
                  <p>${escapeHtml(step.description)}</p>
                </div>
                <ul>${step.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
                <div class="step-output">Output: ${escapeHtml(step.output)}</div>
              </article>`,
          )
          .join("")}
      </div>
    </section>

    ${renderSectionGroup("Product side", document.productSide)}
    ${renderSectionGroup("Admin side", document.adminSide)}
    ${renderSectionGroup("Practical outputs", document.outputs)}
    ${renderSectionGroup("Boundaries", document.boundaries)}

    <p class="footer">Generated by Trend Finder. This explainer describes the current manual AI signal radar flow and intentionally separates product UX from admin diagnostics.</p>
  </main>
</body>
</html>`;
}

export function buildProductExplainerHtmlFilename() {
  return buildProductExplainerFilename("html");
}
