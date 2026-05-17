import type { ReportTemplateId } from "@/lib/preferences/product-preferences";
import { getReportTemplate } from "@/lib/reports/report-templates";
import { buildResearchMemoExportQa } from "@/lib/reports/research-memo-qa";
import { buildDailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import type {
  DailyBriefReportBlock,
  DailyBriefReportDocument,
  DailyBriefReportMetric,
  DailyBriefReportSection,
  DailyBriefReportTone,
  DailyBriefReportTrendReference,
} from "@/lib/trends/types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 58;
const MARGIN_BOTTOM = 58;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const BODY_FONT_SIZE = 10;
const BODY_LINE_HEIGHT = 14;
const SMALL_FONT_SIZE = 8;
const SMALL_LINE_HEIGHT = 11;
const TITLE_FONT_SIZE = 21;
const SECTION_FONT_SIZE = 15;
const BLOCK_TITLE_FONT_SIZE = 11;
const MAX_SECTION_BLOCKS = 8;
const MAX_BLOCK_BULLETS = 6;
const MAX_BLOCK_TRENDS = 6;

export type DailyBriefServerPdfBuildResult = {
  filename: string;
  bytes: Uint8Array;
  pageCount: number;
  generatedAt: string;
};

type PdfLine = {
  text: string;
  size?: number;
  lineHeight?: number;
  font?: "regular" | "bold";
  tone?: DailyBriefReportTone | "muted";
  indent?: number;
  spacingBefore?: number;
  spacingAfter?: number;
};

type PdfPage = PdfLine[];

const toneColors: Record<DailyBriefReportTone | "muted", string> = {
  positive: "0.15 0.42 0.28",
  neutral: "0.18 0.16 0.15",
  warning: "0.56 0.35 0.08",
  danger: "0.55 0.12 0.14",
  muted: "0.44 0.39 0.36",
};

function sanitizePdfText(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201C", '"')
    .replaceAll("\u201D", '"')
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2026", "...")
    .replaceAll("\u2192", "->")
    .replaceAll("\u2190", "<-")
    .replaceAll("\u2265", ">=")
    .replaceAll("\u2264", "<=")
    .replaceAll("\u00A0", " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\x80-\xFF]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfLiteral(value: string | number | null | undefined) {
  return sanitizePdfText(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No scan yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sanitizePdfText(value);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function approximateTextWidth(text: string, fontSize: number) {
  return sanitizePdfText(text).length * fontSize * 0.48;
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const words = sanitizePdfText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (approximateTextWidth(next, fontSize) <= maxWidth || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function metricLabel(metric: DailyBriefReportMetric) {
  const helper = metric.helper ? ` - ${metric.helper}` : "";
  return `${metric.label}: ${metric.value}${helper}`;
}

function trendLabel(ref: DailyBriefReportTrendReference) {
  return `${ref.topic} | ${ref.status} | score ${ref.score} | quality ${ref.qualityScore} | ${ref.lifecycleStatus} - ${ref.helper}`;
}

function blockTone(block: DailyBriefReportBlock) {
  return block.tone ?? "neutral";
}

function pushLine(lines: PdfLine[], line: PdfLine) {
  const text = sanitizePdfText(line.text);
  if (!text && !line.spacingBefore && !line.spacingAfter) return;
  lines.push({ ...line, text });
}

function pushWrapped(
  lines: PdfLine[],
  text: string,
  options: Omit<PdfLine, "text"> = {},
) {
  const fontSize = options.size ?? BODY_FONT_SIZE;
  const indent = options.indent ?? 0;
  const wrapped = wrapText(text, CONTENT_WIDTH - indent, fontSize);

  wrapped.forEach((line, index) => {
    pushLine(lines, {
      ...options,
      text: index === 0 ? line : line,
      spacingBefore: index === 0 ? options.spacingBefore : 0,
      spacingAfter: index === wrapped.length - 1 ? options.spacingAfter : 0,
    });
  });
}

function buildPdfLines(
  document: DailyBriefReportDocument,
  templateId: ReportTemplateId = "executive",
) {
  const template = getReportTemplate(templateId);
  const researchMemoQa = buildResearchMemoExportQa(document, template.id);
  const printQa = buildDailyBriefPrintLayoutQa(document);
  const lines: PdfLine[] = [];
  const warnings = document.integrity.validationWarnings;

  pushWrapped(lines, document.title, {
    size: TITLE_FONT_SIZE,
    lineHeight: 25,
    font: "bold",
    tone: "neutral",
    spacingAfter: 5,
  });
  pushWrapped(lines, document.subtitle, {
    size: 12,
    lineHeight: 16,
    tone: "muted",
    spacingAfter: 14,
  });

  pushWrapped(
    lines,
    `Window: ${document.window} | Generated: ${formatDate(document.generatedAt)} | Latest scan: ${formatDate(document.metadata.latestScanAt)}`,
    { size: SMALL_FONT_SIZE, lineHeight: SMALL_LINE_HEIGHT, tone: "muted" },
  );
  pushWrapped(
    lines,
    `${template.id === "research" ? `Research QA: ${researchMemoQa.statusLabel} (${researchMemoQa.score}/100) | ` : ""}Posture: ${document.metadata.postureLabel} (${document.metadata.postureConfidence}/100) | Narrative QA: ${document.metadata.qaStatusLabel} | Print QA: ${printQa.statusLabel} (${printQa.score}/100)`,
    {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      tone: "muted",
      spacingAfter: 14,
    },
  );

  pushWrapped(lines, document.quickCopy.headline, {
    size: SECTION_FONT_SIZE,
    lineHeight: 19,
    font: "bold",
    tone: "neutral",
    spacingBefore: 4,
    spacingAfter: 4,
  });
  pushWrapped(lines, document.quickCopy.summary, {
    size: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    tone: "neutral",
    spacingAfter: 8,
  });

  for (const bullet of document.quickCopy.bullets.slice(0, 5)) {
    pushWrapped(lines, `- ${bullet}`, {
      size: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      tone: "neutral",
      indent: 10,
    });
  }

  pushWrapped(lines, `Focus today: ${document.quickCopy.focusToday}`, {
    size: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    font: "bold",
    tone: "positive",
    spacingBefore: 8,
  });
  pushWrapped(lines, `Monitor: ${document.quickCopy.monitor}`, {
    size: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    tone: "warning",
  });
  pushWrapped(lines, `Avoid: ${document.quickCopy.avoid}`, {
    size: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    tone: "danger",
    spacingAfter: 14,
  });

  if (warnings.length > 0) {
    pushWrapped(lines, "Export cautions", {
      size: BLOCK_TITLE_FONT_SIZE,
      lineHeight: 15,
      font: "bold",
      tone: "warning",
      spacingAfter: 3,
    });
    for (const warning of warnings) {
      pushWrapped(lines, `- ${warning}`, {
        size: SMALL_FONT_SIZE,
        lineHeight: SMALL_LINE_HEIGHT,
        tone: "warning",
        indent: 10,
      });
    }
    pushLine(lines, { text: "", spacingAfter: 8 });
  }

  if (template.id === "research") {
    pushWrapped(lines, "Research Memo QA", {
      size: BLOCK_TITLE_FONT_SIZE,
      lineHeight: 15,
      font: "bold",
      tone: researchMemoQa.tone,
      spacingAfter: 3,
    });
    pushWrapped(lines, `${researchMemoQa.statusLabel}: ${researchMemoQa.summary}`, {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      tone: researchMemoQa.tone,
      indent: 10,
    });
    for (const warning of researchMemoQa.warnings.slice(0, 4)) {
      pushWrapped(lines, `- ${warning}`, {
        size: SMALL_FONT_SIZE,
        lineHeight: SMALL_LINE_HEIGHT,
        tone: "warning",
        indent: 10,
      });
    }
    pushLine(lines, { text: "", spacingAfter: 8 });
  }

  for (const section of document.sections.slice(0, MAX_SECTION_BLOCKS)) {
    pushWrapped(lines, section.title, {
      size: SECTION_FONT_SIZE,
      lineHeight: 19,
      font: "bold",
      tone: section.tone,
      spacingBefore: 10,
      spacingAfter: 3,
    });
    pushWrapped(lines, section.description, {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      tone: "muted",
      spacingAfter: 6,
    });

    for (const block of section.blocks.slice(0, MAX_SECTION_BLOCKS)) {
      renderBlockLines(lines, block);
    }
  }

  pushWrapped(
    lines,
    "Generated by Trend Finder Daily Intelligence Brief. Server PDF v1 uses the reportDocument model and intentionally keeps layout compact for reliable API export.",
    {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      tone: "muted",
      spacingBefore: 16,
    },
  );

  return lines;
}

function renderBlockLines(lines: PdfLine[], block: DailyBriefReportBlock) {
  const tone = blockTone(block);

  pushWrapped(lines, block.title, {
    size: BLOCK_TITLE_FONT_SIZE,
    lineHeight: 15,
    font: "bold",
    tone,
    spacingBefore: 5,
    spacingAfter: 2,
  });

  if (block.description) {
    pushWrapped(lines, block.description, {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      tone: "muted",
    });
  }

  if (block.body) {
    pushWrapped(lines, block.body, {
      size: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      tone: "neutral",
      spacingAfter: 2,
    });
  }

  for (const metric of block.metrics?.slice(0, MAX_BLOCK_BULLETS) ?? []) {
    pushWrapped(lines, `- ${metricLabel(metric)}`, {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      tone: metric.tone ?? "muted",
      indent: 10,
    });
  }

  for (const bullet of block.bullets?.slice(0, MAX_BLOCK_BULLETS) ?? []) {
    pushWrapped(lines, `- ${bullet}`, {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      tone: "neutral",
      indent: 10,
    });
  }

  for (const trend of block.trendRefs?.slice(0, MAX_BLOCK_TRENDS) ?? []) {
    pushWrapped(lines, `- ${trendLabel(trend)}`, {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      tone: "neutral",
      indent: 10,
    });
  }
}

function paginate(lines: PdfLine[]) {
  const pages: PdfPage[] = [[]];
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;

  for (const line of lines) {
    const lineHeight = line.lineHeight ?? BODY_LINE_HEIGHT;
    const needed =
      (line.spacingBefore ?? 0) + lineHeight + (line.spacingAfter ?? 0);

    if (
      cursorY - needed < MARGIN_BOTTOM &&
      pages[pages.length - 1].length > 0
    ) {
      pages.push([]);
      cursorY = PAGE_HEIGHT - MARGIN_TOP;
    }

    pages[pages.length - 1].push(line);
    cursorY -= needed;
  }

  return pages;
}

function renderPdfContentStream(
  page: PdfPage,
  pageNumber: number,
  totalPages: number,
) {
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;
  const parts: string[] = ["q"];

  parts.push("0.94 0.91 0.86 rg");
  parts.push(`0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)} re f`);
  parts.push("0.12 0.07 0.06 RG 1.2 w");
  parts.push(
    `${MARGIN_X} ${MARGIN_BOTTOM - 18} ${CONTENT_WIDTH} ${PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM + 34} re S`,
  );

  for (const line of page) {
    const size = line.size ?? BODY_FONT_SIZE;
    const lineHeight = line.lineHeight ?? BODY_LINE_HEIGHT;
    const indent = clamp(line.indent ?? 0, 0, 120);
    const font = line.font === "bold" ? "F2" : "F1";
    const color = toneColors[line.tone ?? "neutral"];

    cursorY -= line.spacingBefore ?? 0;
    parts.push("BT");
    parts.push(`/${font} ${size} Tf`);
    parts.push(`${color} rg`);
    parts.push(`${(MARGIN_X + indent).toFixed(2)} ${cursorY.toFixed(2)} Td`);
    parts.push(`(${escapePdfLiteral(line.text)}) Tj`);
    parts.push("ET");
    cursorY -= lineHeight + (line.spacingAfter ?? 0);
  }

  parts.push("BT");
  parts.push(`/F1 ${SMALL_FONT_SIZE} Tf`);
  parts.push("0.44 0.39 0.36 rg");
  parts.push(`${MARGIN_X} 32 Td`);
  parts.push(
    `(Daily Brief Server PDF v1 - Page ${pageNumber} of ${totalPages}) Tj`,
  );
  parts.push("ET");
  parts.push("Q");

  return parts.join("\n");
}

function pdfDate(value: string) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const pad = (input: number) => String(input).padStart(2, "0");

  return `D:${safeDate.getUTCFullYear()}${pad(safeDate.getUTCMonth() + 1)}${pad(safeDate.getUTCDate())}${pad(safeDate.getUTCHours())}${pad(safeDate.getUTCMinutes())}${pad(safeDate.getUTCSeconds())}Z`;
}

function buildPdfBytes(document: DailyBriefReportDocument, pages: PdfPage[]) {
  const objects: string[] = [];
  const fontRegularId = 3;
  const fontBoldId = 4;
  const firstPageId = 5;
  const firstContentId = firstPageId + pages.length;
  const infoId = firstContentId + pages.length;
  const pageObjectIds = pages.map((_, index) => firstPageId + index);
  const contentObjectIds = pages.map((_, index) => firstContentId + index);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[fontRegularId] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[fontBoldId] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pages.forEach((page, index) => {
    const pageId = pageObjectIds[index];
    const contentId = contentObjectIds[index];
    const content = renderPdfContentStream(page, index + 1, pages.length);

    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] =
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  objects[infoId] =
    `<< /Title (${escapePdfLiteral(document.title)}) /Subject (${escapePdfLiteral(document.subtitle)}) /Creator (Trend Finder) /Producer (Trend Finder Server PDF Export v1) /CreationDate (${pdfDate(document.generatedAt)}) >>`;

  const chunks: string[] = ["%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"];
  const offsets: number[] = [0];
  let byteLength = Buffer.byteLength(chunks[0], "latin1");

  for (let id = 1; id < objects.length; id += 1) {
    const objectBody = objects[id];
    if (!objectBody) continue;

    offsets[id] = byteLength;
    const objectText = `${id} 0 obj\n${objectBody}\nendobj\n`;
    chunks.push(objectText);
    byteLength += Buffer.byteLength(objectText, "latin1");
  }

  const xrefOffset = byteLength;
  const objectCount = objects.length;
  const xrefRows = ["xref", `0 ${objectCount}`, "0000000000 65535 f "];

  for (let id = 1; id < objectCount; id += 1) {
    xrefRows.push(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n `);
  }

  const trailer = [
    ...xrefRows,
    "trailer",
    `<< /Size ${objectCount} /Root 1 0 R /Info ${infoId} 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  chunks.push(trailer);

  return new Uint8Array(Buffer.from(chunks.join(""), "latin1"));
}

export function buildDailyBriefServerPdfFilename(
  document: DailyBriefReportDocument,
  template: ReportTemplateId = "executive",
) {
  const date = new Date(document.generatedAt);
  const stamp = Number.isNaN(date.getTime())
    ? document.generatedAt.slice(0, 10)
    : date.toISOString().slice(0, 10);

  return `daily-brief-${template}-${document.window}-${stamp}.pdf`;
}

export function buildDailyBriefServerPdf(
  document: DailyBriefReportDocument,
  options: { template?: ReportTemplateId } = {},
): DailyBriefServerPdfBuildResult {
  const template = options.template ?? "executive";
  const lines = buildPdfLines(document, template);
  const pages = paginate(lines);
  const bytes = buildPdfBytes(document, pages);

  return {
    filename: buildDailyBriefServerPdfFilename(document, template),
    bytes,
    pageCount: pages.length,
    generatedAt: new Date().toISOString(),
  };
}
