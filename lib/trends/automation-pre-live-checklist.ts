import type { AutomationConfigContract } from "@/lib/trends/automation-config";
import type { AutomationDryRunGuardrails } from "@/lib/trends/automation-dry-run-guardrails";
import type { AutomationDryRunManifest } from "@/lib/trends/automation-dry-run-manifest";
import type { AutomationPreviewConsole } from "@/lib/trends/automation-preview-console";
import type { DailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import type { ExportSystemReadiness } from "@/lib/trends/export-system-readiness";
import type { DashboardWindow } from "@/lib/trends/types";

export type AutomationPreLiveChecklistStatus =
  | "ready_for_manual_design"
  | "review"
  | "blocked";

export type AutomationPreLiveLiveStatus =
  | "live_blocked"
  | "test_prep_blocked"
  | "ready_for_limited_test_prep";

export type AutomationPreLiveChecklistItemStatus =
  | "pass"
  | "watch"
  | "fail"
  | "planned";

export type AutomationPreLiveChecklistSeverity =
  | "success"
  | "info"
  | "warning"
  | "danger";

export type AutomationPreLiveChecklistCategory =
  | "safety_boundary"
  | "configuration"
  | "recipient_policy"
  | "approval_policy"
  | "delivery_infrastructure"
  | "artifacts"
  | "observability";

export type AutomationPreLiveChecklistItem = {
  id: string;
  category: AutomationPreLiveChecklistCategory;
  label: string;
  status: AutomationPreLiveChecklistItemStatus;
  severity: AutomationPreLiveChecklistSeverity;
  critical: boolean;
  liveBlocking: boolean;
  detail: string;
  evidence: string[];
  requiredAction: string;
};

export type AutomationPreLiveCategorySummary = {
  category: AutomationPreLiveChecklistCategory;
  label: string;
  score: number;
  status: AutomationPreLiveChecklistItemStatus;
  totalItems: number;
  passingItems: number;
  blockingItems: number;
  detail: string;
};

export type AutomationPreLiveGoNoGo = {
  canGoLive: false;
  canStartLimitedInternalTestPrep: boolean;
  canAddManualApprovalMode: boolean;
  reason: string;
};

export type AutomationPreLiveChecklist = {
  schemaVersion: "automation-pre-live-checklist-v1";
  generatedAt: string;
  window: DashboardWindow;
  checklistStatus: AutomationPreLiveChecklistStatus;
  liveReadinessStatus: AutomationPreLiveLiveStatus;
  overallScore: number;
  goNoGo: AutomationPreLiveGoNoGo;
  sourceSummary: {
    configSafetyMode: AutomationConfigContract["safetyMode"];
    previewStatus: AutomationPreviewConsole["previewStatus"];
    guardrailStatus: AutomationDryRunGuardrails["guardrailStatus"];
    exportReadinessStatus: ExportSystemReadiness["status"];
    pdfHealthStatus: DailyBriefServerPdfReliabilityQa["status"] | "unavailable";
    dryRunStatus: AutomationDryRunManifest["status"];
    safetyScore: number;
  };
  categorySummaries: AutomationPreLiveCategorySummary[];
  checklistItems: AutomationPreLiveChecklistItem[];
  hardBlockers: string[];
  criticalMissingItems: string[];
  requiredBeforeLive: string[];
  allowedNextSteps: string[];
  disallowedActions: string[];
  integrityChecks: {
    id: string;
    label: string;
    passed: boolean;
    critical: boolean;
    detail: string;
  }[];
  crossWindowSummary: {
    currentWindow: DashboardWindow;
    windowsToValidate: DashboardWindow[];
    detail: string;
  };
  recommendedNextStep: string;
};

const windowsToValidate: DashboardWindow[] = ["24h", "7d", "30d"];

const categoryLabels: Record<AutomationPreLiveChecklistCategory, string> = {
  safety_boundary: "Safety boundary",
  configuration: "Configuration contract",
  recipient_policy: "Recipient policy",
  approval_policy: "Manual approval",
  delivery_infrastructure: "Delivery infrastructure",
  artifacts: "Export artifacts",
  observability: "Observability",
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function item(input: AutomationPreLiveChecklistItem) {
  return input;
}

function statusWeight(status: AutomationPreLiveChecklistItemStatus) {
  if (status === "pass") return 1;
  if (status === "watch") return 0.72;
  if (status === "planned") return 0.38;
  return 0;
}

function scoreItems(items: AutomationPreLiveChecklistItem[]) {
  if (items.length === 0) return 0;

  const weighted = items.reduce((sum, current) => {
    const criticalWeight = current.critical ? 1.35 : 1;
    return sum + statusWeight(current.status) * criticalWeight;
  }, 0);
  const max = items.reduce(
    (sum, current) => sum + (current.critical ? 1.35 : 1),
    0,
  );

  return clampScore((weighted / max) * 100);
}

function categoryStatus(
  items: AutomationPreLiveChecklistItem[],
): AutomationPreLiveChecklistItemStatus {
  if (items.some((current) => current.status === "fail")) return "fail";
  if (items.some((current) => current.status === "planned")) return "planned";
  if (items.some((current) => current.status === "watch")) return "watch";
  return "pass";
}

function buildCategorySummaries(
  items: AutomationPreLiveChecklistItem[],
): AutomationPreLiveCategorySummary[] {
  return Object.entries(categoryLabels).map(([category, label]) => {
    const typedCategory = category as AutomationPreLiveChecklistCategory;
    const categoryItems = items.filter(
      (current) => current.category === typedCategory,
    );
    const blockingItems = categoryItems.filter(
      (current) => current.liveBlocking,
    ).length;
    const passingItems = categoryItems.filter(
      (current) => current.status === "pass",
    ).length;
    const status = categoryStatus(categoryItems);

    return {
      category: typedCategory,
      label,
      score: scoreItems(categoryItems),
      status,
      totalItems: categoryItems.length,
      passingItems,
      blockingItems,
      detail:
        blockingItems > 0
          ? `${label} still contains ${blockingItems} live blocker${blockingItems === 1 ? "" : "s"}.`
          : `${label} has no active live blocker in the current checklist.`,
    };
  });
}

function buildChecklistStatus({
  items,
  guardrails,
  preview,
  readiness,
}: {
  items: AutomationPreLiveChecklistItem[];
  guardrails: AutomationDryRunGuardrails;
  preview: AutomationPreviewConsole;
  readiness: ExportSystemReadiness;
}): AutomationPreLiveChecklistStatus {
  const criticalFailures = items.some(
    (current) => current.critical && current.status === "fail",
  );

  if (
    criticalFailures ||
    guardrails.guardrailStatus === "blocked" ||
    preview.previewStatus === "blocked" ||
    readiness.status === "blocked"
  ) {
    return "blocked";
  }

  if (
    items.some((current) => current.status === "watch") ||
    guardrails.guardrailStatus === "review" ||
    preview.previewStatus === "review" ||
    readiness.status === "review"
  ) {
    return "review";
  }

  return "ready_for_manual_design";
}

function buildRecommendedNextStep({
  checklistStatus,
  canAddManualApprovalMode,
}: {
  checklistStatus: AutomationPreLiveChecklistStatus;
  canAddManualApprovalMode: boolean;
}) {
  if (checklistStatus === "blocked") {
    return "Keep automation dry-run only. Resolve failed safety, preview, export or config checks before adding manual approval state.";
  }

  if (checklistStatus === "review") {
    return "Review warnings across 24h, 7d and 30d before adding the Manual Approval Mode layer.";
  }

  if (canAddManualApprovalMode) {
    return "Next safe step: add Manual Approval Mode v1 as a review-state model. Still do not add email sending, cron, recipients or database writes unless that step explicitly requires them later.";
  }

  return "Keep the pre-live checklist as the gate before designing manual approval or limited internal email test prep.";
}

export function preLiveChecklistStatusTone(
  status: AutomationPreLiveChecklistStatus,
) {
  if (status === "ready_for_manual_design") return "positive";
  if (status === "review") return "warning";
  return "danger";
}

export function preLiveChecklistItemTone(
  status: AutomationPreLiveChecklistItemStatus,
) {
  if (status === "pass") return "positive";
  if (status === "watch" || status === "planned") return "warning";
  return "danger";
}

export function buildAutomationPreLiveChecklist({
  config,
  manifest,
  guardrails,
  preview,
  readiness,
  serverPdfQa,
}: {
  config: AutomationConfigContract;
  manifest: AutomationDryRunManifest;
  guardrails: AutomationDryRunGuardrails;
  preview: AutomationPreviewConsole;
  readiness: ExportSystemReadiness;
  serverPdfQa: DailyBriefServerPdfReliabilityQa | null;
}): AutomationPreLiveChecklist {
  const configCriticalFailures = config.configIntegrityChecks.filter(
    (current) => current.critical && !current.passed,
  );
  const previewCriticalFailures = preview.integrityChecks.filter(
    (current) => current.critical && !current.passed,
  );
  const dryRunCriticalFailed =
    !manifest.integrity.noEmailSent ||
    !manifest.integrity.noCronCreated ||
    !manifest.integrity.noDatabaseWrite ||
    manifest.wouldSendIfLive;
  const exportAutomationBlocked = readiness.gates.some(
    (gate) => gate.status === "fail" && gate.automationBlocking,
  );
  const pdfHealthy = serverPdfQa?.status === "healthy";

  const checklistItems: AutomationPreLiveChecklistItem[] = [
    item({
      id: "dry-run-boundary-intact",
      category: "safety_boundary",
      label: "Dry-run boundary intact",
      status: dryRunCriticalFailed ? "fail" : "pass",
      severity: dryRunCriticalFailed ? "danger" : "success",
      critical: true,
      liveBlocking: dryRunCriticalFailed,
      detail:
        "The automation layer must still prove that no email was sent, no cron was created, no database write happened and wouldSendIfLive is false.",
      evidence: [
        `noEmailSent: ${manifest.integrity.noEmailSent}`,
        `noCronCreated: ${manifest.integrity.noCronCreated}`,
        `noDatabaseWrite: ${manifest.integrity.noDatabaseWrite}`,
        `wouldSendIfLive: ${manifest.wouldSendIfLive}`,
      ],
      requiredAction:
        "Restore dry-run safeguards before any further automation work.",
    }),
    item({
      id: "send-risk-none",
      category: "safety_boundary",
      label: "Simulated send risk is zero",
      status: guardrails.simulatedSendRisk.level === "none" ? "pass" : "fail",
      severity:
        guardrails.simulatedSendRisk.level === "none" ? "success" : "danger",
      critical: true,
      liveBlocking: guardrails.simulatedSendRisk.level !== "none",
      detail:
        "The guardrails layer must detect no realistic path where this dry-run can send a message.",
      evidence: [
        `simulatedSendRisk: ${guardrails.simulatedSendRisk.level}`,
        `riskFactors: ${guardrails.simulatedSendRisk.riskFactors.length}`,
      ],
      requiredAction:
        "Remove any live delivery flag, recipient source or scheduled path before proceeding.",
    }),
    item({
      id: "config-safe-defaults",
      category: "configuration",
      label: "Safe-by-default config contract",
      status: configCriticalFailures.length === 0 ? "pass" : "fail",
      severity: configCriticalFailures.length === 0 ? "success" : "danger",
      critical: true,
      liveBlocking: configCriticalFailures.length > 0,
      detail:
        "The config contract must keep automation, live email and cron disabled, with manual approval required and recipients empty.",
      evidence: [
        `safetyMode: ${config.safetyMode}`,
        `automationEnabled: ${config.automationEnabled}`,
        `liveEmailEnabled: ${config.liveEmailEnabled}`,
        `cronEnabled: ${config.cronEnabled}`,
        `criticalConfigFailures: ${configCriticalFailures.length}`,
      ],
      requiredAction:
        "Fix failed config integrity checks before adding approval or test-send layers.",
    }),
    item({
      id: "recipient-policy-defined",
      category: "recipient_policy",
      label: "Recipient policy is explicit",
      status: "planned",
      severity: "warning",
      critical: true,
      liveBlocking: true,
      detail:
        "Current mode correctly blocks recipients, but live readiness still needs a written internal-only recipient policy before any test-send design.",
      evidence: [
        `currentRecipients: ${config.recipients.length}`,
        `recipientsAllowed: ${config.recipientPolicy.recipientsAllowed}`,
        `envRecipientsAllowed: ${config.recipientPolicy.envRecipientsAllowed}`,
      ],
      requiredAction:
        "Define explicit internal-only test recipients and a rule that forbids env-loaded recipient lists until approved.",
    }),
    item({
      id: "manual-approval-mode-exists",
      category: "approval_policy",
      label: "Manual approval mode exists",
      status: "planned",
      severity: "warning",
      critical: true,
      liveBlocking: true,
      detail:
        "The config requires manual approval, but the dedicated approval-state model has not been added yet.",
      evidence: [
        `manualApprovalRequired: ${config.manualApprovalRequired}`,
        `manualSendOnly: ${config.manualSendOnly}`,
      ],
      requiredAction:
        "Add Manual Approval Mode v1 before any limited internal email test prep.",
    }),
    item({
      id: "send-ui-absent",
      category: "approval_policy",
      label: "No send or enable UI exists",
      status: "pass",
      severity: "success",
      critical: true,
      liveBlocking: false,
      detail:
        "The current Reports and Daily Brief surfaces expose diagnostic links only, not send or enable controls.",
      evidence: config.blockedCapabilities
        .filter((capability) => capability.id === "send_button")
        .map((capability) => capability.detail),
      requiredAction:
        "Keep send and enable controls out until approval mode and limited internal test prep are complete.",
    }),
    item({
      id: "email-provider-absent",
      category: "delivery_infrastructure",
      label: "Email provider intentionally absent",
      status: "planned",
      severity: "warning",
      critical: true,
      liveBlocking: true,
      detail:
        "No email provider is configured. That is correct for this phase, but it blocks live automation.",
      evidence: config.blockedCapabilities
        .filter((capability) => capability.id === "external_email_provider")
        .map((capability) => capability.detail),
      requiredAction:
        "Introduce an email provider only during Limited Internal Email Test Prep, not in this checklist step.",
    }),
    item({
      id: "cron-disabled",
      category: "delivery_infrastructure",
      label: "Cron and scheduler are disabled",
      status: config.cronEnabled || manifest.triggerPlan.cronEnabled ? "fail" : "pass",
      severity:
        config.cronEnabled || manifest.triggerPlan.cronEnabled
          ? "danger"
          : "success",
      critical: true,
      liveBlocking: config.cronEnabled || manifest.triggerPlan.cronEnabled,
      detail:
        "Scheduled delivery must stay disabled until manual internal sending is proven safe.",
      evidence: [
        `config.cronEnabled: ${config.cronEnabled}`,
        `manifest.cronEnabled: ${manifest.triggerPlan.cronEnabled}`,
        `scheduledJobCreated: ${manifest.triggerPlan.scheduledJobCreated}`,
      ],
      requiredAction:
        "Keep cron disabled and do not add scheduler UI.",
    }),
    item({
      id: "export-readiness-passing",
      category: "artifacts",
      label: "Export readiness is acceptable",
      status: exportAutomationBlocked ? "fail" : readiness.status === "review" ? "watch" : "pass",
      severity: exportAutomationBlocked
        ? "danger"
        : readiness.status === "review"
          ? "warning"
          : "success",
      critical: true,
      liveBlocking: exportAutomationBlocked,
      detail:
        "HTML, JSON, PDF and readiness gates must be stable before any approval or test-send flow consumes them.",
      evidence: [
        `readinessStatus: ${readiness.status}`,
        `readinessScore: ${readiness.score}`,
        `automationStatus: ${readiness.automationStatus}`,
        `automationReadinessScore: ${readiness.automationReadinessScore}`,
      ],
      requiredAction:
        "Fix failed export readiness gates before moving toward live automation.",
    }),
    item({
      id: "pdf-health-available",
      category: "artifacts",
      label: "PDF health is available",
      status: !serverPdfQa ? "watch" : pdfHealthy ? "pass" : "watch",
      severity: !serverPdfQa ? "warning" : pdfHealthy ? "success" : "warning",
      critical: false,
      liveBlocking: false,
      detail:
        "PDF health should be visible because future email test prep may depend on PDF attachment confidence.",
      evidence: [
        `pdfStatus: ${serverPdfQa?.status ?? "unavailable"}`,
        `pdfScore: ${serverPdfQa?.score ?? "n/a"}`,
      ],
      requiredAction:
        "Review PDF health warnings before attaching PDFs in any future internal email test.",
    }),
    item({
      id: "preview-console-passing",
      category: "observability",
      label: "Preview console is inspectable",
      status:
        preview.previewStatus === "blocked"
          ? "fail"
          : preview.previewStatus === "review"
            ? "watch"
            : "pass",
      severity:
        preview.previewStatus === "blocked"
          ? "danger"
          : preview.previewStatus === "review"
            ? "warning"
            : "success",
      critical: true,
      liveBlocking: preview.previewStatus === "blocked",
      detail:
        "The preview console must remain the control-room payload that unifies dry-run, guardrails and export readiness.",
      evidence: [
        `previewStatus: ${preview.previewStatus}`,
        `previewIntegrityFailures: ${previewCriticalFailures.length}`,
        `previewBlockers: ${preview.blockers.length}`,
        `previewRisks: ${preview.risks.length}`,
      ],
      requiredAction:
        "Resolve preview blockers before using checklist output for the next automation layer.",
    }),
    item({
      id: "cross-window-validation-needed",
      category: "observability",
      label: "Cross-window validation is required",
      status: "planned",
      severity: "info",
      critical: false,
      liveBlocking: false,
      detail:
        "Before live automation, the same checklist must be reviewed for 24h, 7d and 30d so one clean window does not hide another weak one.",
      evidence: [`currentWindow: ${manifest.window}`, "requiredWindows: 24h, 7d, 30d"],
      requiredAction:
        "Open checklist JSON for all supported windows and compare blockers before adding live-facing features.",
    }),
  ];

  const categorySummaries = buildCategorySummaries(checklistItems);
  const hardBlockers = checklistItems
    .filter((current) => current.liveBlocking)
    .map((current) => current.label);
  const criticalMissingItems = checklistItems
    .filter(
      (current) => current.critical && current.status !== "pass",
    )
    .map((current) => current.label);
  const checklistStatus = buildChecklistStatus({
    items: checklistItems,
    guardrails,
    preview,
    readiness,
  });
  const canStartLimitedInternalTestPrep =
    checklistStatus !== "blocked" &&
    criticalMissingItems.every(
      (label) =>
        label === "Recipient policy is explicit" ||
        label === "Manual approval mode exists" ||
        label === "Email provider intentionally absent",
    );
  const canAddManualApprovalMode =
    checklistStatus !== "blocked" &&
    configCriticalFailures.length === 0 &&
    guardrails.simulatedSendRisk.level === "none";
  const overallScore = scoreItems(checklistItems);

  const integrityChecks = [
    {
      id: "config-present",
      label: "Config contract present",
      passed: config.schemaVersion === "automation-config-contract-v1",
      critical: true,
      detail: `Config schema: ${config.schemaVersion}`,
    },
    {
      id: "preview-present",
      label: "Preview console present",
      passed: preview.schemaVersion === "automation-preview-console-v1",
      critical: true,
      detail: `Preview schema: ${preview.schemaVersion}`,
    },
    {
      id: "dry-run-present",
      label: "Dry-run manifest present",
      passed: manifest.schemaVersion === "automation-dry-run-manifest-v1",
      critical: true,
      detail: `Manifest schema: ${manifest.schemaVersion}`,
    },
    {
      id: "same-window",
      label: "Sources use the same window",
      passed:
        manifest.window === preview.window &&
        manifest.window === guardrails.window,
      critical: true,
      detail: `manifest=${manifest.window}, preview=${preview.window}, guardrails=${guardrails.window}`,
    },
    {
      id: "no-live-flags",
      label: "No live flags enabled",
      passed:
        config.automationEnabled === false &&
        config.liveEmailEnabled === false &&
        config.cronEnabled === false &&
        manifest.recipientPlan.liveEmailEnabled === false,
      critical: true,
      detail:
        "automationEnabled, liveEmailEnabled, cronEnabled and manifest liveEmailEnabled must all remain false.",
    },
  ];

  const liveReadinessStatus: AutomationPreLiveLiveStatus =
    checklistStatus === "blocked"
      ? "test_prep_blocked"
      : canStartLimitedInternalTestPrep
        ? "ready_for_limited_test_prep"
        : "live_blocked";
  const recommendedNextStep = buildRecommendedNextStep({
    checklistStatus,
    canAddManualApprovalMode,
  });

  return {
    schemaVersion: "automation-pre-live-checklist-v1",
    generatedAt: new Date().toISOString(),
    window: manifest.window,
    checklistStatus,
    liveReadinessStatus,
    overallScore,
    goNoGo: {
      canGoLive: false,
      canStartLimitedInternalTestPrep,
      canAddManualApprovalMode,
      reason:
        "Live automation is blocked by design until recipient policy, manual approval mode, provider strategy and cross-window validation are intentionally implemented.",
    },
    sourceSummary: {
      configSafetyMode: config.safetyMode,
      previewStatus: preview.previewStatus,
      guardrailStatus: guardrails.guardrailStatus,
      exportReadinessStatus: readiness.status,
      pdfHealthStatus: serverPdfQa?.status ?? "unavailable",
      dryRunStatus: manifest.status,
      safetyScore: guardrails.safetyScore,
    },
    categorySummaries,
    checklistItems,
    hardBlockers,
    criticalMissingItems,
    requiredBeforeLive: [
      ...new Set([
        ...config.requiredBeforeLive,
        ...checklistItems
          .filter((current) => current.liveBlocking)
          .map((current) => current.requiredAction),
      ]),
    ],
    allowedNextSteps: [
      "Review checklist JSON for 24h, 7d and 30d.",
      "Add Manual Approval Mode v1 as state/contract only.",
      "Keep Daily Brief export artifacts manual and inspectable.",
      "Prepare limited internal email test requirements only after approval mode exists.",
    ],
    disallowedActions: [
      "Do not send email.",
      "Do not create cron jobs or scheduled tasks.",
      "Do not add real recipients.",
      "Do not read recipient lists from environment variables.",
      "Do not write automation run history to the database.",
      "Do not add Send or Enable automation buttons.",
    ],
    integrityChecks,
    crossWindowSummary: {
      currentWindow: manifest.window,
      windowsToValidate,
      detail:
        "Pre-live readiness must be checked for 24h, 7d and 30d before any live-facing test design is accepted.",
    },
    recommendedNextStep,
  };
}
