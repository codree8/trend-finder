import {
  buildDailyBriefAutomationDryRunUrl,
  buildDailyBriefAutomationGuardrailsUrl,
  buildDailyBriefAutomationPreviewUrl,
  buildDailyBriefExportReadinessUrl,
  buildDailyBriefFullJsonExportUrl,
  buildDailyBriefHtmlExportUrl,
  buildDailyBriefJsonExportUrl,
  buildDailyBriefPageUrl,
  buildDailyBriefPdfExportUrl,
  buildDailyBriefPdfHealthUrl,
  buildDailyBriefPdfPrepUrl,
} from "@/lib/trends/daily-brief-export-links";
import type { AutomationDryRunGuardrails } from "@/lib/trends/automation-dry-run-guardrails";
import type { AutomationDryRunManifest } from "@/lib/trends/automation-dry-run-manifest";
import type { DailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import type { ExportSystemReadiness } from "@/lib/trends/export-system-readiness";
import type { DashboardWindow } from "@/lib/trends/types";

export type AutomationPreviewStatus = "safe" | "review" | "blocked";

export type AutomationPreviewMode = "dry_run_only";

export type AutomationPreviewRiskSeverity = "info" | "warning" | "danger";

export type AutomationPreviewArtifactLink = {
  id:
    | "daily_brief_ui"
    | "html_preview"
    | "html_download"
    | "pdf_preview"
    | "pdf_download"
    | "pdf_prep"
    | "json_report_document"
    | "json_full_brief"
    | "export_readiness"
    | "pdf_health"
    | "dry_run_manifest"
    | "guardrails"
    | "preview_console";
  label: string;
  group: "Review" | "Artifacts" | "Diagnostics";
  format: "ui" | "html" | "pdf" | "json";
  status: "ready" | "review" | "blocked" | "diagnostic";
  href: string;
  primary: boolean;
  detail: string;
};

export type AutomationPreviewDryRunSummary = {
  status: AutomationDryRunManifest["status"];
  statusLabel: string;
  simulatedOutcome: AutomationDryRunManifest["simulatedOutcome"];
  simulatedOutcomeLabel: string;
  dryRun: true;
  wouldSendIfLive: false;
  noEmailSent: true;
  noCronCreated: true;
  noDatabaseWrite: true;
  recipientsConfigured: 0;
  channelsReady: number;
  artifactsReady: number;
  blockers: number;
  warnings: number;
  summary: string;
  recommendedNextStep: string;
};

export type AutomationPreviewGuardrailsSummary = {
  guardrailStatus: AutomationDryRunGuardrails["guardrailStatus"];
  liveAutomationStatus: AutomationDryRunGuardrails["liveAutomationStatus"];
  safetyScore: number;
  simulatedSendRisk: AutomationDryRunGuardrails["simulatedSendRisk"];
  criticalFailures: number;
  topCriticalGuardrails: AutomationDryRunGuardrails["criticalGuardrails"];
  summary: string;
};

export type AutomationPreviewExportReadinessSummary = {
  status: ExportSystemReadiness["status"];
  statusLabel: string;
  automationStatus: ExportSystemReadiness["automationStatus"];
  automationStatusLabel: string;
  score: number;
  manualExportScore: number;
  automationReadinessScore: number;
  criticalBlockers: number;
  warnings: number;
  pdfHealth: {
    available: boolean;
    status: DailyBriefServerPdfReliabilityQa["status"] | "unavailable";
    score: number | null;
    pageCount: number | null;
    kilobytes: number | null;
    summary: string;
  };
  summary: string;
  recommendedNextStep: string;
};

export type AutomationPreviewSimulatedChannel = {
  id: AutomationDryRunManifest["deliveryChannels"][number]["id"];
  label: string;
  role: AutomationDryRunManifest["deliveryChannels"][number]["role"];
  status: AutomationDryRunManifest["deliveryChannels"][number]["status"];
  liveDeliveryEnabled: false;
  wouldIncludeInLiveRun: boolean;
  href: string | null;
  detail: string;
};

export type AutomationPreviewEmailPreview = {
  subject: string;
  preheader: string;
  headline: string;
  bodyPreview: string;
  quickCopyBullets: string[];
  attachmentSummary: string[];
  markdownCharacters: number;
  recipients: [];
  liveEmailEnabled: false;
  wouldSendIfLive: false;
};

export type AutomationPreviewRisk = {
  id: string;
  label: string;
  severity: AutomationPreviewRiskSeverity;
  detail: string;
  mitigation: string;
};

export type AutomationPreviewIntegrityCheck = {
  id: string;
  label: string;
  passed: boolean;
  critical: boolean;
  detail: string;
};

export type AutomationPreviewCrossWindowLink = {
  window: DashboardWindow;
  isCurrent: boolean;
  previewUrl: string;
  dryRunManifestUrl: string;
  guardrailsUrl: string;
  readinessUrl: string;
};

export type AutomationPreviewConsole = {
  schemaVersion: "automation-preview-console-v1";
  generatedAt: string;
  window: DashboardWindow;
  previewStatus: AutomationPreviewStatus;
  automationMode: AutomationPreviewMode;
  summary: string;
  dryRunSummary: AutomationPreviewDryRunSummary;
  guardrailsSummary: AutomationPreviewGuardrailsSummary;
  exportReadinessSummary: AutomationPreviewExportReadinessSummary;
  artifactLinks: AutomationPreviewArtifactLink[];
  simulatedChannels: AutomationPreviewSimulatedChannel[];
  simulatedEmailPreview: AutomationPreviewEmailPreview;
  blockers: string[];
  risks: AutomationPreviewRisk[];
  integrityChecks: AutomationPreviewIntegrityCheck[];
  crossWindowSummary: {
    currentWindow: DashboardWindow;
    windows: AutomationPreviewCrossWindowLink[];
    detail: string;
  };
  recommendedNextStep: string;
};

const windowsToValidate: DashboardWindow[] = ["24h", "7d", "30d"];

function uniqueStrings(items: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      items
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function artifactStatus(
  manifest: AutomationDryRunManifest,
  id: AutomationDryRunManifest["artifacts"][number]["id"],
): AutomationPreviewArtifactLink["status"] {
  const item = manifest.artifacts.find((artifact) => artifact.id === id);

  if (!item) return "blocked";
  return item.status;
}

function buildArtifactLinks({
  manifest,
  guardrails,
}: {
  manifest: AutomationDryRunManifest;
  guardrails: AutomationDryRunGuardrails;
}): AutomationPreviewArtifactLink[] {
  const window = manifest.window;

  return [
    {
      id: "daily_brief_ui",
      label: "Daily Brief UI",
      group: "Review",
      format: "ui",
      status: artifactStatus(manifest, "daily_brief_ui"),
      href: buildDailyBriefPageUrl(window),
      primary: true,
      detail: "Human review path for the intelligence brief before any automation design.",
    },
    {
      id: "html_preview",
      label: "HTML preview",
      group: "Review",
      format: "html",
      status: artifactStatus(manifest, "html_preview"),
      href: buildDailyBriefHtmlExportUrl(window),
      primary: true,
      detail: "Primary visual preview for report layout and editorial review.",
    },
    {
      id: "html_download",
      label: "HTML download",
      group: "Artifacts",
      format: "html",
      status: artifactStatus(manifest, "html_download"),
      href: buildDailyBriefHtmlExportUrl(window, { download: true }),
      primary: false,
      detail: "Standalone HTML file for manual distribution or archive.",
    },
    {
      id: "pdf_preview",
      label: "PDF preview",
      group: "Review",
      format: "pdf",
      status: artifactStatus(manifest, "pdf_preview"),
      href: buildDailyBriefPdfExportUrl(window, { inline: true }),
      primary: true,
      detail: "Browser preview of the server-generated PDF candidate.",
    },
    {
      id: "pdf_download",
      label: "PDF download",
      group: "Artifacts",
      format: "pdf",
      status: artifactStatus(manifest, "pdf_download"),
      href: buildDailyBriefPdfExportUrl(window),
      primary: true,
      detail: "Binary PDF candidate for a future attachment path.",
    },
    {
      id: "pdf_prep",
      label: "PDF prep layout",
      group: "Review",
      format: "html",
      status: artifactStatus(manifest, "pdf_prep"),
      href: buildDailyBriefPdfPrepUrl(window),
      primary: false,
      detail: "Print-safe HTML fallback for page-break inspection.",
    },
    {
      id: "json_report_document",
      label: "JSON reportDocument",
      group: "Artifacts",
      format: "json",
      status: artifactStatus(manifest, "json_model"),
      href: buildDailyBriefJsonExportUrl(window),
      primary: true,
      detail: "Stable machine-readable report model for automation contracts.",
    },
    {
      id: "json_full_brief",
      label: "Full Daily Brief JSON",
      group: "Diagnostics",
      format: "json",
      status: artifactStatus(manifest, "json_full"),
      href: buildDailyBriefFullJsonExportUrl(window),
      primary: false,
      detail: "Full diagnostic payload for debugging the automation input.",
    },
    {
      id: "export_readiness",
      label: "Export readiness JSON",
      group: "Diagnostics",
      format: "json",
      status: artifactStatus(manifest, "readiness_json"),
      href: buildDailyBriefExportReadinessUrl(window),
      primary: true,
      detail: "Final readiness diagnostics for manual export and automation boundaries.",
    },
    {
      id: "pdf_health",
      label: "PDF health JSON",
      group: "Diagnostics",
      format: "json",
      status: artifactStatus(manifest, "pdf_health_json"),
      href: buildDailyBriefPdfHealthUrl(window),
      primary: true,
      detail: "Server PDF reliability diagnostics.",
    },
    {
      id: "dry_run_manifest",
      label: "Dry-run manifest JSON",
      group: "Diagnostics",
      format: "json",
      status: manifest.status === "blocked" ? "blocked" : manifest.status === "review" ? "review" : "diagnostic",
      href: buildDailyBriefAutomationDryRunUrl(window),
      primary: true,
      detail: "Simulation manifest. It must never trigger real delivery.",
    },
    {
      id: "guardrails",
      label: "Guardrails JSON",
      group: "Diagnostics",
      format: "json",
      status: guardrails.guardrailStatus === "blocked" ? "blocked" : guardrails.guardrailStatus === "review" ? "review" : "diagnostic",
      href: buildDailyBriefAutomationGuardrailsUrl(window),
      primary: true,
      detail: "Safety boundary inspection for the dry-run manifest.",
    },
    {
      id: "preview_console",
      label: "Preview console JSON",
      group: "Diagnostics",
      format: "json",
      status: "diagnostic",
      href: buildDailyBriefAutomationPreviewUrl(window),
      primary: true,
      detail: "Combined control-room payload for dry-run, guardrails and export readiness.",
    },
  ];
}

function buildRisks({
  manifest,
  guardrails,
  readiness,
  serverPdfQa,
}: {
  manifest: AutomationDryRunManifest;
  guardrails: AutomationDryRunGuardrails;
  readiness: ExportSystemReadiness;
  serverPdfQa: DailyBriefServerPdfReliabilityQa | null;
}): AutomationPreviewRisk[] {
  const sendRisks = guardrails.simulatedSendRisk.riskFactors.map((factor, index) => ({
    id: `send-risk-${index + 1}`,
    label: "Simulated send boundary changed",
    severity: "danger" as const,
    detail: factor,
    mitigation: "Restore dry-run defaults before continuing automation preview work.",
  }));

  const readinessRisks = readiness.gates
    .filter((gate) => gate.status !== "pass")
    .slice(0, 6)
    .map((gate) => ({
      id: `readiness-${gate.id}`,
      label: gate.label,
      severity: gate.status === "fail" ? ("danger" as const) : ("warning" as const),
      detail: gate.detail,
      mitigation: gate.recommendedAction,
    }));

  const manifestRisks = manifest.gates
    .filter((gate) => gate.status === "fail" || gate.status === "watch")
    .slice(0, 6)
    .map((gate) => ({
      id: `manifest-${gate.id}`,
      label: gate.label,
      severity: gate.status === "fail" ? ("danger" as const) : ("warning" as const),
      detail: gate.detail,
      mitigation: gate.recommendedAction,
    }));

  const pdfRisk =
    serverPdfQa && serverPdfQa.status !== "healthy"
      ? [
          {
            id: "pdf-health",
            label: "PDF health needs review",
            severity: serverPdfQa.status === "caution" ? ("danger" as const) : ("warning" as const),
            detail: serverPdfQa.summary,
            mitigation: serverPdfQa.recommendedAction,
          },
        ]
      : [];

  return [
    ...sendRisks,
    ...readinessRisks,
    ...manifestRisks,
    ...pdfRisk,
  ].slice(0, 12);
}

function buildPreviewStatus({
  manifest,
  guardrails,
  readiness,
  risks,
}: {
  manifest: AutomationDryRunManifest;
  guardrails: AutomationDryRunGuardrails;
  readiness: ExportSystemReadiness;
  risks: AutomationPreviewRisk[];
}): AutomationPreviewStatus {
  if (
    manifest.status === "blocked" ||
    guardrails.guardrailStatus === "blocked" ||
    readiness.status === "blocked" ||
    guardrails.simulatedSendRisk.level === "high" ||
    risks.some((risk) => risk.severity === "danger")
  ) {
    return "blocked";
  }

  if (
    manifest.status === "review" ||
    guardrails.guardrailStatus === "review" ||
    readiness.status === "review" ||
    guardrails.simulatedSendRisk.level !== "none" ||
    risks.length > 0
  ) {
    return "review";
  }

  return "safe";
}

function buildSummary(status: AutomationPreviewStatus) {
  if (status === "blocked") {
    return "Automation preview is inspection-only and currently blocked from any live automation design. Review the blockers before moving beyond dry-run.";
  }

  if (status === "review") {
    return "Automation preview is available for dry-run review. Some readiness or safety items still need human inspection before the next automation layer.";
  }

  return "Automation preview is safe for simulation. It still exposes no send action, no scheduler and no database write path.";
}

function buildRecommendedNextStep({
  status,
  guardrails,
  readiness,
}: {
  status: AutomationPreviewStatus;
  guardrails: AutomationDryRunGuardrails;
  readiness: ExportSystemReadiness;
}) {
  if (status === "blocked") {
    return "Keep automation dry-run only. Resolve blocked readiness/guardrail items, then rerun preview for 24h, 7d and 30d.";
  }

  if (status === "review") {
    return "Compare the preview payload across all three windows and review risks before adding any config contract or manual approval model.";
  }

  if (guardrails.liveAutomationStatus === "ready_for_dry_run_only" && readiness.automationStatus === "ready_for_dry_run") {
    return "Next safe step: add an Automation Config Contract with all live flags defaulting to false. Do not add email sending yet.";
  }

  return "Keep the preview console as the source of truth until live automation is explicitly designed as a separate feature.";
}

export function buildAutomationPreviewConsole({
  manifest,
  guardrails,
  readiness,
  serverPdfQa,
}: {
  manifest: AutomationDryRunManifest;
  guardrails: AutomationDryRunGuardrails;
  readiness: ExportSystemReadiness;
  serverPdfQa: DailyBriefServerPdfReliabilityQa | null;
}): AutomationPreviewConsole {
  const blockers = uniqueStrings([
    ...guardrails.blockerPolicy.blockedBy,
    ...manifest.blockers,
    ...readiness.gates
      .filter((gate) => gate.status === "fail" && gate.automationBlocking)
      .map((gate) => gate.label),
  ]);
  const risks = buildRisks({ manifest, guardrails, readiness, serverPdfQa });
  const previewStatus = buildPreviewStatus({
    manifest,
    guardrails,
    readiness,
    risks,
  });
  const criticalFailures = guardrails.criticalGuardrails.filter(
    (item) => item.critical && item.status === "fail",
  ).length;
  const artifactLinks = buildArtifactLinks({ manifest, guardrails });

  return {
    schemaVersion: "automation-preview-console-v1",
    generatedAt: new Date().toISOString(),
    window: manifest.window,
    previewStatus,
    automationMode: "dry_run_only",
    summary: buildSummary(previewStatus),
    dryRunSummary: {
      status: manifest.status,
      statusLabel: manifest.statusLabel,
      simulatedOutcome: manifest.simulatedOutcome,
      simulatedOutcomeLabel: manifest.simulatedOutcomeLabel,
      dryRun: true,
      wouldSendIfLive: false,
      noEmailSent: manifest.integrity.noEmailSent,
      noCronCreated: manifest.integrity.noCronCreated,
      noDatabaseWrite: manifest.integrity.noDatabaseWrite,
      recipientsConfigured: manifest.recipientPlan.recipients.length,
      channelsReady: manifest.metrics.channelsReady,
      artifactsReady: manifest.metrics.artifactsReady,
      blockers: manifest.metrics.blockers,
      warnings: manifest.metrics.warnings,
      summary: manifest.summary,
      recommendedNextStep: manifest.recommendedNextStep,
    },
    guardrailsSummary: {
      guardrailStatus: guardrails.guardrailStatus,
      liveAutomationStatus: guardrails.liveAutomationStatus,
      safetyScore: guardrails.safetyScore,
      simulatedSendRisk: guardrails.simulatedSendRisk,
      criticalFailures,
      topCriticalGuardrails: guardrails.criticalGuardrails.slice(0, 6),
      summary: guardrails.recommendedNextStep,
    },
    exportReadinessSummary: {
      status: readiness.status,
      statusLabel: readiness.statusLabel,
      automationStatus: readiness.automationStatus,
      automationStatusLabel: readiness.automationStatusLabel,
      score: readiness.score,
      manualExportScore: readiness.manualExportScore,
      automationReadinessScore: readiness.automationReadinessScore,
      criticalBlockers: readiness.metrics.criticalBlockers,
      warnings: readiness.metrics.warnings,
      pdfHealth: serverPdfQa
        ? {
            available: true,
            status: serverPdfQa.status,
            score: serverPdfQa.score,
            pageCount: serverPdfQa.metrics.pageCount,
            kilobytes: serverPdfQa.metrics.kilobytes,
            summary: serverPdfQa.summary,
          }
        : {
            available: false,
            status: "unavailable",
            score: null,
            pageCount: null,
            kilobytes: null,
            summary: "Server PDF health was not available while building the preview console.",
          },
      summary: readiness.summary,
      recommendedNextStep: readiness.recommendedNextStep,
    },
    artifactLinks,
    simulatedChannels: manifest.deliveryChannels.map((channel) => ({
      id: channel.id,
      label: channel.label,
      role: channel.role,
      status: channel.status,
      liveDeliveryEnabled: channel.liveDeliveryEnabled,
      wouldIncludeInLiveRun: channel.wouldIncludeInLiveRun,
      href: channel.href,
      detail: channel.detail,
    })),
    simulatedEmailPreview: {
      subject: manifest.payloadPreview.subject,
      preheader: manifest.payloadPreview.preheader,
      headline: manifest.payloadPreview.headline,
      bodyPreview: manifest.payloadPreview.bodyPreview,
      quickCopyBullets: manifest.payloadPreview.quickCopyBullets,
      attachmentSummary: manifest.payloadPreview.attachmentSummary,
      markdownCharacters: manifest.payloadPreview.markdownCharacters,
      recipients: manifest.recipientPlan.recipients,
      liveEmailEnabled: manifest.recipientPlan.liveEmailEnabled,
      wouldSendIfLive: false,
    },
    blockers,
    risks,
    integrityChecks: [
      ...guardrails.dryRunIntegrityChecks,
      {
        id: "preview-console-no-side-effects",
        label: "Preview console has no side effects",
        passed: true,
        critical: true,
        detail: "This console only combines already generated diagnostics and links; it does not send, schedule or persist anything.",
      },
    ],
    crossWindowSummary: {
      currentWindow: manifest.window,
      windows: windowsToValidate.map((window) => ({
        window,
        isCurrent: window === manifest.window,
        previewUrl: buildDailyBriefAutomationPreviewUrl(window),
        dryRunManifestUrl: buildDailyBriefAutomationDryRunUrl(window),
        guardrailsUrl: buildDailyBriefAutomationGuardrailsUrl(window),
        readinessUrl: buildDailyBriefExportReadinessUrl(window),
      })),
      detail: "Inspect 24h, 7d and 30d before adding any live configuration because report density, PDF size and signal quality change by window.",
    },
    recommendedNextStep: buildRecommendedNextStep({
      status: previewStatus,
      guardrails,
      readiness,
    }),
  };
}
