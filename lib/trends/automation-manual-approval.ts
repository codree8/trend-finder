import type { AutomationConfigContract } from "@/lib/trends/automation-config";
import type { AutomationDryRunGuardrails } from "@/lib/trends/automation-dry-run-guardrails";
import type { AutomationDryRunManifest } from "@/lib/trends/automation-dry-run-manifest";
import type { AutomationPreLiveChecklist } from "@/lib/trends/automation-pre-live-checklist";
import type { AutomationPreviewConsole } from "@/lib/trends/automation-preview-console";
import type { ExportSystemReadiness } from "@/lib/trends/export-system-readiness";
import type { DashboardWindow } from "@/lib/trends/types";

export type AutomationManualApprovalMode = "simulation_only";

export type AutomationManualApprovalStatus =
  | "ready_for_review"
  | "review_required"
  | "blocked";

export type AutomationManualApprovalWorkflowState =
  | "draft_generated"
  | "pending_review"
  | "approved_for_test"
  | "blocked";

export type AutomationManualApprovalGateStatus = "pass" | "watch" | "fail";

export type AutomationManualApprovalSeverity =
  | "success"
  | "info"
  | "warning"
  | "danger";

export type AutomationManualApprovalGate = {
  id: string;
  label: string;
  status: AutomationManualApprovalGateStatus;
  severity: AutomationManualApprovalSeverity;
  critical: boolean;
  approvalBlocking: boolean;
  detail: string;
  evidence: string[];
  requiredAction: string;
};

export type AutomationManualApprovalReviewItem = {
  id: string;
  label: string;
  required: boolean;
  status: AutomationManualApprovalGateStatus;
  detail: string;
};

export type AutomationManualApprovalDecision = {
  approved: false;
  approvedForLive: false;
  approvedForLimitedInternalTest: false;
  canRecordApproval: false;
  requiresHumanReview: true;
  persistenceEnabled: false;
  detail: string;
};

export type AutomationManualApprovalReviewPacket = {
  window: DashboardWindow;
  subject: string;
  summary: string;
  previewStatus: AutomationPreviewConsole["previewStatus"];
  checklistStatus: AutomationPreLiveChecklist["checklistStatus"];
  guardrailStatus: AutomationDryRunGuardrails["guardrailStatus"];
  exportReadinessStatus: ExportSystemReadiness["status"];
  artifactCount: number;
  simulatedChannelCount: number;
  markdownCharacters: number;
  reviewerNote: string;
};

export type AutomationManualApprovalIntegrityCheck = {
  id: string;
  label: string;
  passed: boolean;
  critical: boolean;
  detail: string;
};

export type AutomationManualApproval = {
  schemaVersion: "automation-manual-approval-v1";
  generatedAt: string;
  window: DashboardWindow;
  approvalMode: AutomationManualApprovalMode;
  approvalStatus: AutomationManualApprovalStatus;
  workflowState: AutomationManualApprovalWorkflowState;
  summary: string;
  sourceSummary: {
    configSafetyMode: AutomationConfigContract["safetyMode"];
    checklistStatus: AutomationPreLiveChecklist["checklistStatus"];
    liveReadinessStatus: AutomationPreLiveChecklist["liveReadinessStatus"];
    previewStatus: AutomationPreviewConsole["previewStatus"];
    guardrailStatus: AutomationDryRunGuardrails["guardrailStatus"];
    exportReadinessStatus: ExportSystemReadiness["status"];
    dryRunStatus: AutomationDryRunManifest["status"];
    safetyScore: number;
    preLiveScore: number;
  };
  approvalDecision: AutomationManualApprovalDecision;
  reviewPacket: AutomationManualApprovalReviewPacket;
  reviewChecklist: AutomationManualApprovalReviewItem[];
  approvalGates: AutomationManualApprovalGate[];
  blockingReasons: string[];
  cannotApproveUntil: string[];
  allowedReviewerActions: string[];
  disallowedReviewerActions: string[];
  integrityChecks: AutomationManualApprovalIntegrityCheck[];
  crossWindowReview: {
    currentWindow: DashboardWindow;
    requiredWindows: DashboardWindow[];
    detail: string;
  };
  recommendedNextStep: string;
};

const requiredWindows: DashboardWindow[] = ["24h", "7d", "30d"];

function gate(input: AutomationManualApprovalGate) {
  return input;
}

function reviewItem(input: AutomationManualApprovalReviewItem) {
  return input;
}

function uniqueStrings(items: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      items
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function gateStatusTone(status: AutomationManualApprovalGateStatus) {
  if (status === "pass") return "success";
  if (status === "watch") return "warning";
  return "danger";
}

function buildApprovalStatus(gates: AutomationManualApprovalGate[]) {
  if (gates.some((item) => item.critical && item.status === "fail")) {
    return "blocked" satisfies AutomationManualApprovalStatus;
  }

  if (gates.some((item) => item.status === "watch")) {
    return "review_required" satisfies AutomationManualApprovalStatus;
  }

  return "ready_for_review" satisfies AutomationManualApprovalStatus;
}

function buildWorkflowState({
  status,
  canAddManualApprovalMode,
}: {
  status: AutomationManualApprovalStatus;
  canAddManualApprovalMode: boolean;
}): AutomationManualApprovalWorkflowState {
  if (status === "blocked") return "blocked";
  if (canAddManualApprovalMode) return "pending_review";
  return "draft_generated";
}

function buildSummary(status: AutomationManualApprovalStatus) {
  if (status === "blocked") {
    return "Manual approval is available as a diagnostic payload, but it is blocked from recording approval or moving toward test-send preparation.";
  }

  if (status === "review_required") {
    return "Manual approval is ready for human review, but warnings must be inspected before any future limited internal test prep.";
  }

  return "Manual approval is ready as a simulation-only review state. It still cannot persist approval, send email, schedule jobs or unlock live automation.";
}

function buildRecommendedNextStep({
  status,
  checklist,
}: {
  status: AutomationManualApprovalStatus;
  checklist: AutomationPreLiveChecklist;
}) {
  if (status === "blocked") {
    return "Keep automation dry-run only. Resolve blocking pre-live, preview, guardrail or config items before treating manual approval as reviewable.";
  }

  if (status === "review_required") {
    return "Open the manual approval payload for 24h, 7d and 30d, review warnings, then define what an internal reviewer must approve before test-send prep.";
  }

  if (checklist.goNoGo.canAddManualApprovalMode) {
    return "Next safe step: use this approval state as the contract for Limited Internal Email Test Prep v1. Still do not add provider, recipients or Send buttons in this step.";
  }

  return "Keep this approval mode as simulation-only until pre-live checklist explicitly allows the next automation layer.";
}

export function manualApprovalStatusTone(
  status: AutomationManualApprovalStatus,
) {
  if (status === "ready_for_review") return "positive";
  if (status === "review_required") return "warning";
  return "danger";
}

export function manualApprovalGateTone(
  status: AutomationManualApprovalGateStatus,
) {
  if (status === "pass") return "positive";
  if (status === "watch") return "warning";
  return "danger";
}

export function buildAutomationManualApproval({
  config,
  manifest,
  guardrails,
  preview,
  checklist,
  readiness,
}: {
  config: AutomationConfigContract;
  manifest: AutomationDryRunManifest;
  guardrails: AutomationDryRunGuardrails;
  preview: AutomationPreviewConsole;
  checklist: AutomationPreLiveChecklist;
  readiness: ExportSystemReadiness;
}): AutomationManualApproval {
  const configCriticalFailures = config.configIntegrityChecks.filter(
    (item) => item.critical && !item.passed,
  );
  const checklistBlockingFailures = checklist.checklistItems.filter(
    (item) => item.liveBlocking && item.status === "fail",
  );
  const previewCriticalFailures = preview.integrityChecks.filter(
    (item) => item.critical && !item.passed,
  );
  const noSideEffects =
    manifest.integrity.noEmailSent &&
    manifest.integrity.noCronCreated &&
    manifest.integrity.noDatabaseWrite &&
    manifest.wouldSendIfLive === false;
  const noLiveCapabilities =
    config.automationEnabled === false &&
    config.liveEmailEnabled === false &&
    config.cronEnabled === false &&
    manifest.recipientPlan.recipients.length === 0 &&
    manifest.triggerPlan.scheduledJobCreated === false;

  const approvalGates: AutomationManualApprovalGate[] = [
    gate({
      id: "pre-live-allows-manual-approval",
      label: "Pre-live checklist allows manual approval design",
      status: checklist.goNoGo.canAddManualApprovalMode ? "pass" : "watch",
      severity: checklist.goNoGo.canAddManualApprovalMode ? "success" : "warning",
      critical: true,
      approvalBlocking: !checklist.goNoGo.canAddManualApprovalMode,
      detail:
        "Manual approval may only exist after the pre-live checklist confirms the dry-run boundary and config contract are safe enough for a review-state layer.",
      evidence: [
        `checklistStatus: ${checklist.checklistStatus}`,
        `canAddManualApprovalMode: ${checklist.goNoGo.canAddManualApprovalMode}`,
        `preLiveScore: ${checklist.overallScore}`,
      ],
      requiredAction:
        "Resolve pre-live blockers before treating manual approval as the next step.",
    }),
    gate({
      id: "dry-run-side-effects-absent",
      label: "Dry-run side effects are absent",
      status: noSideEffects ? "pass" : "fail",
      severity: noSideEffects ? "success" : "danger",
      critical: true,
      approvalBlocking: !noSideEffects,
      detail:
        "Approval review must not be able to hide a broken dry-run boundary. No email, cron or database write can occur.",
      evidence: [
        `noEmailSent: ${manifest.integrity.noEmailSent}`,
        `noCronCreated: ${manifest.integrity.noCronCreated}`,
        `noDatabaseWrite: ${manifest.integrity.noDatabaseWrite}`,
        `wouldSendIfLive: ${manifest.wouldSendIfLive}`,
      ],
      requiredAction:
        "Restore dry-run invariants before exposing approval review state.",
    }),
    gate({
      id: "live-capabilities-blocked",
      label: "Live capabilities remain blocked",
      status: noLiveCapabilities ? "pass" : "fail",
      severity: noLiveCapabilities ? "success" : "danger",
      critical: true,
      approvalBlocking: !noLiveCapabilities,
      detail:
        "Approval mode must not enable automation, email, cron, scheduled jobs or recipients.",
      evidence: [
        `automationEnabled: ${config.automationEnabled}`,
        `liveEmailEnabled: ${config.liveEmailEnabled}`,
        `cronEnabled: ${config.cronEnabled}`,
        `recipients: ${manifest.recipientPlan.recipients.length}`,
        `scheduledJobCreated: ${manifest.triggerPlan.scheduledJobCreated}`,
      ],
      requiredAction:
        "Disable live capabilities and remove recipients before continuing.",
    }),
    gate({
      id: "preview-reviewable",
      label: "Preview console is reviewable",
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
      approvalBlocking: preview.previewStatus === "blocked",
      detail:
        "Manual approval should review the same preview console that summarizes dry-run, guardrails, exports and simulated email copy.",
      evidence: [
        `previewStatus: ${preview.previewStatus}`,
        `previewBlockers: ${preview.blockers.length}`,
        `previewRisks: ${preview.risks.length}`,
        `previewCriticalFailures: ${previewCriticalFailures.length}`,
      ],
      requiredAction:
        "Resolve preview blockers and inspect risks before approving a report for future test prep.",
    }),
    gate({
      id: "guardrails-safe",
      label: "Guardrails show no send risk",
      status: guardrails.simulatedSendRisk.level === "none" ? "pass" : "fail",
      severity:
        guardrails.simulatedSendRisk.level === "none" ? "success" : "danger",
      critical: true,
      approvalBlocking: guardrails.simulatedSendRisk.level !== "none",
      detail:
        "Approval mode cannot proceed if there is any plausible path to real delivery from the simulated flow.",
      evidence: [
        `guardrailStatus: ${guardrails.guardrailStatus}`,
        `simulatedSendRisk: ${guardrails.simulatedSendRisk.level}`,
        `safetyScore: ${guardrails.safetyScore}`,
      ],
      requiredAction:
        "Fix simulated send risk factors before allowing manual review.",
    }),
    gate({
      id: "config-contract-clean",
      label: "Config contract has no critical failures",
      status: configCriticalFailures.length === 0 ? "pass" : "fail",
      severity: configCriticalFailures.length === 0 ? "success" : "danger",
      critical: true,
      approvalBlocking: configCriticalFailures.length > 0,
      detail:
        "The central automation config must remain safe-by-default while approval mode exists as a computed contract.",
      evidence: [
        `safetyMode: ${config.safetyMode}`,
        `criticalConfigFailures: ${configCriticalFailures.length}`,
      ],
      requiredAction:
        "Fix config integrity before manual approval is considered reviewable.",
    }),
    gate({
      id: "export-readiness-reviewable",
      label: "Export readiness is reviewable",
      status:
        readiness.status === "blocked"
          ? "fail"
          : readiness.status === "review"
            ? "watch"
            : "pass",
      severity:
        readiness.status === "blocked"
          ? "danger"
          : readiness.status === "review"
            ? "warning"
            : "success",
      critical: true,
      approvalBlocking: readiness.status === "blocked",
      detail:
        "Approval should be based on stable export artifacts, because later internal email test prep will consume those outputs.",
      evidence: [
        `readinessStatus: ${readiness.status}`,
        `readinessScore: ${readiness.score}`,
        `automationStatus: ${readiness.automationStatus}`,
      ],
      requiredAction:
        "Fix blocked export readiness gates before approval review.",
    }),
    gate({
      id: "approval-is-not-persisted",
      label: "Approval state is not persisted",
      status: "pass",
      severity: "info",
      critical: false,
      approvalBlocking: false,
      detail:
        "This v1 does not write approval state to the database. The workflow state is computed for review and diagnostics only.",
      evidence: [
        "persistenceEnabled: false",
        "canRecordApproval: false",
        "databaseWrites: false",
      ],
      requiredAction:
        "Add persistence only in a later step after approval/run-history requirements are designed.",
    }),
  ];

  const approvalStatus = buildApprovalStatus(approvalGates);
  const workflowState = buildWorkflowState({
    status: approvalStatus,
    canAddManualApprovalMode: checklist.goNoGo.canAddManualApprovalMode,
  });
  const blockingReasons = uniqueStrings([
    ...approvalGates
      .filter((item) => item.approvalBlocking)
      .map((item) => item.label),
    ...checklistBlockingFailures.map((item) => item.label),
  ]);
  const cannotApproveUntil = uniqueStrings([
    ...approvalGates
      .filter((item) => item.status !== "pass" && item.critical)
      .map((item) => item.requiredAction),
    ...checklist.criticalMissingItems.map(
      (item) => `Resolve or explicitly classify: ${item}.`,
    ),
  ]);

  const reviewChecklist: AutomationManualApprovalReviewItem[] = [
    reviewItem({
      id: "review-brief-content",
      label: "Review Daily Brief content and executive summary",
      required: true,
      status: "watch",
      detail:
        "Human reviewer should inspect the brief narrative, priority actions, hidden gems, topics to avoid and recommended focus before any future approval is recorded.",
    }),
    reviewItem({
      id: "review-evidence-strength",
      label: "Review evidence strength and QA warnings",
      required: true,
      status: preview.previewStatus === "blocked" ? "fail" : "watch",
      detail:
        "Reviewer must inspect preview risks, guardrails and Daily Brief QA warnings instead of trusting the score blindly.",
    }),
    reviewItem({
      id: "review-artifacts",
      label: "Open HTML, JSON and PDF artifacts",
      required: true,
      status: readiness.status === "blocked" ? "fail" : "watch",
      detail:
        "Reviewer should open export artifacts manually. Approval mode does not attach or send them.",
    }),
    reviewItem({
      id: "confirm-no-recipients",
      label: "Confirm no recipients or provider are configured",
      required: true,
      status: noLiveCapabilities ? "pass" : "fail",
      detail:
        "Recipients, provider and scheduler must remain absent in Manual Approval Mode v1.",
    }),
    reviewItem({
      id: "cross-window-review",
      label: "Compare 24h, 7d and 30d approval payloads",
      required: true,
      status: "watch",
      detail:
        "Approval readiness should be checked across all supported windows before Limited Internal Email Test Prep.",
    }),
  ];

  const integrityChecks: AutomationManualApprovalIntegrityCheck[] = [
    {
      id: "schema-present",
      label: "Manual approval schema present",
      passed: true,
      critical: true,
      detail: "Schema version automation-manual-approval-v1 is generated in memory.",
    },
    {
      id: "same-window",
      label: "All sources use the same window",
      passed:
        manifest.window === preview.window &&
        manifest.window === guardrails.window &&
        manifest.window === checklist.window,
      critical: true,
      detail: `manifest=${manifest.window}, preview=${preview.window}, guardrails=${guardrails.window}, checklist=${checklist.window}`,
    },
    {
      id: "approval-not-recorded",
      label: "Approval is not recorded",
      passed: true,
      critical: true,
      detail:
        "This endpoint has no write path and returns canRecordApproval=false.",
    },
    {
      id: "no-send-action",
      label: "No send action exposed",
      passed:
        config.blockedCapabilities.some(
          (capability) => capability.id === "send_button" && capability.blocked,
        ) && manifest.wouldSendIfLive === false,
      critical: true,
      detail:
        "Manual approval mode has no Send or Enable automation action.",
    },
    {
      id: "no-live-delivery",
      label: "No live delivery enabled",
      passed: noLiveCapabilities && noSideEffects,
      critical: true,
      detail:
        "Automation, live email, cron, recipients, scheduled jobs and side effects remain disabled.",
    },
  ];

  return {
    schemaVersion: "automation-manual-approval-v1",
    generatedAt: new Date().toISOString(),
    window: manifest.window,
    approvalMode: "simulation_only",
    approvalStatus,
    workflowState,
    summary: buildSummary(approvalStatus),
    sourceSummary: {
      configSafetyMode: config.safetyMode,
      checklistStatus: checklist.checklistStatus,
      liveReadinessStatus: checklist.liveReadinessStatus,
      previewStatus: preview.previewStatus,
      guardrailStatus: guardrails.guardrailStatus,
      exportReadinessStatus: readiness.status,
      dryRunStatus: manifest.status,
      safetyScore: guardrails.safetyScore,
      preLiveScore: checklist.overallScore,
    },
    approvalDecision: {
      approved: false,
      approvedForLive: false,
      approvedForLimitedInternalTest: false,
      canRecordApproval: false,
      requiresHumanReview: true,
      persistenceEnabled: false,
      detail:
        "Manual Approval Mode v1 is diagnostic only. It can describe review readiness, but it cannot record approval, unlock sending or move automation into live mode.",
    },
    reviewPacket: {
      window: manifest.window,
      subject: preview.simulatedEmailPreview.subject,
      summary: preview.summary,
      previewStatus: preview.previewStatus,
      checklistStatus: checklist.checklistStatus,
      guardrailStatus: guardrails.guardrailStatus,
      exportReadinessStatus: readiness.status,
      artifactCount: preview.artifactLinks.length,
      simulatedChannelCount: preview.simulatedChannels.length,
      markdownCharacters: preview.simulatedEmailPreview.markdownCharacters,
      reviewerNote:
        "Reviewer can inspect this packet and artifacts, but no approval is persisted and no delivery action exists.",
    },
    reviewChecklist,
    approvalGates,
    blockingReasons,
    cannotApproveUntil,
    allowedReviewerActions: [
      "Open Daily Brief UI for human review.",
      "Open HTML, JSON and PDF artifacts manually.",
      "Inspect preview, guardrails, config and pre-live checklist JSON.",
      "Compare approval payloads for 24h, 7d and 30d.",
      "Document reviewer requirements for the later Limited Internal Email Test Prep step.",
    ],
    disallowedReviewerActions: [
      "Do not send email.",
      "Do not approve live automation.",
      "Do not add or load real recipients.",
      "Do not create cron jobs or scheduled tasks.",
      "Do not write approval state or run history to the database.",
      "Do not add Send or Enable automation buttons.",
    ],
    integrityChecks,
    crossWindowReview: {
      currentWindow: manifest.window,
      requiredWindows,
      detail:
        "Manual approval readiness must be reviewed for 24h, 7d and 30d before any limited internal email test prep is designed.",
    },
    recommendedNextStep: buildRecommendedNextStep({
      status: approvalStatus,
      checklist,
    }),
  };
}
