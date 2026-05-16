import {
  buildDailyBriefApiUrl,
  buildDailyBriefExportReadinessUrl,
  buildDailyBriefFullJsonExportUrl,
  buildDailyBriefHtmlExportUrl,
  buildDailyBriefJsonExportUrl,
  buildDailyBriefPageUrl,
  buildDailyBriefPdfExportUrl,
  buildDailyBriefPdfHealthUrl,
  buildDailyBriefPdfPrepUrl,
} from "@/lib/trends/daily-brief-export-links";
import type { DailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import type { DailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import type { ExportSystemReadiness } from "@/lib/trends/export-system-readiness";
import type { ReportsExportFlowQa } from "@/lib/trends/reports-export-flow-qa";
import type {
  DailyBriefReportDocument,
  DailyBriefReportTone,
  DailyBriefResponse,
  DashboardWindow,
} from "@/lib/trends/types";

export type AutomationDryRunManifestStatus = "ready" | "review" | "blocked";

export type AutomationDryRunGateStatus =
  | "pass"
  | "watch"
  | "fail"
  | "protected"
  | "planned";

export type AutomationDryRunSeverity =
  | "success"
  | "info"
  | "warning"
  | "danger";

export type AutomationDryRunChannelStatus =
  | "ready"
  | "review"
  | "blocked"
  | "planned";

export type AutomationDryRunArtifactStatus = "ready" | "review" | "blocked";

export type AutomationDryRunDeliveryChannel = {
  id:
    | "manual_review"
    | "email_summary"
    | "html_report"
    | "pdf_report"
    | "json_model"
    | "health_checks";
  label: string;
  role: "approval" | "delivery" | "attachment" | "diagnostic";
  status: AutomationDryRunChannelStatus;
  tone: DailyBriefReportTone;
  liveDeliveryEnabled: false;
  wouldIncludeInLiveRun: boolean;
  detail: string;
  dependency: string;
  href: string | null;
  qaNotes: string[];
};

export type AutomationDryRunArtifact = {
  id:
    | "daily_brief_ui"
    | "html_preview"
    | "html_download"
    | "pdf_download"
    | "pdf_preview"
    | "pdf_prep"
    | "json_model"
    | "json_full"
    | "readiness_json"
    | "pdf_health_json";
  label: string;
  format: "ui" | "html" | "pdf" | "json";
  status: AutomationDryRunArtifactStatus;
  requiredForLiveRun: boolean;
  href: string;
  detail: string;
};

export type AutomationDryRunGate = {
  id: string;
  label: string;
  status: AutomationDryRunGateStatus;
  severity: AutomationDryRunSeverity;
  automationBlocking: boolean;
  detail: string;
  recommendedAction: string;
};

export type AutomationDryRunPayloadPreview = {
  subject: string;
  preheader: string;
  headline: string;
  bodyPreview: string;
  markdownCharacters: number;
  quickCopyBullets: string[];
  attachmentSummary: string[];
};

export type AutomationDryRunManifest = {
  schemaVersion: "automation-dry-run-manifest-v1";
  manifestId: string;
  generatedAt: string;
  window: DashboardWindow;
  dryRun: true;
  status: AutomationDryRunManifestStatus;
  statusLabel: string;
  simulatedOutcome:
    | "ready_for_human_approval"
    | "review_before_live_design"
    | "blocked_before_approval";
  simulatedOutcomeLabel: string;
  wouldSendIfLive: boolean;
  summary: string;
  recommendedNextStep: string;
  triggerPlan: {
    mode: "manual_dry_run";
    proposedLiveCadence: "daily_after_successful_scan";
    proposedLiveWindow: DashboardWindow;
    scheduledJobCreated: false;
    cronEnabled: false;
    detail: string;
  };
  recipientPlan: {
    status: "not_configured_by_design";
    recipients: [];
    liveEmailEnabled: false;
    detail: string;
  };
  readinessSnapshot: {
    exportReadinessStatus: ExportSystemReadiness["status"];
    automationStatus: ExportSystemReadiness["automationStatus"];
    exportReadinessScore: number;
    automationReadinessScore: number;
    exportFlowScore: number;
    printLayoutScore: number;
    serverPdfScore: number;
    criticalBlockers: number;
    readinessWarnings: number;
  };
  deliveryChannels: AutomationDryRunDeliveryChannel[];
  artifacts: AutomationDryRunArtifact[];
  gates: AutomationDryRunGate[];
  blockers: string[];
  warnings: string[];
  safeguards: string[];
  executionChecklist: string[];
  payloadPreview: AutomationDryRunPayloadPreview;
  metrics: {
    channelsReady: number;
    artifactsReady: number;
    gatesPassing: number;
    gatesWatching: number;
    gatesFailing: number;
    safeguards: number;
    blockers: number;
    warnings: number;
    reportSections: number;
    reportBlocks: number;
    trendReferences: number;
    attachmentCount: number;
  };
  integrity: {
    manifestHash: string;
    reportDocumentSchema: DailyBriefReportDocument["schemaVersion"];
    generatedFromReportDocument: true;
    noEmailSent: true;
    noCronCreated: true;
    noDatabaseWrite: true;
  };
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function simpleHash(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return `dryrun_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function statusLabel(status: AutomationDryRunManifestStatus) {
  const labels: Record<AutomationDryRunManifestStatus, string> = {
    ready: "Dry-run manifest ready",
    review: "Dry-run manifest needs review",
    blocked: "Dry-run manifest blocked",
  };

  return labels[status];
}

function outcomeLabel(outcome: AutomationDryRunManifest["simulatedOutcome"]) {
  const labels: Record<AutomationDryRunManifest["simulatedOutcome"], string> = {
    ready_for_human_approval: "Would prepare package for human approval",
    review_before_live_design:
      "Would require review before live automation design",
    blocked_before_approval: "Would stop before approval",
  };

  return labels[outcome];
}

function gate({
  id,
  label,
  status,
  severity,
  automationBlocking,
  detail,
  recommendedAction,
}: AutomationDryRunGate): AutomationDryRunGate {
  return {
    id,
    label,
    status,
    severity,
    automationBlocking,
    detail,
    recommendedAction,
  };
}

function artifact(item: AutomationDryRunArtifact): AutomationDryRunArtifact {
  return item;
}

function channel(
  item: AutomationDryRunDeliveryChannel,
): AutomationDryRunDeliveryChannel {
  return item;
}

function artifactStatusFromCondition(
  condition: boolean,
): AutomationDryRunArtifactStatus {
  return condition ? "ready" : "blocked";
}

function channelTone(
  status: AutomationDryRunChannelStatus,
): DailyBriefReportTone {
  if (status === "ready") return "positive";
  if (status === "review") return "warning";
  if (status === "blocked") return "danger";
  return "neutral";
}

function gateSeverity(
  status: AutomationDryRunGateStatus,
): AutomationDryRunSeverity {
  if (status === "pass" || status === "protected") return "success";
  if (status === "fail") return "danger";
  if (status === "watch") return "warning";
  return "info";
}

function firstNonEmpty(
  values: Array<string | null | undefined>,
  fallback: string,
) {
  return (
    values.find((value) => value && value.trim().length > 0)?.trim() ?? fallback
  );
}

function buildSubject(document: DailyBriefReportDocument) {
  return `Daily AI Trend Brief · ${document.window} · ${new Date(
    document.generatedAt,
  ).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function buildBodyPreview(
  brief: DailyBriefResponse,
  document: DailyBriefReportDocument,
) {
  const focus =
    document.quickCopy.focusToday || brief.recommendedFocus.focusToday;
  const monitor = document.quickCopy.monitor || brief.recommendedFocus.monitor;
  const avoid = document.quickCopy.avoid || brief.recommendedFocus.avoid;

  return [
    document.quickCopy.summary,
    `Focus today: ${focus}`,
    `Monitor: ${monitor}`,
    `Avoid: ${avoid}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function dryRunStatusTone(
  status: AutomationDryRunManifestStatus,
): DailyBriefReportTone {
  if (status === "ready") return "positive";
  if (status === "review") return "warning";
  return "danger";
}

export function dryRunGateTone(
  status: AutomationDryRunGateStatus,
): DailyBriefReportTone {
  if (status === "pass" || status === "protected") return "positive";
  if (status === "watch") return "warning";
  if (status === "fail") return "danger";
  return "neutral";
}

export function buildAutomationDryRunManifest({
  brief,
  document,
  exportQa,
  printQa,
  serverPdfQa,
  readiness,
}: {
  brief: DailyBriefResponse;
  document: DailyBriefReportDocument;
  exportQa: ReportsExportFlowQa;
  printQa: DailyBriefPrintLayoutQa;
  serverPdfQa: DailyBriefServerPdfReliabilityQa | null;
  readiness: ExportSystemReadiness;
}): AutomationDryRunManifest {
  const htmlLive = exportQa.channels.some(
    (item) => item.id === "html" && item.status === "live",
  );
  const jsonLive = exportQa.channels.some(
    (item) => item.id === "json" && item.status === "live",
  );
  const pdfLive = exportQa.channels.some(
    (item) => item.id === "pdf" && item.status === "live",
  );
  const pdfAcceptable = Boolean(
    serverPdfQa && serverPdfQa.status !== "caution",
  );
  const pdfHealthy = serverPdfQa?.status === "healthy";
  const printAcceptable = printQa.status !== "caution";
  const hasBlockingReadinessGate = readiness.metrics.criticalBlockers > 0;
  const hasValidationWarnings =
    document.integrity.validationWarnings.length > 0;
  const canPrepareManualPackage =
    document.integrity.sectionCount > 0 &&
    document.integrity.blockCount > 0 &&
    htmlLive &&
    jsonLive;

  const artifacts: AutomationDryRunArtifact[] = [
    artifact({
      id: "daily_brief_ui",
      label: "Daily Brief UI review",
      format: "ui",
      status: artifactStatusFromCondition(
        document.exportTargets.includes("ui"),
      ),
      requiredForLiveRun: true,
      href: buildDailyBriefPageUrl(document.window),
      detail:
        "Interactive human review path with drawer intelligence and watchlist context.",
    }),
    artifact({
      id: "html_preview",
      label: "HTML preview",
      format: "html",
      status: artifactStatusFromCondition(htmlLive),
      requiredForLiveRun: true,
      href: buildDailyBriefHtmlExportUrl(document.window),
      detail: "Primary visual review output before any automated distribution.",
    }),
    artifact({
      id: "html_download",
      label: "HTML download",
      format: "html",
      status: artifactStatusFromCondition(htmlLive),
      requiredForLiveRun: false,
      href: buildDailyBriefHtmlExportUrl(document.window, { download: true }),
      detail: "Standalone manual HTML file export.",
    }),
    artifact({
      id: "pdf_download",
      label: "Server PDF download",
      format: "pdf",
      status:
        pdfLive && pdfAcceptable ? "ready" : pdfLive ? "review" : "blocked",
      requiredForLiveRun: true,
      href: buildDailyBriefPdfExportUrl(document.window),
      detail: "Binary PDF candidate for future automated attachment.",
    }),
    artifact({
      id: "pdf_preview",
      label: "Server PDF preview",
      format: "pdf",
      status:
        pdfLive && pdfAcceptable ? "ready" : pdfLive ? "review" : "blocked",
      requiredForLiveRun: false,
      href: buildDailyBriefPdfExportUrl(document.window, { inline: true }),
      detail: "Browser preview of the server-generated PDF.",
    }),
    artifact({
      id: "pdf_prep",
      label: "PDF prep layout",
      format: "html",
      status: printAcceptable ? "ready" : "review",
      requiredForLiveRun: false,
      href: buildDailyBriefPdfPrepUrl(document.window),
      detail:
        "Print-safe HTML fallback used to inspect layout before trusting PDF.",
    }),
    artifact({
      id: "json_model",
      label: "JSON reportDocument",
      format: "json",
      status: artifactStatusFromCondition(jsonLive),
      requiredForLiveRun: true,
      href: buildDailyBriefJsonExportUrl(document.window),
      detail: "Stable machine-readable report model for future automation.",
    }),
    artifact({
      id: "json_full",
      label: "Full Daily Brief API payload",
      format: "json",
      status: artifactStatusFromCondition(Boolean(brief.ok)),
      requiredForLiveRun: false,
      href: buildDailyBriefFullJsonExportUrl(document.window),
      detail: "Full diagnostic export for debugging the automation input.",
    }),
    artifact({
      id: "readiness_json",
      label: "Readiness JSON",
      format: "json",
      status: "ready",
      requiredForLiveRun: true,
      href: buildDailyBriefExportReadinessUrl(document.window),
      detail: "Machine-readable final export readiness check.",
    }),
    artifact({
      id: "pdf_health_json",
      label: "PDF health JSON",
      format: "json",
      status: serverPdfQa ? "ready" : "blocked",
      requiredForLiveRun: true,
      href: buildDailyBriefPdfHealthUrl(document.window),
      detail: "Machine-readable PDF reliability check.",
    }),
  ];

  const gates: AutomationDryRunGate[] = [
    gate({
      id: "report-document-contract",
      label: "Report document contract",
      status:
        document.schemaVersion === "daily-brief-export-v1" &&
        document.documentType === "daily_intelligence_brief"
          ? "pass"
          : "fail",
      severity: gateSeverity(
        document.schemaVersion === "daily-brief-export-v1" &&
          document.documentType === "daily_intelligence_brief"
          ? "pass"
          : "fail",
      ),
      automationBlocking: true,
      detail:
        "Dry-run automation must be generated from the stable reportDocument contract, not from UI scraping.",
      recommendedAction:
        "Keep reportDocument as the single input for HTML, JSON, PDF and future email payloads.",
    }),
    gate({
      id: "manual-review-first",
      label: "Manual review first",
      status: document.exportTargets.includes("ui") ? "pass" : "watch",
      severity: document.exportTargets.includes("ui") ? "success" : "warning",
      automationBlocking: false,
      detail:
        "A future live automation should still keep Daily Brief UI or HTML preview as the approval baseline.",
      recommendedAction:
        "Review Daily Brief UI and HTML before trusting the simulated send package.",
    }),
    gate({
      id: "html-ready",
      label: "HTML report ready",
      status: htmlLive ? "pass" : "fail",
      severity: htmlLive ? "success" : "danger",
      automationBlocking: true,
      detail:
        "HTML remains the human-readable baseline for future automated delivery.",
      recommendedAction: htmlLive
        ? "Use HTML preview for human sign-off."
        : "Restore HTML export before continuing automation design.",
    }),
    gate({
      id: "json-ready",
      label: "JSON model ready",
      status: jsonLive ? "pass" : "fail",
      severity: jsonLive ? "success" : "danger",
      automationBlocking: true,
      detail:
        "Future automation needs structured JSON to avoid guessing from rendered UI.",
      recommendedAction: jsonLive
        ? "Keep JSON export as the automation contract."
        : "Restore JSON export before continuing automation design.",
    }),
    gate({
      id: "pdf-ready",
      label: "PDF attachment candidate",
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
        ? `Server PDF QA is ${serverPdfQa.statusLabel} with score ${serverPdfQa.score}/100.`
        : "Server PDF health has not been loaded.",
      recommendedAction:
        pdfLive && pdfHealthy
          ? "PDF can be part of a future dry-run package after preview."
          : pdfLive && pdfAcceptable
            ? "Keep PDF in dry-run, but require preview before any live send design."
            : "Fix server PDF reliability before treating PDF as an attachment.",
    }),
    gate({
      id: "print-layout-ready",
      label: "PDF prep layout fallback",
      status:
        printQa.status === "ready"
          ? "pass"
          : printAcceptable
            ? "watch"
            : "fail",
      severity:
        printQa.status === "ready"
          ? "success"
          : printAcceptable
            ? "warning"
            : "danger",
      automationBlocking: !printAcceptable,
      detail: `Print layout QA is ${printQa.statusLabel} with score ${printQa.score}/100.`,
      recommendedAction: printAcceptable
        ? "Keep PDF prep available as fallback QA."
        : "Fix print layout before introducing automated PDF delivery.",
    }),
    gate({
      id: "export-readiness",
      label: "Final export readiness",
      status:
        readiness.status === "ready"
          ? "pass"
          : readiness.status === "review"
            ? "watch"
            : "fail",
      severity:
        readiness.status === "ready"
          ? "success"
          : readiness.status === "review"
            ? "warning"
            : "danger",
      automationBlocking: readiness.status === "blocked",
      detail: `${readiness.statusLabel}. ${readiness.summary}`,
      recommendedAction: readiness.recommendedNextStep,
    }),
    gate({
      id: "recipient-list-empty",
      label: "Recipient list intentionally empty",
      status: "protected",
      severity: "success",
      automationBlocking: false,
      detail:
        "No real email recipient is configured in dry-run. That is protection, not a missing feature.",
      recommendedAction:
        "Only add recipients after a separate approval/configuration step.",
    }),
    gate({
      id: "no-email-send",
      label: "Email delivery disabled",
      status: "protected",
      severity: "success",
      automationBlocking: false,
      detail:
        "This manifest simulates a future report package but never sends email.",
      recommendedAction:
        "Keep dry-run and live-send code paths separated when email is introduced.",
    }),
    gate({
      id: "no-cron-job",
      label: "Cron scheduling disabled",
      status: "protected",
      severity: "success",
      automationBlocking: false,
      detail: "No scheduled job or recurring delivery is created by this step.",
      recommendedAction:
        "Add cron only after dry-run manifests are stable across all windows.",
    }),
    gate({
      id: "no-report-persistence",
      label: "Report persistence not implemented",
      status: "planned",
      severity: "info",
      automationBlocking: false,
      detail:
        "Dry-run manifests are generated live and are not stored in a report_runs table.",
      recommendedAction:
        "Add persistence before real scheduled delivery or audit requirements.",
    }),
  ];

  const readinessFailures = readiness.gates
    .filter((item) => item.status === "fail" && item.automationBlocking)
    .map((item) => `${item.label}: ${item.recommendedAction}`);
  const manifestFailures = gates
    .filter((item) => item.status === "fail" && item.automationBlocking)
    .map((item) => `${item.label}: ${item.recommendedAction}`);
  const blockers = Array.from(
    new Set([...readinessFailures, ...manifestFailures]),
  );

  const warnings = [
    ...document.integrity.validationWarnings.map(
      (item) => `Report document warning: ${item}`,
    ),
    ...readiness.gates
      .filter((item) => item.status === "watch")
      .map((item) => `${item.label}: ${item.recommendedAction}`),
    ...gates
      .filter((item) => item.status === "watch")
      .map((item) => `${item.label}: ${item.recommendedAction}`),
  ].filter(Boolean);

  const deliveryChannels: AutomationDryRunDeliveryChannel[] = [
    channel({
      id: "manual_review",
      label: "Manual approval review",
      role: "approval",
      status: canPrepareManualPackage ? "ready" : "blocked",
      tone: canPrepareManualPackage ? "positive" : "danger",
      liveDeliveryEnabled: false,
      wouldIncludeInLiveRun: true,
      detail:
        "Human review remains the first step before any future send attempt.",
      dependency: "Daily Brief UI + HTML preview",
      href: buildDailyBriefPageUrl(document.window),
      qaNotes: [
        readiness.statusLabel,
        `Readiness score ${readiness.score}/100`,
      ],
    }),
    channel({
      id: "email_summary",
      label: "Email summary body",
      role: "delivery",
      status: "planned",
      tone: "neutral",
      liveDeliveryEnabled: false,
      wouldIncludeInLiveRun: true,
      detail:
        "Subject, preheader and body preview are simulated only. No email provider is called.",
      dependency: "Future email sender + approved recipients",
      href: null,
      qaNotes: ["No SMTP/API send", "Recipient list empty by design"],
    }),
    channel({
      id: "html_report",
      label: "HTML report attachment/link",
      role: "attachment",
      status: htmlLive ? "ready" : "blocked",
      tone: channelTone(htmlLive ? "ready" : "blocked"),
      liveDeliveryEnabled: false,
      wouldIncludeInLiveRun: true,
      detail: "Standalone HTML report would be the safest readable output.",
      dependency: "HTML export endpoint",
      href: buildDailyBriefHtmlExportUrl(document.window),
      qaNotes: [`Export QA ${exportQa.score}/100`],
    }),
    channel({
      id: "pdf_report",
      label: "PDF report attachment",
      role: "attachment",
      status:
        pdfLive && pdfHealthy
          ? "ready"
          : pdfLive && pdfAcceptable
            ? "review"
            : "blocked",
      tone: channelTone(
        pdfLive && pdfHealthy
          ? "ready"
          : pdfLive && pdfAcceptable
            ? "review"
            : "blocked",
      ),
      liveDeliveryEnabled: false,
      wouldIncludeInLiveRun: true,
      detail:
        "Server PDF would be attached only after health and preview checks pass.",
      dependency: "Server PDF export + PDF health endpoint",
      href: buildDailyBriefPdfExportUrl(document.window),
      qaNotes: serverPdfQa
        ? [`PDF QA ${serverPdfQa.score}/100`, serverPdfQa.statusLabel]
        : ["PDF QA unavailable"],
    }),
    channel({
      id: "json_model",
      label: "JSON report model",
      role: "diagnostic",
      status: jsonLive ? "ready" : "blocked",
      tone: channelTone(jsonLive ? "ready" : "blocked"),
      liveDeliveryEnabled: false,
      wouldIncludeInLiveRun: false,
      detail:
        "Structured model would be logged or archived later, not sent as the main user-facing report.",
      dependency: "JSON export endpoint",
      href: buildDailyBriefJsonExportUrl(document.window),
      qaNotes: [
        `${document.integrity.sectionCount} sections`,
        `${document.integrity.blockCount} blocks`,
      ],
    }),
    channel({
      id: "health_checks",
      label: "Readiness and PDF health checks",
      role: "diagnostic",
      status:
        serverPdfQa && readiness.status !== "blocked" ? "ready" : "review",
      tone: channelTone(
        serverPdfQa && readiness.status !== "blocked" ? "ready" : "review",
      ),
      liveDeliveryEnabled: false,
      wouldIncludeInLiveRun: false,
      detail:
        "Machine-readable gates would be checked before any future send attempt.",
      dependency: "Readiness endpoint + PDF health endpoint",
      href: buildDailyBriefExportReadinessUrl(document.window),
      qaNotes: [
        `Automation ${readiness.automationStatusLabel}`,
        serverPdfQa ? `PDF ${serverPdfQa.statusLabel}` : "PDF health missing",
      ],
    }),
  ];

  const failingGates = gates.filter((item) => item.status === "fail").length;
  const watchingGates = gates.filter((item) => item.status === "watch").length;
  const passingGates = gates.filter(
    (item) => item.status === "pass" || item.status === "protected",
  ).length;

  const status: AutomationDryRunManifestStatus =
    blockers.length > 0 || !canPrepareManualPackage
      ? "blocked"
      : readiness.automationStatus === "ready_for_dry_run" &&
          watchingGates === 0
        ? "ready"
        : "review";

  const simulatedOutcome: AutomationDryRunManifest["simulatedOutcome"] =
    status === "ready"
      ? "ready_for_human_approval"
      : status === "review"
        ? "review_before_live_design"
        : "blocked_before_approval";

  const attachmentSummary = [
    htmlLive ? "HTML report available" : "HTML report unavailable",
    pdfAcceptable ? "PDF report available" : "PDF report requires review/fix",
    jsonLive ? "JSON model available" : "JSON model unavailable",
  ];

  const payloadPreview: AutomationDryRunPayloadPreview = {
    subject: buildSubject(document),
    preheader: firstNonEmpty(
      [brief.executiveSummary.headline, document.quickCopy.headline],
      "Daily AI trend intelligence brief",
    ),
    headline: document.quickCopy.headline,
    bodyPreview: buildBodyPreview(brief, document),
    markdownCharacters: document.quickCopy.markdown.length,
    quickCopyBullets: document.quickCopy.bullets.slice(0, 5),
    attachmentSummary,
  };

  const safeguards = [
    "dryRun is hard-coded to true in the manifest.",
    "No email provider, SMTP client or send API is called.",
    "Recipient list is intentionally empty.",
    "No cron job, scheduled task or background execution is created.",
    "No database write or report history record is created.",
    "Manifest is generated from reportDocument, not from React UI text scraping.",
  ];

  const executionChecklist = [
    "Load current Daily Brief data for the selected window.",
    "Build reportDocument and export readiness checks.",
    "Verify HTML, JSON, PDF prep, server PDF and PDF health status.",
    "Assemble simulated subject, body preview and attachment plan.",
    "Stop at manifest output. Do not send email. Do not schedule cron. Do not write a report run.",
  ];

  const channelsReady = deliveryChannels.filter(
    (item) => item.status === "ready",
  ).length;
  const artifactsReady = artifacts.filter(
    (item) => item.status === "ready",
  ).length;
  const attachmentCount = artifacts.filter(
    (item) => item.requiredForLiveRun && item.status !== "blocked",
  ).length;

  const manifestHash = simpleHash(
    JSON.stringify({
      window: document.window,
      generatedAt: document.generatedAt,
      status,
      subject: payloadPreview.subject,
      sections: document.integrity.sectionCount,
      blocks: document.integrity.blockCount,
      refs: document.integrity.trendReferenceCount,
      readiness: readiness.score,
      pdf: serverPdfQa?.score ?? 0,
    }),
  );

  return {
    schemaVersion: "automation-dry-run-manifest-v1",
    manifestId: `${manifestHash}_${document.window}`,
    generatedAt: new Date().toISOString(),
    window: document.window,
    dryRun: true,
    status,
    statusLabel: statusLabel(status),
    simulatedOutcome,
    simulatedOutcomeLabel: outcomeLabel(simulatedOutcome),
    wouldSendIfLive: false,
    summary:
      status === "ready"
        ? "The system can assemble a complete dry-run package for human approval. It still does not send anything."
        : status === "review"
          ? "The dry-run package can be assembled, but one or more QA gates should be reviewed before live automation design."
          : "The dry-run package exposes blocking export or readiness issues. Keep the flow manual until those are fixed.",
    recommendedNextStep:
      status === "ready"
        ? "Use the manifest to design a future approval-first automation flow. The next implementation should still be a send preview, not real email delivery."
        : status === "review"
          ? "Compare Daily Brief UI, HTML preview and PDF health before designing live delivery. Keep recipient and schedule config disabled."
          : "Fix blocking gates listed in this manifest before adding any automation configuration.",
    triggerPlan: {
      mode: "manual_dry_run",
      proposedLiveCadence: "daily_after_successful_scan",
      proposedLiveWindow: document.window,
      scheduledJobCreated: false,
      cronEnabled: false,
      detail:
        "This endpoint only simulates the package a future scheduled report might prepare after a successful scan.",
    },
    recipientPlan: {
      status: "not_configured_by_design",
      recipients: [],
      liveEmailEnabled: false,
      detail:
        "No recipient list is stored or used. Future live sending must add explicit recipient configuration and approval.",
    },
    readinessSnapshot: {
      exportReadinessStatus: readiness.status,
      automationStatus: readiness.automationStatus,
      exportReadinessScore: readiness.score,
      automationReadinessScore: readiness.automationReadinessScore,
      exportFlowScore: exportQa.score,
      printLayoutScore: printQa.score,
      serverPdfScore: serverPdfQa?.score ?? 0,
      criticalBlockers: readiness.metrics.criticalBlockers,
      readinessWarnings: readiness.metrics.warnings,
    },
    deliveryChannels,
    artifacts,
    gates,
    blockers,
    warnings: warnings.slice(0, 12),
    safeguards,
    executionChecklist,
    payloadPreview,
    metrics: {
      channelsReady,
      artifactsReady,
      gatesPassing: passingGates,
      gatesWatching: watchingGates,
      gatesFailing: failingGates,
      safeguards: safeguards.length,
      blockers: blockers.length,
      warnings: warnings.length,
      reportSections: document.integrity.sectionCount,
      reportBlocks: document.integrity.blockCount,
      trendReferences: document.integrity.trendReferenceCount,
      attachmentCount: clampScore(attachmentCount),
    },
    integrity: {
      manifestHash,
      reportDocumentSchema: document.schemaVersion,
      generatedFromReportDocument: true,
      noEmailSent: true,
      noCronCreated: true,
      noDatabaseWrite: true,
    },
  };
}
