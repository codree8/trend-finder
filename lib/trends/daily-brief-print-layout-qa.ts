import type {
  DailyBriefReportBlock,
  DailyBriefReportDocument,
  DailyBriefReportSection,
  DailyBriefReportTone,
} from "@/lib/trends/types";

export type DailyBriefPrintLayoutStatus = "ready" | "review" | "caution";

export type DailyBriefPrintLayoutSeverity = "success" | "info" | "warning";

export type DailyBriefPrintLayoutRisk = "low" | "medium" | "high";

export type DailyBriefPrintLayoutIssue = {
  id: string;
  label: string;
  detail: string;
  severity: DailyBriefPrintLayoutSeverity;
};

export type DailyBriefPrintBlockAssessment = {
  id: string;
  title: string;
  estimatedUnits: number;
  risk: DailyBriefPrintLayoutRisk;
  keepTogether: boolean;
  notes: string[];
};

export type DailyBriefPrintSectionAssessment = {
  id: string;
  title: string;
  estimatedUnits: number;
  estimatedPages: number;
  blockCount: number;
  forcedPageBreak: boolean;
  risk: DailyBriefPrintLayoutRisk;
  notes: string[];
  blocks: DailyBriefPrintBlockAssessment[];
};

export type DailyBriefPrintLayoutQa = {
  status: DailyBriefPrintLayoutStatus;
  statusLabel: string;
  score: number;
  summary: string;
  recommendedPrintMode: string;
  metrics: {
    estimatedPages: number;
    printableSections: number;
    forcedPageBreaks: number;
    keepTogetherBlocks: number;
    splitAllowedBlocks: number;
    denseSections: number;
    oversizedBlocks: number;
    validationWarnings: number;
  };
  sections: DailyBriefPrintSectionAssessment[];
  issues: DailyBriefPrintLayoutIssue[];
  tuningNotes: string[];
};

const PAGE_UNIT_TARGET = 96;
const COVER_UNITS = 42;
const VALIDATION_NOTE_UNITS = 14;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function wordCount(value: string | undefined) {
  if (!value) return 0;
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function tonePenalty(tone: DailyBriefReportTone | undefined) {
  if (tone === "danger") return 4;
  if (tone === "warning") return 2;
  return 0;
}

function estimateBlockUnits(block: DailyBriefReportBlock) {
  const textUnits = Math.ceil(
    (wordCount(block.title) +
      wordCount(block.description) +
      wordCount(block.body)) /
      18,
  );
  const bulletUnits = (block.bullets?.length ?? 0) * 4;
  const metricUnits = (block.metrics?.length ?? 0) * 5;
  const refUnits = (block.trendRefs?.length ?? 0) * 6;

  return (
    10 +
    textUnits +
    bulletUnits +
    metricUnits +
    refUnits +
    tonePenalty(block.tone)
  );
}

function estimateSectionUnits(section: DailyBriefReportSection) {
  return (
    20 +
    Math.ceil(
      (wordCount(section.title) + wordCount(section.description)) / 16,
    ) +
    section.blocks.reduce((sum, block) => sum + estimateBlockUnits(block), 0)
  );
}

function riskFromUnits(units: number, mediumAt: number, highAt: number) {
  if (units >= highAt) return "high";
  if (units >= mediumAt) return "medium";
  return "low";
}

function assessBlock(
  block: DailyBriefReportBlock,
): DailyBriefPrintBlockAssessment {
  const estimatedUnits = estimateBlockUnits(block);
  const refCount = block.trendRefs?.length ?? 0;
  const bulletCount = block.bullets?.length ?? 0;
  const risk = riskFromUnits(estimatedUnits, 42, 72);
  const notes: string[] = [];

  if (risk === "high") {
    notes.push(
      "Large block: allow internal splitting instead of forcing a whole-card keep-together rule.",
    );
  }

  if (refCount >= 8) {
    notes.push(
      "Many trend references: compact spacing is needed to avoid a lonely trailing reference on the next page.",
    );
  }

  if (bulletCount >= 7) {
    notes.push(
      "Long bullet list: preserve list-item break rules to reduce ugly mid-bullet page cuts.",
    );
  }

  return {
    id: block.id,
    title: block.title,
    estimatedUnits,
    risk,
    keepTogether: risk !== "high",
    notes,
  };
}

function assessSection(
  section: DailyBriefReportSection,
): DailyBriefPrintSectionAssessment {
  const estimatedUnits = estimateSectionUnits(section);
  const blocks = section.blocks.map(assessBlock);
  const risk = riskFromUnits(estimatedUnits, 118, 178);
  const notes: string[] = [];

  if (risk === "high") {
    notes.push(
      "Dense section: it is expected to span more than one page, so long blocks should be allowed to split cleanly.",
    );
  } else if (risk === "medium") {
    notes.push(
      "Medium-density section: keep the heading attached to the first block and avoid adding extra decorative spacing.",
    );
  }

  if (section.pageBreakBefore) {
    notes.push("Forced page break is intentional for report readability.");
  }

  return {
    id: section.id,
    title: section.title,
    estimatedUnits,
    estimatedPages: Math.max(1, Math.ceil(estimatedUnits / PAGE_UNIT_TARGET)),
    blockCount: section.blocks.length,
    forcedPageBreak: Boolean(section.pageBreakBefore),
    risk,
    notes,
    blocks,
  };
}

function uniqueIssues(issues: DailyBriefPrintLayoutIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.id)) return false;
    seen.add(issue.id);
    return true;
  });
}

export function buildDailyBriefPrintLayoutQa(
  document: DailyBriefReportDocument,
): DailyBriefPrintLayoutQa {
  const sections = document.sections.map(assessSection);
  const allBlocks = sections.flatMap((section) => section.blocks);
  const forcedPageBreaks = sections.filter(
    (section) => section.forcedPageBreak,
  ).length;
  const denseSections = sections.filter(
    (section) => section.risk !== "low",
  ).length;
  const oversizedBlocks = allBlocks.filter(
    (block) => block.risk === "high",
  ).length;
  const splitAllowedBlocks = allBlocks.filter(
    (block) => !block.keepTogether,
  ).length;
  const keepTogetherBlocks = allBlocks.length - splitAllowedBlocks;
  const validationWarnings = document.integrity.validationWarnings.length;
  const totalUnits =
    COVER_UNITS +
    sections.reduce((sum, section) => sum + section.estimatedUnits, 0) +
    (validationWarnings > 0 ? VALIDATION_NOTE_UNITS : 0);
  const estimatedPages = Math.max(1, Math.ceil(totalUnits / PAGE_UNIT_TARGET));

  const issues: DailyBriefPrintLayoutIssue[] = [];

  if (estimatedPages > 9) {
    issues.push({
      id: "long-report",
      label: "Long print output",
      detail:
        "The selected window may produce a long PDF. Keep section breaks and compact spacing enabled before adding server PDF generation.",
      severity: "warning",
    });
  } else if (estimatedPages > 6) {
    issues.push({
      id: "medium-report-length",
      label: "Medium-length print output",
      detail:
        "The layout is printable, but the report is long enough that page breaks should be reviewed manually.",
      severity: "info",
    });
  }

  if (oversizedBlocks > 0) {
    issues.push({
      id: "oversized-blocks",
      label: "Oversized blocks detected",
      detail:
        "At least one block is too large for safe keep-together behavior, so the print CSS should allow clean internal splitting.",
      severity: "warning",
    });
  }

  if (denseSections > 0) {
    issues.push({
      id: "dense-sections",
      label: "Dense sections need review",
      detail:
        "Some sections carry enough content to risk awkward page endings. Review the PDF prep output before saving.",
      severity: "info",
    });
  }

  if (validationWarnings > 0) {
    issues.push({
      id: "document-validation-warnings",
      label: "Report document cautions exist",
      detail:
        "Print layout is ready, but the exported content still includes report-level validation cautions.",
      severity: "warning",
    });
  }

  if (document.integrity.blockCount === 0) {
    issues.push({
      id: "empty-document",
      label: "No printable blocks",
      detail:
        "The report document has no blocks, so a print/PDF output would be empty or misleading.",
      severity: "warning",
    });
  }

  const normalizedIssues = uniqueIssues(issues);
  const warningCount = normalizedIssues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  const infoCount = normalizedIssues.filter(
    (issue) => issue.severity === "info",
  ).length;
  const score = clampScore(
    100 -
      warningCount * 14 -
      infoCount * 5 -
      Math.max(0, estimatedPages - 6) * 4 -
      oversizedBlocks * 6,
  );
  const status: DailyBriefPrintLayoutStatus =
    warningCount > 1 || estimatedPages > 10
      ? "caution"
      : warningCount > 0 || infoCount > 0
        ? "review"
        : "ready";

  const statusLabel: Record<DailyBriefPrintLayoutStatus, string> = {
    ready: "Print layout ready",
    review: "Print layout needs review",
    caution: "Print layout has cautions",
  };

  return {
    status,
    statusLabel: statusLabel[status],
    score,
    summary:
      status === "ready"
        ? "The PDF prep layout is compact, sectioned and safe for browser Print → Save as PDF. Keep this stable before adding a real PDF renderer."
        : "The print layout can still be used, but the selected window has density or content cautions that should be reviewed before saving as PDF.",
    recommendedPrintMode:
      estimatedPages > 8 || oversizedBlocks > 0
        ? "Use browser preview first, then Save as PDF only after checking page breaks."
        : "Use standard browser Print → Save as PDF with A4 portrait.",
    metrics: {
      estimatedPages,
      printableSections: sections.length,
      forcedPageBreaks,
      keepTogetherBlocks,
      splitAllowedBlocks,
      denseSections,
      oversizedBlocks,
      validationWarnings,
    },
    sections,
    issues: normalizedIssues,
    tuningNotes: [
      "A4 portrait is the baseline; the route intentionally returns print-safe HTML, not a PDF binary.",
      "Section headings are kept with their first block to reduce orphan headings at page bottoms.",
      "Normal blocks use break-inside: avoid; oversized blocks can split internally to avoid giant blank gaps.",
      "Trend reference cards and bullet items keep their own break rules so evidence does not fracture mid-row.",
    ],
  };
}

export function printLayoutRiskTone(
  risk: DailyBriefPrintLayoutRisk,
): DailyBriefReportTone {
  if (risk === "high") return "danger";
  if (risk === "medium") return "warning";
  return "positive";
}

export function printLayoutStatusTone(
  status: DailyBriefPrintLayoutStatus,
): DailyBriefReportTone {
  if (status === "ready") return "positive";
  if (status === "review") return "warning";
  return "danger";
}
