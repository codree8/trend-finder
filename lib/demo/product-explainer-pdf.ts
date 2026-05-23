import type { ExplainerDocument } from "@/lib/demo/product-explainer-document";
import { buildProductExplainerFilename } from "@/lib/demo/product-explainer-document";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 58;
const MARGIN_BOTTOM = 58;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const TITLE_FONT_SIZE = 22;
const SECTION_FONT_SIZE = 15;
const BODY_FONT_SIZE = 10;
const SMALL_FONT_SIZE = 8.5;
const BODY_LINE_HEIGHT = 14;
const SMALL_LINE_HEIGHT = 11.5;

type PdfLine = {
  text: string;
  size?: number;
  lineHeight?: number;
  font?: "regular" | "bold";
  indent?: number;
  spacingBefore?: number;
  spacingAfter?: number;
};

type PdfPage = PdfLine[];

export type ProductExplainerPdf = {
  filename: string;
  bytes: Uint8Array;
  pageCount: number;
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sanitizePdfText(value);
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

function pushLine(lines: PdfLine[], line: PdfLine) {
  const text = sanitizePdfText(line.text);
  if (!text && !line.spacingBefore && !line.spacingAfter) return;
  lines.push({ ...line, text });
}

function pushWrapped(lines: PdfLine[], text: string, options: Omit<PdfLine, "text"> = {}) {
  const fontSize = options.size ?? BODY_FONT_SIZE;
  const indent = options.indent ?? 0;
  const wrapped = wrapText(text, CONTENT_WIDTH - indent, fontSize);

  wrapped.forEach((line, index) => {
    pushLine(lines, {
      ...options,
      text: line,
      spacingBefore: index === 0 ? options.spacingBefore : 0,
      spacingAfter: index === wrapped.length - 1 ? options.spacingAfter : 0,
    });
  });
}

function buildPdfLines(document: ExplainerDocument) {
  const lines: PdfLine[] = [];

  pushWrapped(lines, document.title, {
    size: TITLE_FONT_SIZE,
    lineHeight: 26,
    font: "bold",
    spacingAfter: 6,
  });
  pushWrapped(lines, document.subtitle, {
    size: 12,
    lineHeight: 16,
    spacingAfter: 12,
  });
  pushWrapped(lines, `Generated: ${formatDate(document.generatedAt)}`, {
    size: SMALL_FONT_SIZE,
    lineHeight: SMALL_LINE_HEIGHT,
    spacingAfter: 12,
  });
  pushWrapped(lines, document.summary, {
    size: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    spacingAfter: 8,
  });
  pushWrapped(lines, `Core promise: ${document.corePromise}`, {
    size: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    font: "bold",
    spacingAfter: 14,
  });

  pushWrapped(lines, "End-to-end workflow", {
    size: SECTION_FONT_SIZE,
    lineHeight: 19,
    font: "bold",
    spacingBefore: 6,
    spacingAfter: 6,
  });

  for (const step of document.steps) {
    pushWrapped(lines, `${step.eyebrow} - ${step.title}`, {
      size: 12,
      lineHeight: 16,
      font: "bold",
      spacingBefore: 8,
      spacingAfter: 3,
    });
    pushWrapped(lines, step.description, {
      size: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      spacingAfter: 4,
    });
    for (const bullet of step.bullets.slice(0, 4)) {
      pushWrapped(lines, `- ${bullet}`, {
        size: SMALL_FONT_SIZE,
        lineHeight: SMALL_LINE_HEIGHT,
        indent: 10,
      });
    }
    pushWrapped(lines, `Output: ${step.output}`, {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      font: "bold",
      spacingAfter: 4,
    });
  }

  const groups = [
    ["Product side", document.productSide],
    ["Admin side", document.adminSide],
    ["Practical outputs", document.outputs],
    ["Boundaries", document.boundaries],
  ] as const;

  for (const [title, sections] of groups) {
    pushWrapped(lines, title, {
      size: SECTION_FONT_SIZE,
      lineHeight: 19,
      font: "bold",
      spacingBefore: 14,
      spacingAfter: 6,
    });

    for (const section of sections) {
      pushWrapped(lines, section.title, {
        size: 11.5,
        lineHeight: 15,
        font: "bold",
        spacingBefore: 6,
      });
      pushWrapped(lines, section.description, {
        size: SMALL_FONT_SIZE,
        lineHeight: SMALL_LINE_HEIGHT,
      });
      for (const item of section.items.slice(0, 3)) {
        pushWrapped(lines, `- ${item}`, {
          size: SMALL_FONT_SIZE,
          lineHeight: SMALL_LINE_HEIGHT,
          indent: 10,
        });
      }
    }
  }

  pushWrapped(
    lines,
    "Generated by Trend Finder. This explainer describes the current manual AI signal radar flow and separates product UX from admin diagnostics.",
    {
      size: SMALL_FONT_SIZE,
      lineHeight: SMALL_LINE_HEIGHT,
      spacingBefore: 16,
    },
  );

  return lines;
}

function paginate(lines: PdfLine[]) {
  const pages: PdfPage[] = [];
  let current: PdfPage = [];
  let y = MARGIN_TOP;
  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM;

  for (const line of lines) {
    const lineHeight = line.lineHeight ?? BODY_LINE_HEIGHT;
    const required = (line.spacingBefore ?? 0) + lineHeight + (line.spacingAfter ?? 0);

    if (current.length > 0 && y + required > maxY) {
      pages.push(current);
      current = [];
      y = MARGIN_TOP;
    }

    current.push(line);
    y += required;
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[{ text: "No content available." }]];
}

function renderPageContent(page: PdfPage, pageNumber: number, pageCount: number) {
  const commands: string[] = ["BT"];
  let y = PAGE_HEIGHT - MARGIN_TOP;

  commands.push("/F2 8 Tf");
  commands.push(`1 0 0 1 ${MARGIN_X} ${PAGE_HEIGHT - 32} Tm`);
  commands.push(`(${escapePdfLiteral("Trend Finder System Explainer")}) Tj`);
  commands.push("/F1 8 Tf");
  commands.push(`1 0 0 1 ${PAGE_WIDTH - MARGIN_X - 76} 30 Tm`);
  commands.push(`(${escapePdfLiteral(`Page ${pageNumber} / ${pageCount}`)}) Tj`);

  for (const line of page) {
    const fontSize = line.size ?? BODY_FONT_SIZE;
    const lineHeight = line.lineHeight ?? BODY_LINE_HEIGHT;
    const font = line.font === "bold" ? "F2" : "F1";
    const indent = line.indent ?? 0;

    y -= line.spacingBefore ?? 0;
    commands.push(`/${font} ${fontSize} Tf`);
    commands.push(`1 0 0 1 ${MARGIN_X + indent} ${y} Tm`);
    commands.push(`(${escapePdfLiteral(line.text)}) Tj`);
    y -= lineHeight + (line.spacingAfter ?? 0);
  }

  commands.push("ET");
  return commands.join("\n");
}

function byteLength(value: string) {
  return Buffer.byteLength(value, "binary");
}

function buildPdfFromPages(pages: PdfPage[]) {
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectIds = pages.map((_, index) => 5 + index * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pages.forEach((page, index) => {
    const pageObjectId = pageObjectIds[index];
    const contentObjectId = pageObjectId + 1;
    const content = renderPageContent(page, index + 1, pages.length);

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.push(`<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`);
  });

  const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  let body = header;
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Uint8Array(Buffer.from(body, "binary"));
}

export function buildProductExplainerPdf(document: ExplainerDocument): ProductExplainerPdf {
  const pages = paginate(buildPdfLines(document));

  return {
    filename: buildProductExplainerFilename("pdf"),
    bytes: buildPdfFromPages(pages),
    pageCount: pages.length,
  };
}
