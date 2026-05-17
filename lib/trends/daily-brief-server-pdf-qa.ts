import type { DailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import type {
  DailyBriefReportBlock,
  DailyBriefReportDocument,
  DailyBriefReportTone,
} from "@/lib/trends/types";

export type DailyBriefServerPdfReliabilityStatus =
  | "healthy"
  | "review"
  | "caution";

export type DailyBriefServerPdfReliabilitySeverity =
  | "success"
  | "info"
  | "warning"
  | "danger";

export type DailyBriefServerPdfReliabilityCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  severity: DailyBriefServerPdfReliabilitySeverity;
};

export type DailyBriefServerPdfReliabilityIssue = {
  id: string;
  label: string;
  detail: string;
  severity: Exclude<DailyBriefServerPdfReliabilitySeverity, "success">;
};

export type DailyBriefServerPdfReliabilityQa = {
  status: DailyBriefServerPdfReliabilityStatus;
  statusLabel: string;
  score: number;
  generatedAt: string;
  summary: string;
  recommendedAction: string;
  metrics: {
    byteSize: number;
    kilobytes: number;
    bytesPerPage: number;
    pageCount: number;
    estimatedPrintPages: number;
    pageDelta: number;
    contentStreams: number;
    pdfObjects: number;
    contentCharacters: number;
    textDensityPerPage: number;
    truncatedSections: number;
    truncatedBlocks: number;
    truncatedListItems: number;
    validationWarnings: number;
  };
  checks: DailyBriefServerPdfReliabilityCheck[];
  issues: DailyBriefServerPdfReliabilityIssue[];
  tuningNotes: string[];
};

type ServerPdfBuildSummary = {
  filename: string;
  bytes: Uint8Array;
  pageCount: number;
};

const SERVER_PDF_LIMITS = {
  maxSections: 8,
  maxBlocksPerSection: 8,
  maxBulletsPerBlock: 6,
  maxMetricsPerBlock: 6,
  maxTrendRefsPerBlock: 6,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function bytesToLatin1(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("latin1");
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function textLength(value: string | number | null | undefined) {
  return String(value ?? "").trim().length;
}

function blockTextCharacters(block: DailyBriefReportBlock) {
  return (
    textLength(block.title) +
    textLength(block.description) +
    textLength(block.body) +
    (block.bullets ?? []).reduce((sum, item) => sum + textLength(item), 0) +
    (block.metrics ?? []).reduce(
      (sum, item) =>
        sum + textLength(item.label) + textLength(item.value) + textLength(item.helper),
      0,
    ) +
    (block.trendRefs ?? []).reduce(
      (sum, item) =>
        sum +
        textLength(item.topic) +
        textLength(item.status) +
        textLength(item.lifecycleStatus) +
        textLength(item.helper),
      0,
    )
  );
}

function documentTextCharacters(document: DailyBriefReportDocument) {
  const quickCopyCharacters =
    textLength(document.quickCopy.headline) +
    textLength(document.quickCopy.summary) +
    textLength(document.quickCopy.focusToday) +
    textLength(document.quickCopy.monitor) +
    textLength(document.quickCopy.avoid) +
    document.quickCopy.bullets.reduce((sum, item) => sum + textLength(item), 0);

  const sectionCharacters = document.sections.reduce(
    (sectionSum, section) =>
      sectionSum +
      textLength(section.title) +
      textLength(section.description) +
      section.blocks.reduce(
        (blockSum, block) => blockSum + blockTextCharacters(block),
        0,
      ),
    0,
  );

  return quickCopyCharacters + sectionCharacters;
}

function countTruncatedItems(document: DailyBriefReportDocument) {
  const truncatedSections = Math.max(
    0,
    document.sections.length - SERVER_PDF_LIMITS.maxSections,
  );

  let truncatedBlocks = 0;
  let truncatedListItems = 0;

  for (const section of document.sections) {
    truncatedBlocks += Math.max(
      0,
      section.blocks.length - SERVER_PDF_LIMITS.maxBlocksPerSection,
    );

    for (const block of section.blocks) {
      truncatedListItems += Math.max(
        0,
        (block.bullets?.length ?? 0) - SERVER_PDF_LIMITS.maxBulletsPerBlock,
      );
      truncatedListItems += Math.max(
        0,
        (block.metrics?.length ?? 0) - SERVER_PDF_LIMITS.maxMetricsPerBlock,
      );
      truncatedListItems += Math.max(
        0,
        (block.trendRefs?.length ?? 0) - SERVER_PDF_LIMITS.maxTrendRefsPerBlock,
      );
    }
  }

  return { truncatedSections, truncatedBlocks, truncatedListItems };
}

function check(
  id: string,
  label: string,
  passed: boolean,
  detail: string,
  severity: DailyBriefServerPdfReliabilitySeverity,
): DailyBriefServerPdfReliabilityCheck {
  return { id, label, passed, detail, severity };
}

function issue(
  id: string,
  label: string,
  detail: string,
  severity: DailyBriefServerPdfReliabilityIssue["severity"],
): DailyBriefServerPdfReliabilityIssue {
  return { id, label, detail, severity };
}

function toneForStatus(status: DailyBriefServerPdfReliabilityStatus): DailyBriefReportTone {
  if (status === "healthy") return "positive";
  if (status === "review") return "warning";
  return "danger";
}

export function serverPdfReliabilityStatusTone(
  status: DailyBriefServerPdfReliabilityStatus,
): DailyBriefReportTone {
  return toneForStatus(status);
}

export function buildDailyBriefServerPdfReliabilityQa({
  document,
  pdf,
  printQa,
}: {
  document: DailyBriefReportDocument;
  pdf: ServerPdfBuildSummary;
  printQa: DailyBriefPrintLayoutQa;
}): DailyBriefServerPdfReliabilityQa {
  const pdfText = bytesToLatin1(pdf.bytes);
  const byteSize = pdf.bytes.byteLength;
  const pageCount = Math.max(0, pdf.pageCount);
  const pageObjectCount = countMatches(pdfText, /\/Type\s*\/Page\b/g);
  const contentStreams = countMatches(pdfText, /\nstream\n/g);
  const pdfObjects = countMatches(pdfText, /\n\d+\s+0\s+obj\n/g);
  const contentCharacters = documentTextCharacters(document);
  const bytesPerPage = pageCount > 0 ? Math.round(byteSize / pageCount) : 0;
  const textDensityPerPage =
    pageCount > 0 ? Math.round(contentCharacters / pageCount) : 0;
  const pageDelta = Math.abs(pageCount - printQa.metrics.estimatedPages);
  const truncation = countTruncatedItems(document);

  const checks: DailyBriefServerPdfReliabilityCheck[] = [
    check(
      "pdf-header",
      "PDF header",
      pdfText.startsWith("%PDF-"),
      "The binary starts with a valid PDF magic header.",
      "danger",
    ),
    check(
      "pdf-eof",
      "EOF marker",
      pdfText.includes("%%EOF"),
      "The binary includes a PDF EOF marker.",
      "danger",
    ),
    check(
      "catalog",
      "Catalog object",
      /\/Type\s*\/Catalog/.test(pdfText),
      "The file includes a root catalog object.",
      "danger",
    ),
    check(
      "pages-tree",
      "Pages tree",
      /\/Type\s*\/Pages/.test(pdfText),
      "The file includes a pages tree.",
      "danger",
    ),
    check(
      "xref",
      "XRef table",
      /\nxref\n/.test(pdfText),
      "The file includes an xref table for PDF readers.",
      "danger",
    ),
    check(
      "page-count",
      "Page count",
      pageCount > 0 && pageObjectCount === pageCount,
      `Generator reported ${pageCount} page(s); PDF contains ${pageObjectCount} page object(s).`,
      "warning",
    ),
    check(
      "content-streams",
      "Content streams",
      contentStreams === pageCount && contentStreams > 0,
      `PDF contains ${contentStreams} content stream(s) for ${pageCount} page(s).`,
      "warning",
    ),
    check(
      "byte-size",
      "Binary size",
      byteSize >= 2400,
      `The generated PDF is ${Math.round(byteSize / 102.4) / 10} KB. Very tiny PDFs are often empty or broken.`,
      "warning",
    ),
    check(
      "page-delta",
      "Page estimate delta",
      pageDelta <= Math.max(2, Math.ceil(printQa.metrics.estimatedPages * 0.65)),
      `Server PDF has ${pageCount} page(s); print-prep estimated ${printQa.metrics.estimatedPages}.`,
      "info",
    ),
  ];

  const issues: DailyBriefServerPdfReliabilityIssue[] = [];

  for (const currentCheck of checks) {
    if (currentCheck.passed) continue;

    issues.push(
      issue(
        `failed-${currentCheck.id}`,
        currentCheck.label,
        currentCheck.detail,
        currentCheck.severity === "success" ? "info" : currentCheck.severity,
      ),
    );
  }

  if (printQa.status === "caution") {
    issues.push(
      issue(
        "print-layout-caution",
        "Print layout caution inherited",
        "The PDF binary is generated, but the underlying print layout QA is already cautious. Review PDF prep before trusting the binary output.",
        "warning",
      ),
    );
  }

  if (document.integrity.validationWarnings.length > 0) {
    issues.push(
      issue(
        "report-document-warnings",
        "Report document warnings",
        `${document.integrity.validationWarnings.length} reportDocument validation warning(s) should be preserved in exported files.`,
        "warning",
      ),
    );
  }

  if (pageCount > 12) {
    issues.push(
      issue(
        "long-pdf",
        "PDF is getting long",
        "The generated PDF is longer than 12 pages. Consider stronger section limits or use HTML for full detail.",
        "info",
      ),
    );
  }

  if (bytesPerPage > 0 && bytesPerPage < 1400) {
    issues.push(
      issue(
        "low-bytes-per-page",
        "Low bytes per page",
        "The PDF is structurally valid, but each page is very small. This can indicate sparse output or over-aggressive trimming.",
        "info",
      ),
    );
  }

  if (truncation.truncatedSections > 0) {
    issues.push(
      issue(
        "section-truncation",
        "Sections truncated for compact PDF",
        `${truncation.truncatedSections} section(s) exceed the compact server PDF limit. HTML remains the full-fidelity export.`,
        "info",
      ),
    );
  }

  if (truncation.truncatedBlocks > 0 || truncation.truncatedListItems > 0) {
    issues.push(
      issue(
        "block-truncation",
        "Long blocks compacted",
        `${truncation.truncatedBlocks} block(s) and ${truncation.truncatedListItems} list item(s) exceed compact PDF limits. This is intentional, but it should stay visible in QA.`,
        "info",
      ),
    );
  }

  const dangerCount = issues.filter((item) => item.severity === "danger").length;
  const warningCount = issues.filter(
    (item) => item.severity === "warning",
  ).length;
  const infoCount = issues.filter((item) => item.severity === "info").length;

  const score = clampScore(
    100 -
      dangerCount * 28 -
      warningCount * 10 -
      infoCount * 3 -
      document.integrity.validationWarnings.length * 4,
  );

  const status: DailyBriefServerPdfReliabilityStatus =
    dangerCount > 0 || score < 68
      ? "caution"
      : warningCount > 0 || score < 86
        ? "review"
        : "healthy";

  const statusLabel: Record<DailyBriefServerPdfReliabilityStatus, string> = {
    healthy: "Server PDF reliable",
    review: "Server PDF needs review",
    caution: "Server PDF has cautions",
  };

  const tuningNotes = [
    "Keep HTML as the full-fidelity export; the server PDF is intentionally compact for reliability.",
    "Use the PDF health endpoint after major reportDocument changes, especially when new sections or block types are added.",
    "Do not add background delivery until PDF health stays stable across 24h, 7d and 30d windows.",
  ];

  if (truncation.truncatedBlocks > 0 || truncation.truncatedListItems > 0) {
    tuningNotes.unshift(
      "The compact PDF renderer trimmed some long lists; this is acceptable for v1, but full detail should remain in HTML/JSON.",
    );
  }

  if (printQa.status !== "ready") {
    tuningNotes.unshift(
      "Print QA is not fully ready; review the PDF prep layout before treating the binary PDF as share-ready.",
    );
  }

  return {
    status,
    statusLabel: statusLabel[status],
    score,
    generatedAt: new Date().toISOString(),
    summary:
      status === "healthy"
        ? "The server PDF passed structural checks, page accounting and compactness checks for the current Daily Brief window. It is safe to use as the binary export path. Boring PDF, happy life."
        : status === "review"
          ? "The server PDF is generated and readable, but at least one reliability signal deserves review before it becomes the default sharing path."
          : "The server PDF has a structural or reliability caution. Use HTML/PDF prep first and inspect the health details before sharing the binary file.",
    recommendedAction:
      status === "healthy"
        ? "Use Preview PDF for a quick visual check, then Download PDF when a binary file is needed."
        : status === "review"
          ? "Preview the PDF and compare it with HTML export before sharing. Keep JSON available for model inspection."
          : "Treat HTML export as primary until the PDF health warnings are fixed.",
    metrics: {
      byteSize,
      kilobytes: Math.round((byteSize / 1024) * 10) / 10,
      bytesPerPage,
      pageCount,
      estimatedPrintPages: printQa.metrics.estimatedPages,
      pageDelta,
      contentStreams,
      pdfObjects,
      contentCharacters,
      textDensityPerPage,
      truncatedSections: truncation.truncatedSections,
      truncatedBlocks: truncation.truncatedBlocks,
      truncatedListItems: truncation.truncatedListItems,
      validationWarnings: document.integrity.validationWarnings.length,
    },
    checks,
    issues,
    tuningNotes,
  };
}
