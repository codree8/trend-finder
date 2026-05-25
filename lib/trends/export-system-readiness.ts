import type { ResearchMemoExportQa } from "@/lib/reports/research-memo-qa";
import type { DailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import type { DailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import type { ReportsExportChannel, ReportsExportFlowQa } from "@/lib/trends/reports-export-flow-qa";
import type { DailyBriefReportDocument, DailyBriefReportTone } from "@/lib/trends/types";

export type ExportSystemReadinessStatus = "ready" | "review" | "blocked";
export type ExportSystemReadinessSeverity = "success" | "info" | "warning" | "danger";
export type ExportSystemReadinessGateStatus = "pass" | "watch" | "fail";
export type ExportSystemReadinessGateCategory =
  | "data_model"
  | "manual_export"
  | "pdf_reliability"
  | "research_memo"
  | "local_boundary";

export type ExportSystemReadinessGate = {
  id: string;
  label: string;
  category: ExportSystemReadinessGateCategory;
  status: ExportSystemReadinessGateStatus;
  severity: ExportSystemReadinessSeverity;
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
  schemaVersion: "export-system-readiness-v2";
  generatedAt: string;
  status: ExportSystemReadinessStatus;
  statusLabel: string;
  tone: DailyBriefReportTone;
  score: number;
  manualExportScore: number;
  localBoundaryScore: number;
  summary: string;
  recommendedNextStep: string;
  metrics: {
    liveExportChannels: number;
    readySupportChannels: number;
    validationWarnings: number;
    reportSections: number;
    reportBlocks: number;
    trendReferences: number;
    exportFlowScore: number;
    printLayoutScore: number;
    serverPdfScore: number;
    researchMemoQaScore: number;
    researchMemoWarnings: number;
    criticalBlockers: number;
    warnings: number;
    localBoundaries: number;
  };
  gates: ExportSystemReadinessGate[];
  recommendations: ExportSystemReadinessRecommendation[];
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function channelById(exportQa: ReportsExportFlowQa, id: ReportsExportChannel["id"]) {
  return exportQa.channels.find((channel) => channel.id === id);
}

function gate(args: ExportSystemReadinessGate): ExportSystemReadinessGate {
  return args;
}

function passOrFail(condition: boolean): ExportSystemReadinessGateStatus {
  return condition ? "pass" : "fail";
}

function severity(condition: boolean, fail: ExportSystemReadinessSeverity = "danger") {
  return condition ? "success" : fail;
}

function statusLabel(status: ExportSystemReadinessStatus) {
  const labels: Record<ExportSystemReadinessStatus, string> = {
    ready: "Local export system ready",
    review: "Local export system needs review",
    blocked: "Local export system blocked",
  };

  return labels[status];
}

function toneForStatus(status: ExportSystemReadinessStatus): DailyBriefReportTone {
  if (status === "ready") return "positive";
  if (status === "review") return "warning";
  return "danger";
}

function gatePenalty(item: ExportSystemReadinessGate) {
  if (item.status === "fail") return 16;
  if (item.status === "watch") return 7;
  return 0;
}

export function buildExportSystemReadiness({
  document,
  exportQa,
  printQa,
  serverPdfQa,
  researchMemoQa,
}: {
  document: DailyBriefReportDocument;
  exportQa: ReportsExportFlowQa;
  printQa: DailyBriefPrintLayoutQa;
  serverPdfQa: DailyBriefServerPdfReliabilityQa | null;
  researchMemoQa?: ResearchMemoExportQa | null;
}): ExportSystemReadiness {
  const htmlChannel = channelById(exportQa, "html");
  const jsonChannel = channelById(exportQa, "json");
  const pdfChannel = channelById(exportQa, "pdf");
  const htmlLive = htmlChannel?.status === "live";
  const jsonLive = jsonChannel?.status === "live";
  const pdfLive = pdfChannel?.status === "live";
  const printReady = printQa.status !== "caution";
  const pdfReady = Boolean(serverPdfQa && serverPdfQa.status !== "caution");
  const hasValidationWarnings = document.integrity.validationWarnings.length > 0;

  const gates: ExportSystemReadinessGate[] = [
    gate({
      id: "report-document",
      label: "Stable report document",
      category: "data_model",
      status: passOrFail(document.schemaVersion === "daily-brief-export-v1"),
      severity: severity(document.schemaVersion === "daily-brief-export-v1"),
      detail: "Daily Brief exports are generated from the shared reportDocument model.",
      recommendedAction: "Keep all report surfaces backed by the same document model.",
    }),
    gate({
      id: "sections-and-blocks",
      label: "Sections and blocks exist",
      category: "data_model",
      status: passOrFail(document.integrity.sectionCount > 0 && document.integrity.blockCount > 0),
      severity: severity(document.integrity.sectionCount > 0 && document.integrity.blockCount > 0),
      detail: `${document.integrity.sectionCount} section(s), ${document.integrity.blockCount} block(s), ${document.integrity.trendReferenceCount} trend reference(s).`,
      recommendedAction: "Run a scan and rebuild the Daily Brief if this is empty.",
    }),
    gate({
      id: "document-warnings",
      label: "Validation warnings",
      category: "data_model",
      status: hasValidationWarnings ? "watch" : "pass",
      severity: hasValidationWarnings ? "warning" : "success",
      detail: hasValidationWarnings
        ? document.integrity.validationWarnings.join(" ")
        : "No report document validation warnings detected.",
      recommendedAction: hasValidationWarnings
        ? "Review warnings before exporting or presenting this brief."
        : "Keep validation warnings visible in Admin readiness only.",
    }),
    gate({
      id: "html-export",
      label: "HTML preview",
      category: "manual_export",
      status: passOrFail(htmlLive),
      severity: severity(htmlLive),
      detail: htmlLive ? "HTML export is reachable for manual preview." : "HTML export is missing from export targets.",
      recommendedAction: "Use HTML as the first visual check before PDF.",
    }),
    gate({
      id: "json-export",
      label: "JSON export",
      category: "manual_export",
      status: passOrFail(jsonLive),
      severity: severity(jsonLive),
      detail: jsonLive ? "JSON export is reachable for structured review." : "JSON export is missing from export targets.",
      recommendedAction: "Keep JSON available as the stable inspection format.",
    }),
    gate({
      id: "print-layout",
      label: "Print-ready layout",
      category: "manual_export",
      status: printReady ? "pass" : "watch",
      severity: printReady ? "success" : "warning",
      detail: printQa.summary,
      recommendedAction: printQa.recommendedPrintMode,
    }),
    gate({
      id: "server-pdf",
      label: "Server PDF export",
      category: "pdf_reliability",
      status: passOrFail(pdfLive && pdfReady),
      severity: severity(pdfLive && pdfReady, "warning"),
      detail: serverPdfQa?.summary ?? "Server PDF health was not available.",
      recommendedAction: serverPdfQa?.recommendedAction ?? "Use print-ready HTML until PDF health is available.",
    }),
    gate({
      id: "research-memo-qa",
      label: "Research Memo export QA",
      category: "research_memo",
      status: !researchMemoQa
        ? "watch"
        : researchMemoQa.status === "ready"
          ? "pass"
          : researchMemoQa.status === "blocked"
            ? "fail"
            : "watch",
      severity: !researchMemoQa
        ? "warning"
        : researchMemoQa.status === "ready"
          ? "success"
          : researchMemoQa.status === "blocked"
            ? "danger"
            : "warning",
      detail: researchMemoQa?.summary ?? "Research Memo QA was not available for this readiness check.",
      recommendedAction: researchMemoQa?.recommendedAction ?? "Run export readiness with the selected report template.",
    }),
    gate({
      id: "controlled-scheduler-boundary",
      label: "Controlled scheduler boundary",
      category: "local_boundary",
      status: "pass",
      severity: "success",
      detail: "Scheduled scan and cleanup may run through protected cron endpoints, while exports remain manually opened by the user.",
      recommendedAction: "Keep CRON_SECRET guarded and do not add report delivery until auth, ownership and responsibility are intentionally designed.",
    }),
    gate({
      id: "no-background-delivery",
      label: "No background delivery controls",
      category: "local_boundary",
      status: "pass",
      severity: "success",
      detail: "No live delivery controls or outbound target configuration are required for controlled production mode.",
      recommendedAction: "Do not add delivery UI to product pages.",
    }),
  ];

  const criticalBlockers = gates.filter((item) => item.status === "fail").length;
  const warnings = gates.filter((item) => item.status === "watch").length;
  const manualExportScore = clampScore(
    (exportQa.score + printQa.score + (serverPdfQa?.score ?? 55)) / 3,
  );
  const localBoundaryScore = 100;
  const score = clampScore(
    100 - gates.reduce((sum, item) => sum + gatePenalty(item), 0),
  );
  const status: ExportSystemReadinessStatus =
    criticalBlockers > 0 ? "blocked" : score >= 82 && warnings <= 2 ? "ready" : "review";

  const recommendations: ExportSystemReadinessRecommendation[] = [
    ...(criticalBlockers > 0
      ? [
          {
            id: "fix-blockers",
            label: "Fix blocked export gates",
            detail: "Resolve failing data model or export endpoints before presenting the project.",
            priority: "now" as const,
          },
        ]
      : []),
    ...(warnings > 0
      ? [
          {
            id: "review-warnings",
            label: "Review warning gates",
            detail: "Warnings do not stop local use, but they should be understood before a demo.",
            priority: "next" as const,
          },
        ]
      : []),
    {
      id: "keep-local-boundary",
      label: "Keep local/manual boundary",
      detail: "Do not introduce delivery features until the product has users, auth and explicit ownership rules.",
      priority: "later",
    },
  ];

  return {
    schemaVersion: "export-system-readiness-v2",
    generatedAt: new Date().toISOString(),
    status,
    statusLabel: statusLabel(status),
    tone: toneForStatus(status),
    score,
    manualExportScore,
    localBoundaryScore,
    summary:
      status === "ready"
        ? "Manual exports and local production boundaries are clean enough for a real demo."
        : status === "review"
          ? "The local export system is usable, but a few warnings should be reviewed before demo or deployment."
          : "One or more export gates are blocked. Fix those before presenting this build.",
    recommendedNextStep:
      status === "blocked"
        ? "Fix failing export/data gates, then rerun readiness."
        : warnings > 0
          ? "Review warning gates, then open Reports and export the active template manually."
          : "Run lint, TypeScript and build; then use the demo route for the 60-second walkthrough.",
    metrics: {
      liveExportChannels: exportQa.metrics.liveChannels,
      readySupportChannels: exportQa.metrics.readyChannels,
      validationWarnings: document.integrity.validationWarnings.length,
      reportSections: document.integrity.sectionCount,
      reportBlocks: document.integrity.blockCount,
      trendReferences: document.integrity.trendReferenceCount,
      exportFlowScore: exportQa.score,
      printLayoutScore: printQa.score,
      serverPdfScore: serverPdfQa?.score ?? 0,
      researchMemoQaScore: researchMemoQa?.score ?? 0,
      researchMemoWarnings: researchMemoQa?.warnings.length ?? 0,
      criticalBlockers,
      warnings,
      localBoundaries: gates.filter((item) => item.category === "local_boundary").length,
    },
    gates,
    recommendations,
  };
}
