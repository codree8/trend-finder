import type { DailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import type { DailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import type {
  ReportsExportChannel,
  ReportsExportFlowQa,
} from "@/lib/trends/reports-export-flow-qa";
import type {
  DailyBriefReportDocument,
  DailyBriefReportTone,
} from "@/lib/trends/types";

export type ExportSystemReadinessStatus = "ready" | "review" | "blocked";

export type ExportSystemAutomationStatus =
  | "ready_for_dry_run"
  | "manual_ready_only"
  | "not_ready";

export type ExportSystemReadinessSeverity =
  | "success"
  | "info"
  | "warning"
  | "danger";

export type ExportSystemReadinessGateStatus =
  | "pass"
  | "watch"
  | "fail"
  | "planned";

export type ExportSystemReadinessGateCategory =
  | "data_model"
  | "manual_export"
  | "pdf_reliability"
  | "automation_boundary";

export type ExportSystemReadinessGate = {
  id: string;
  label: string;
  category: ExportSystemReadinessGateCategory;
  status: ExportSystemReadinessGateStatus;
  severity: ExportSystemReadinessSeverity;
  automationBlocking: boolean;
  detail: string;
  recommendedAction: string;
};

export type ExportSystemReadinessRecommendation = {
  id: string;
  label: string;
  detail: string;
  priority: "now" | "next" | "later";
};

export type ExportSystemReadiness = {
  schemaVersion: "export-system-readiness-v1";
  generatedAt: string;
  status: ExportSystemReadinessStatus;
  statusLabel: string;
  automationStatus: ExportSystemAutomationStatus;
  automationStatusLabel: string;
  tone: DailyBriefReportTone;
  score: number;
  manualExportScore: number;
  automationReadinessScore: number;
  summary: string;
  recommendedNextStep: string;
  metrics: {
    liveExportChannels: number;
    readySupportChannels: number;
    plannedChannels: number;
    validationWarnings: number;
    reportSections: number;
    reportBlocks: number;
    trendReferences: number;
    exportFlowScore: number;
    printLayoutScore: number;
    serverPdfScore: number;
    criticalBlockers: number;
    warnings: number;
    plannedBoundaries: number;
  };
  gates: ExportSystemReadinessGate[];
  recommendations: ExportSystemReadinessRecommendation[];
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function channelById(
  exportQa: ReportsExportFlowQa,
  id: ReportsExportChannel["id"],
) {
  return exportQa.channels.find((channel) => channel.id === id);
}

function gate({
  id,
  label,
  category,
  status,
  severity,
  automationBlocking,
  detail,
  recommendedAction,
}: ExportSystemReadinessGate): ExportSystemReadinessGate {
  return {
    id,
    label,
    category,
    status,
    severity,
    automationBlocking,
    detail,
    recommendedAction,
  };
}

function passOrFail(condition: boolean): ExportSystemReadinessGateStatus {
  return condition ? "pass" : "fail";
}

function severityForPassFail(
  condition: boolean,
  failSeverity: ExportSystemReadinessSeverity = "danger",
): ExportSystemReadinessSeverity {
  return condition ? "success" : failSeverity;
}

function statusLabel(status: ExportSystemReadinessStatus) {
  const labels: Record<ExportSystemReadinessStatus, string> = {
    ready: "Export system ready",
    review: "Export system needs review",
    blocked: "Export system blocked",
  };

  return labels[status];
}

function automationLabel(status: ExportSystemAutomationStatus) {
  const labels: Record<ExportSystemAutomationStatus, string> = {
    ready_for_dry_run: "Ready for automation dry-run",
    manual_ready_only: "Manual exports ready only",
    not_ready: "Not ready for automation",
  };

  return labels[status];
}

function toneForStatus(
  status: ExportSystemReadinessStatus,
): DailyBriefReportTone {
  if (status === "ready") return "positive";
  if (status === "review") return "warning";
  return "danger";
}

function gatePenalty(gateItem: ExportSystemReadinessGate) {
  if (gateItem.status === "fail") return gateItem.automationBlocking ? 24 : 15;
  if (gateItem.status === "watch") return gateItem.automationBlocking ? 11 : 7;
  if (gateItem.status === "planned") return gateItem.automationBlocking ? 6 : 2;
  return 0;
}

export function buildExportSystemReadiness({
  document,
  exportQa,
  printQa,
  serverPdfQa,
}: {
  document: DailyBriefReportDocument;
  exportQa: ReportsExportFlowQa;
  printQa: DailyBriefPrintLayoutQa;
  serverPdfQa: DailyBriefServerPdfReliabilityQa | null;
}): ExportSystemReadiness {
  const htmlChannel = channelById(exportQa, "html");
  const jsonChannel = channelById(exportQa, "json");
  const pdfChannel = channelById(exportQa, "pdf");
  const pdfPrepChannel = channelById(exportQa, "pdf_prep");
  const quickCopyChannel = channelById(exportQa, "quick_copy");

  const hasStableDocument =
    document.schemaVersion === "daily-brief-export-v1" &&
    document.documentType === "daily_intelligence_brief";
  const hasReportContent =
    document.integrity.sectionCount > 0 && document.integrity.blockCount > 0;
  const hasTrendReferences = document.integrity.trendReferenceCount > 0;
  const hasValidationWarnings =
    document.integrity.validationWarnings.length > 0;
  const htmlLive = htmlChannel?.status === "live";
  const jsonLive = jsonChannel?.status === "live";
  const pdfLive = pdfChannel?.status === "live";
  const pdfPrepReady = pdfPrepChannel?.status === "ready";
  const quickCopyReady = quickCopyChannel?.status === "ready";
  const printReady = printQa.status === "ready";
  const printAcceptable = printQa.status !== "caution";
  const pdfHealthLoaded = Boolean(serverPdfQa);
  const pdfHealthy = serverPdfQa?.status === "healthy";
  const pdfAcceptable = Boolean(
    serverPdfQa && serverPdfQa.status !== "caution",
  );

  const gates: ExportSystemReadinessGate[] = [
    gate({
      id: "stable-report-document",
      label: "Stable report document",
      category: "data_model",
      status: passOrFail(hasStableDocument),
      severity: severityForPassFail(hasStableDocument),
      automationBlocking: true,
      detail:
        "All export channels must be based on the daily-brief-export-v1 reportDocument model, not scraped UI state.",
      recommendedAction: hasStableDocument
        ? "Keep reportDocument as the single source for exports."
        : "Fix the reportDocument schema before adding any automation layer.",
    }),
    gate({
      id: "report-content",
      label: "Report sections and blocks",
      category: "data_model",
      status: passOrFail(hasReportContent),
      severity: severityForPassFail(hasReportContent),
      automationBlocking: true,
      detail: `${document.integrity.sectionCount} section(s) and ${document.integrity.blockCount} block(s) are available for export rendering.`,
      recommendedAction: hasReportContent
        ? "Keep section/block counts visible in QA after future report changes."
        : "Generate a populated Daily Brief before testing automation readiness.",
    }),
    gate({
      id: "trend-references",
      label: "Trend references",
      category: "data_model",
      status: hasTrendReferences ? "pass" : "watch",
      severity: hasTrendReferences ? "success" : "warning",
      automationBlocking: false,
      detail: `${document.integrity.trendReferenceCount} trend reference(s) are available for traceability back to intelligence context.`,
      recommendedAction: hasTrendReferences
        ? "Keep trend references in exported reports for auditability."
        : "Add at least one traceable trend reference before automated distribution.",
    }),
    gate({
      id: "validation-warnings",
      label: "Report validation warnings",
      category: "data_model",
      status: hasValidationWarnings ? "watch" : "pass",
      severity: hasValidationWarnings ? "warning" : "success",
      automationBlocking: hasValidationWarnings,
      detail: `${document.integrity.validationWarnings.length} reportDocument validation warning(s) detected.`,
      recommendedAction: hasValidationWarnings
        ? "Resolve validation warnings before any scheduled sending."
        : "No reportDocument validation warning is currently blocking automation design.",
    }),
    gate({
      id: "html-export",
      label: "HTML preview/download",
      category: "manual_export",
      status: passOrFail(htmlLive),
      severity: severityForPassFail(htmlLive),
      automationBlocking: true,
      detail:
        "HTML export is the human-review baseline and should remain the first visual check before PDF/email.",
      recommendedAction: htmlLive
        ? "Use HTML preview as the default pre-send review path."
        : "Restore the HTML export endpoint before moving forward.",
    }),
    gate({
      id: "json-export",
      label: "JSON report model export",
      category: "manual_export",
      status: passOrFail(jsonLive),
      severity: severityForPassFail(jsonLive),
      automationBlocking: true,
      detail:
        "JSON export exposes the stable report model for diagnostics and future automation integrations.",
      recommendedAction: jsonLive
        ? "Use JSON as the automation input contract."
        : "Restore JSON export before adding scheduled or email delivery.",
    }),
    gate({
      id: "quick-copy",
      label: "Quick-copy manual fallback",
      category: "manual_export",
      status: quickCopyReady ? "pass" : "watch",
      severity: quickCopyReady ? "success" : "warning",
      automationBlocking: false,
      detail:
        "Quick-copy keeps a manual fallback available if file export or sharing flow needs human handling.",
      recommendedAction: quickCopyReady
        ? "Keep quick-copy as a fallback even after automation exists."
        : "Restore headline, summary and markdown quick-copy payloads.",
    }),
    gate({
      id: "pdf-prep",
      label: "PDF prep layout",
      category: "pdf_reliability",
      status: printReady ? "pass" : printAcceptable ? "watch" : "fail",
      severity: printReady ? "success" : printAcceptable ? "warning" : "danger",
      automationBlocking: !printAcceptable,
      detail: `Print layout QA is ${printQa.statusLabel} with score ${printQa.score}/100 and an estimate of ${printQa.metrics.estimatedPages} A4 page(s).`,
      recommendedAction: printReady
        ? "Keep PDF prep as the visual QA fallback."
        : printAcceptable
          ? "Review PDF prep before treating PDF as default."
          : "Fix print layout cautions before adding automated PDF delivery.",
    }),
    gate({
      id: "server-pdf",
      label: "Server PDF binary",
      category: "pdf_reliability",
      status:
        pdfLive && pdfHealthy
          ? "pass"
          : pdfLive && pdfAcceptable
            ? "watch"
            : "fail",
      severity:
        pdfLive && pdfHealthy
          ? "success"
          : pdfLive && pdfAcceptable
            ? "warning"
            : "danger",
      automationBlocking: !(pdfLive && pdfAcceptable),
      detail: serverPdfQa
        ? `Server PDF QA is ${serverPdfQa.statusLabel} with score ${serverPdfQa.score}/100, ${serverPdfQa.metrics.pageCount} page(s), and ${serverPdfQa.metrics.kilobytes} KB.`
        : "Server PDF health has not been loaded yet.",
      recommendedAction: serverPdfQa
        ? serverPdfQa.status === "healthy"
          ? "Server PDF can be used as the binary export path after visual preview."
          : serverPdfQa.status === "review"
            ? "Compare PDF with HTML before sharing; keep PDF prep available."
            : "Do not automate PDF delivery until server PDF health improves."
        : "Load the PDF health endpoint before deciding automation readiness.",
    }),
    gate({
      id: "pdf-health",
      label: "PDF health endpoint",
      category: "pdf_reliability",
      status: pdfHealthLoaded ? "pass" : "fail",
      severity: pdfHealthLoaded ? "success" : "danger",
      automationBlocking: true,
      detail:
        "PDF health must be queryable because automation needs a machine-readable reliability check, not vibes.",
      recommendedAction: pdfHealthLoaded
        ? "Keep health JSON linked from Reports before automated PDF send."
        : "Fix or load the PDF health endpoint before the next step.",
    }),
    gate({
      id: "email-cron-boundary",
      label: "Email and cron boundary",
      category: "automation_boundary",
      status: "planned",
      severity: "info",
      automationBlocking: false,
      detail:
        "Email sending, scheduled delivery and cron-generated reports are intentionally not implemented in this manual export phase.",
      recommendedAction:
        "Next automation step should start with a dry-run manifest, not real sending.",
    }),
    gate({
      id: "report-persistence-boundary",
      label: "Report persistence boundary",
      category: "automation_boundary",
      status: "planned",
      severity: "info",
      automationBlocking: false,
      detail:
        "There is no report history table yet. Exports are generated live from current Daily Brief data.",
      recommendedAction:
        "Add persistence only when you need historical report archives or scheduled delivery audit logs.",
    }),
  ];

  const criticalBlockers = gates.filter(
    (item) => item.status === "fail" && item.automationBlocking,
  ).length;
  const warnings = gates.filter((item) => item.status === "watch").length;
  const plannedBoundaries = gates.filter(
    (item) => item.status === "planned",
  ).length;

  const baseScore = Math.round(
    (exportQa.score * 0.34 +
      printQa.score * 0.22 +
      (serverPdfQa?.score ?? 0) * 0.28 +
      (hasStableDocument && hasReportContent ? 100 : 45) * 0.16) /
      1,
  );
  const score = clampScore(
    baseScore - gates.reduce((sum, item) => sum + gatePenalty(item), 0),
  );

  const manualExportScore = clampScore(
    (exportQa.score * 0.38 +
      printQa.score * 0.24 +
      (serverPdfQa?.score ?? 0) * 0.38) /
      1,
  );
  const automationReadinessScore = clampScore(
    score -
      criticalBlockers * 18 -
      warnings * 4 -
      (hasValidationWarnings ? 10 : 0),
  );

  const status: ExportSystemReadinessStatus =
    criticalBlockers > 0 || score < 68
      ? "blocked"
      : warnings > 0 || score < 88 || exportQa.status !== "healthy"
        ? "review"
        : "ready";

  const automationStatus: ExportSystemAutomationStatus =
    status === "ready" && automationReadinessScore >= 86
      ? "ready_for_dry_run"
      : status === "blocked"
        ? "not_ready"
        : "manual_ready_only";

  const recommendations: ExportSystemReadinessRecommendation[] = [
    {
      id: "manual-review-first",
      label: "Keep manual review first",
      detail:
        "Use Daily Brief UI and HTML preview as the human approval path before trusting any binary or automated output.",
      priority: "now",
    },
    {
      id: "automation-dry-run",
      label: "Add automation dry-run before sending",
      detail:
        "The next automation step should generate a manifest/checklist only. No email delivery, no cron send, no silent background reports yet.",
      priority: "next",
    },
    {
      id: "persistence-before-schedule",
      label: "Add persistence before schedules",
      detail:
        "If daily scheduled reports are introduced, create a report_runs/report_exports history layer before real recurring delivery.",
      priority: "later",
    },
  ];

  if (criticalBlockers > 0) {
    recommendations.unshift({
      id: "fix-blockers",
      label: "Fix blocking gates first",
      detail:
        "At least one export gate is blocking automation readiness. Fix those before building any dry-run manifest.",
      priority: "now",
    });
  }

  return {
    schemaVersion: "export-system-readiness-v1",
    generatedAt: new Date().toISOString(),
    status,
    statusLabel: statusLabel(status),
    automationStatus,
    automationStatusLabel: automationLabel(automationStatus),
    tone: toneForStatus(status),
    score,
    manualExportScore,
    automationReadinessScore,
    summary:
      status === "ready"
        ? "HTML, JSON, PDF prep, server PDF and health checks are aligned enough to start a dry-run automation design. Real email/cron delivery should still wait for a manifest step."
        : status === "review"
          ? "Manual exports are usable, but at least one QA signal should be reviewed before this becomes an automated report pipeline."
          : "The export system has at least one blocking gate. Keep the flow manual until the failing checks are fixed.",
    recommendedNextStep:
      automationStatus === "ready_for_dry_run"
        ? "Build an Automation Dry-Run Manifest v1 that simulates what would be sent, when, through which channel, and why — without sending anything."
        : automationStatus === "manual_ready_only"
          ? "Keep exports manual, review the watch gates, then add a dry-run manifest only after QA stays stable across 24h, 7d and 30d windows."
          : "Do not add automation yet. Fix blocking export readiness gates first.",
    metrics: {
      liveExportChannels: exportQa.metrics.liveChannels,
      readySupportChannels: exportQa.metrics.readyChannels,
      plannedChannels: exportQa.metrics.plannedChannels,
      validationWarnings: document.integrity.validationWarnings.length,
      reportSections: document.integrity.sectionCount,
      reportBlocks: document.integrity.blockCount,
      trendReferences: document.integrity.trendReferenceCount,
      exportFlowScore: exportQa.score,
      printLayoutScore: printQa.score,
      serverPdfScore: serverPdfQa?.score ?? 0,
      criticalBlockers,
      warnings,
      plannedBoundaries,
    },
    gates,
    recommendations,
  };
}
