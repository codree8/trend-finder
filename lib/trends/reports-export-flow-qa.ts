import type {
  DailyBriefReportAudience,
  DailyBriefReportDocument,
  DailyBriefReportTone,
} from "@/lib/trends/types";

export type ReportsExportFlowStatus = "healthy" | "review" | "caution";

export type ReportsExportFlowSeverity = "success" | "info" | "warning";

export type ReportsExportFlowChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
};

export type ReportsExportFlowWarning = {
  id: string;
  label: string;
  detail: string;
  severity: ReportsExportFlowSeverity;
};

export type ReportsExportFlowStep = {
  id: string;
  label: string;
  detail: string;
  group: "review" | "preview" | "download" | "developer";
  recommended: boolean;
};

export type ReportsExportChannel = {
  id: DailyBriefReportAudience | "full_api" | "quick_copy" | "pdf_prep";
  label: string;
  status: "live" | "ready" | "planned" | "attention";
  tone: DailyBriefReportTone;
  detail: string;
};

export type ReportsExportFlowQa = {
  status: ReportsExportFlowStatus;
  statusLabel: string;
  score: number;
  summary: string;
  recommendedPath: string;
  metrics: {
    liveChannels: number;
    readyChannels: number;
    plannedChannels: number;
    validationWarnings: number;
    quickCopyReady: boolean;
  };
  channels: ReportsExportChannel[];
  checklist: ReportsExportFlowChecklistItem[];
  warnings: ReportsExportFlowWarning[];
  flowSteps: ReportsExportFlowStep[];
};

function hasTarget(
  document: DailyBriefReportDocument,
  target: DailyBriefReportAudience,
) {
  return document.exportTargets.includes(target);
}

function nonEmpty(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function channelStatusForTarget(
  document: DailyBriefReportDocument,
  target: DailyBriefReportAudience,
): ReportsExportChannel["status"] {
  if (target === "pdf" || target === "email") return "planned";
  return hasTarget(document, target) ? "live" : "attention";
}

export function buildReportsExportFlowQa(
  document: DailyBriefReportDocument,
): ReportsExportFlowQa {
  const hasHtml = hasTarget(document, "html");
  const hasJson = hasTarget(document, "json");
  const hasUi = hasTarget(document, "ui");
  const quickCopyReady =
    nonEmpty(document.quickCopy.headline) &&
    nonEmpty(document.quickCopy.summary) &&
    nonEmpty(document.quickCopy.markdown);

  const hasSections = document.integrity.sectionCount > 0;
  const hasBlocks = document.integrity.blockCount > 0;
  const hasTrendReferences = document.integrity.trendReferenceCount > 0;
  const hasValidationWarnings =
    document.integrity.validationWarnings.length > 0;

  const checklist: ReportsExportFlowChecklistItem[] = [
    {
      id: "report-document",
      label: "Stable report document",
      complete: document.schemaVersion === "daily-brief-export-v1",
      detail:
        "The Reports hub is powered by reportDocument instead of scraping React UI output.",
    },
    {
      id: "sections",
      label: "Section outline available",
      complete: hasSections && hasBlocks,
      detail:
        "Export sections and blocks are present for HTML, JSON and later PDF/email reuse.",
    },
    {
      id: "html-export",
      label: "HTML preview/download",
      complete: hasHtml,
      detail:
        "The live HTML channel is available for manual preview and file download.",
    },
    {
      id: "pdf-prep-layout",
      label: "PDF prep layout",
      complete: hasHtml && hasSections && hasBlocks,
      detail:
        "A print-safe A4 HTML layout is available for browser Print → Save as PDF without server PDF generation.",
    },
    {
      id: "json-export",
      label: "JSON report model",
      complete: hasJson,
      detail:
        "The JSON channel exposes the same report document for integrations and debugging.",
    },
    {
      id: "quick-copy",
      label: "Quick-copy payload",
      complete: quickCopyReady,
      detail:
        "A reusable summary and markdown payload are available for manual posting or notes.",
    },
    {
      id: "trend-references",
      label: "Trend references",
      complete: hasTrendReferences,
      detail:
        "At least one trend reference is present, so exported reports can link back to intelligence context.",
    },
  ];

  const warnings: ReportsExportFlowWarning[] = [];

  if (!hasHtml) {
    warnings.push({
      id: "missing-html",
      label: "HTML export target missing",
      detail:
        "HTML should be the primary manual export channel before PDF/email are introduced.",
      severity: "warning",
    });
  }

  if (!hasJson) {
    warnings.push({
      id: "missing-json",
      label: "JSON export target missing",
      detail:
        "JSON should stay available because future export layers need a stable source model.",
      severity: "warning",
    });
  }

  if (!quickCopyReady) {
    warnings.push({
      id: "quick-copy-thin",
      label: "Quick-copy payload is incomplete",
      detail:
        "Reports should not force the user to manually rewrite the same summary from UI cards.",
      severity: "warning",
    });
  }

  if (!hasTrendReferences) {
    warnings.push({
      id: "no-trend-references",
      label: "No trend references in report model",
      detail:
        "The report can still export, but the intelligence trail is weaker without trend references.",
      severity: "info",
    });
  }

  for (const warning of document.integrity.validationWarnings) {
    warnings.push({
      id: `document-warning-${warning}`,
      label: "Report document caution",
      detail: warning,
      severity: "warning",
    });
  }

  const completeChecks = checklist.filter((item) => item.complete).length;
  const baseScore = (completeChecks / checklist.length) * 100;
  const warningPenalty =
    warnings.filter((warning) => warning.severity === "warning").length * 8;
  const infoPenalty =
    warnings.filter((warning) => warning.severity === "info").length * 3;
  const score = clampScore(baseScore - warningPenalty - infoPenalty);

  const status: ReportsExportFlowStatus = hasValidationWarnings
    ? "caution"
    : score >= 84
      ? "healthy"
      : score >= 64
        ? "review"
        : "caution";

  const statusLabel: Record<ReportsExportFlowStatus, string> = {
    healthy: "Export flow healthy",
    review: "Export flow needs review",
    caution: "Export flow has cautions",
  };

  const channels: ReportsExportChannel[] = [
    {
      id: "ui",
      label: "Daily Brief UI",
      status: hasUi ? "live" : "attention",
      tone: hasUi ? "positive" : "warning",
      detail:
        "Interactive intelligence view with drawer flow, watch buttons and QA panels.",
    },
    {
      id: "html",
      label: "HTML Export",
      status: channelStatusForTarget(document, "html"),
      tone: hasHtml ? "positive" : "warning",
      detail:
        "Best manual-facing export for previewing and sharing a clean standalone report.",
    },
    {
      id: "pdf_prep",
      label: "PDF Prep Layout",
      status: hasHtml && hasSections && hasBlocks ? "ready" : "attention",
      tone: hasHtml && hasSections && hasBlocks ? "positive" : "warning",
      detail:
        "Print-safe A4 HTML route for manual browser Print → Save as PDF. Not a server PDF binary yet.",
    },
    {
      id: "json",
      label: "JSON Export",
      status: channelStatusForTarget(document, "json"),
      tone: hasJson ? "positive" : "warning",
      detail:
        "Best developer-facing export for integrations, inspection and future automation.",
    },
    {
      id: "quick_copy",
      label: "Quick Copy",
      status: quickCopyReady ? "ready" : "attention",
      tone: quickCopyReady ? "positive" : "warning",
      detail:
        "Manual summary/markdown payload for posts, notes or fast handoff without a file.",
    },
    {
      id: "full_api",
      label: "Full API Payload",
      status: "ready",
      tone: "neutral",
      detail:
        "Diagnostic payload for development. Useful, but not the primary user-facing export.",
    },
    {
      id: "pdf",
      label: "Server PDF Export",
      status: "planned",
      tone: "neutral",
      detail:
        "Planned later. The print-safe prep layout exists, but no server-side PDF generator has been added.",
    },
    {
      id: "email",
      label: "Email Report",
      status: "planned",
      tone: "neutral",
      detail:
        "Planned later. No email sending, cron or report database has been added.",
    },
  ];

  const liveChannels = channels.filter(
    (channel) =>
      (channel.id === "html" || channel.id === "json") &&
      channel.status === "live",
  ).length;
  const readyChannels = channels.filter(
    (channel) =>
      (channel.id === "quick_copy" ||
        channel.id === "full_api" ||
        channel.id === "pdf_prep") &&
      channel.status === "ready",
  ).length;
  const plannedChannels = channels.filter(
    (channel) => channel.status === "planned",
  ).length;

  return {
    status,
    statusLabel: statusLabel[status],
    score,
    summary:
      status === "healthy"
        ? "Reports is wired to the real Daily Brief model with clear manual export paths and a print-safe PDF prep layer. Keep server PDF/email out until this flow stays boringly reliable. Boring is good here."
        : "Reports can export, but the flow has at least one clarity or integrity issue that should be fixed before adding server PDF/email complexity.",
    recommendedPath:
      "Recommended order: open Daily Brief for context, preview HTML for human review, open PDF prep only when you need browser Save as PDF, and use JSON only for model inspection or integrations.",
    metrics: {
      liveChannels,
      readyChannels,
      plannedChannels,
      validationWarnings: document.integrity.validationWarnings.length,
      quickCopyReady,
    },
    channels,
    checklist,
    warnings,
    flowSteps: [
      {
        id: "open-brief",
        label: "Open Daily Brief",
        detail:
          "Review the real intelligence page first, especially QA and narrative tuning.",
        group: "review",
        recommended: true,
      },
      {
        id: "preview-html",
        label: "Preview HTML",
        detail:
          "Use this as the primary manual report preview before sharing or saving.",
        group: "preview",
        recommended: true,
      },
      {
        id: "pdf-prep",
        label: "Open PDF prep",
        detail:
          "Use the print-safe A4 layout when you need browser Print → Save as PDF.",
        group: "preview",
        recommended: true,
      },
      {
        id: "download-html",
        label: "Download HTML",
        detail:
          "Download only after preview looks clean for the selected window.",
        group: "download",
        recommended: true,
      },
      {
        id: "preview-json",
        label: "Preview JSON",
        detail:
          "Inspect the reportDocument model when validating exports or future integrations.",
        group: "developer",
        recommended: false,
      },
      {
        id: "full-api",
        label: "Full API payload",
        detail:
          "Use for debugging the entire Daily Brief response, not as the main user report.",
        group: "developer",
        recommended: false,
      },
    ],
  };
}
