import type { AutomationConfigContract } from "@/lib/trends/automation-config";
import type { AutomationDryRunGuardrails } from "@/lib/trends/automation-dry-run-guardrails";
import type { AutomationDryRunManifest } from "@/lib/trends/automation-dry-run-manifest";
import type { AutomationManualApproval } from "@/lib/trends/automation-manual-approval";
import type { AutomationPreLiveChecklist } from "@/lib/trends/automation-pre-live-checklist";
import type { AutomationPreviewConsole } from "@/lib/trends/automation-preview-console";
import type { DailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import type { ExportSystemReadiness } from "@/lib/trends/export-system-readiness";
import type { DashboardWindow } from "@/lib/trends/types";

export type AutomationInternalEmailTestPrepMode =
  "manual_internal_test_prep_only";

export type AutomationInternalEmailTestPrepStatus =
  | "prep_ready"
  | "review"
  | "blocked";

export type AutomationInternalEmailTestPrepGateStatus =
  | "pass"
  | "watch"
  | "fail"
  | "planned";

export type AutomationInternalEmailTestPrepSeverity =
  | "success"
  | "info"
  | "warning"
  | "danger";

export type AutomationInternalEmailTestPrepGate = {
  id: string;
  label: string;
  status: AutomationInternalEmailTestPrepGateStatus;
  severity: AutomationInternalEmailTestPrepSeverity;
  critical: boolean;
  testBlocking: boolean;
  detail: string;
  evidence: string[];
  requiredAction: string;
};

export type AutomationInternalEmailAttachmentCandidate = {
  id: string;
  label: string;
  format: "html" | "pdf" | "json";
  href: string;
  status: "ready" | "review" | "blocked" | "diagnostic";
  requiredForFutureTest: boolean;
  detail: string;
};

export type AutomationInternalEmailRecipientPolicy = {
  configuredRecipients: [];
  recipientCount: 0;
  realRecipientsLoaded: false;
  envRecipientsLoaded: false;
  internalOnlyRequired: true;
  maxFutureInternalTestRecipients: 3;
  allowedRecipientSourceForFutureStep: "explicit_manual_config_only";
  currentStatus: "not_configured_by_design";
  detail: string;
};

export type AutomationInternalEmailProviderPolicy = {
  providerConfigured: false;
  providerName: null;
  sendCapabilityEnabled: false;
  liveEmailEnabled: false;
  providerSecretsRead: false;
  detail: string;
};

export type AutomationInternalEmailPackagePreview = {
  subject: string;
  preheader: string;
  headline: string;
  bodyPreview: string;
  quickCopyBullets: string[];
  markdownCharacters: number;
  attachmentCandidates: AutomationInternalEmailAttachmentCandidate[];
  wouldAttachPdfInFutureTest: boolean;
  wouldAttachHtmlFallbackInFutureTest: boolean;
  wouldSendNow: false;
};

export type AutomationInternalEmailTestPlan = {
  currentMode: "prep_only";
  allowedFutureMode: "manual_internal_test_only";
  manualSendOnly: true;
  cronAllowed: false;
  automationAllowed: false;
  requiresManualApprovalBeforeFutureSend: true;
  requiresExplicitInternalRecipientsBeforeFutureSend: true;
  requiresProviderBeforeFutureSend: true;
  requiresCrossWindowReviewBeforeFutureSend: true;
  detail: string;
};

export type AutomationInternalEmailTestPrepIntegrityCheck = {
  id: string;
  label: string;
  passed: boolean;
  critical: boolean;
  detail: string;
};

export type AutomationInternalEmailTestPrep = {
  schemaVersion: "automation-internal-email-test-prep-v1";
  generatedAt: string;
  window: DashboardWindow;
  prepMode: AutomationInternalEmailTestPrepMode;
  prepStatus: AutomationInternalEmailTestPrepStatus;
  summary: string;
  sourceSummary: {
    configSafetyMode: AutomationConfigContract["safetyMode"];
    manualApprovalStatus: AutomationManualApproval["approvalStatus"];
    manualWorkflowState: AutomationManualApproval["workflowState"];
    preLiveStatus: AutomationPreLiveChecklist["checklistStatus"];
    previewStatus: AutomationPreviewConsole["previewStatus"];
    guardrailStatus: AutomationDryRunGuardrails["guardrailStatus"];
    exportReadinessStatus: ExportSystemReadiness["status"];
    pdfHealthStatus: DailyBriefServerPdfReliabilityQa["status"] | "unavailable";
    safetyScore: number;
    preLiveScore: number;
  };
  testPlan: AutomationInternalEmailTestPlan;
  recipientPolicy: AutomationInternalEmailRecipientPolicy;
  providerPolicy: AutomationInternalEmailProviderPolicy;
  emailPackagePreview: AutomationInternalEmailPackagePreview;
  prepGates: AutomationInternalEmailTestPrepGate[];
  hardBlockers: string[];
  requiredBeforeInternalTestSend: string[];
  allowedPrepActions: string[];
  disallowedActions: string[];
  integrityChecks: AutomationInternalEmailTestPrepIntegrityCheck[];
  crossWindowValidation: {
    currentWindow: DashboardWindow;
    requiredWindows: DashboardWindow[];
    detail: string;
  };
  recommendedNextStep: string;
};

const requiredWindows: DashboardWindow[] = ["24h", "7d", "30d"];

function gate(
  input: AutomationInternalEmailTestPrepGate,
): AutomationInternalEmailTestPrepGate {
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

function buildPrepStatus(
  gates: AutomationInternalEmailTestPrepGate[],
): AutomationInternalEmailTestPrepStatus {
  if (gates.some((item) => item.testBlocking && item.status === "fail")) {
    return "blocked";
  }

  if (gates.some((item) => item.status === "watch" || item.status === "planned")) {
    return "review";
  }

  return "prep_ready";
}

function buildSummary(status: AutomationInternalEmailTestPrepStatus) {
  if (status === "blocked") {
    return "Limited internal email test preparation is blocked. The system still exposes no send path, provider, scheduler, recipients or persistence.";
  }

  if (status === "review") {
    return "Limited internal email test preparation is available as a planning contract, but recipient policy, provider strategy and future manual-send rules still need review.";
  }

  return "Limited internal email test preparation is ready as a prep-only contract. It still cannot send email or unlock automation.";
}

function buildRecommendedNextStep(status: AutomationInternalEmailTestPrepStatus) {
  if (status === "blocked") {
    return "Keep automation dry-run only. Resolve failed manual approval, guardrail, preview or export checks before defining any future internal-send path.";
  }

  if (status === "review") {
    return "Review this prep payload for 24h, 7d and 30d, then define explicit internal recipients and provider requirements in a separate manual test-send step.";
  }

  return "Next safe step: design a disabled-by-default manual internal send contract. Still do not send, schedule, persist or load recipients automatically.";
}

function buildAttachmentCandidates(
  preview: AutomationPreviewConsole,
): AutomationInternalEmailAttachmentCandidate[] {
  const desiredIds = new Set([
    "pdf_download",
    "html_download",
    "json_report_document",
  ]);

  return preview.artifactLinks
    .filter((item) => desiredIds.has(item.id))
    .map((item) => ({
      id: item.id,
      label: item.label,
      format: item.format as "html" | "pdf" | "json",
      href: item.href,
      status: item.status,
      requiredForFutureTest: item.id === "pdf_download",
      detail: item.detail,
    }));
}

export function internalEmailTestPrepStatusTone(
  status: AutomationInternalEmailTestPrepStatus,
) {
  if (status === "prep_ready") return "positive";
  if (status === "review") return "warning";
  return "danger";
}

export function internalEmailTestPrepGateTone(
  status: AutomationInternalEmailTestPrepGateStatus,
) {
  if (status === "pass") return "positive";
  if (status === "watch" || status === "planned") return "warning";
  return "danger";
}

export function buildAutomationInternalEmailTestPrep({
  config,
  manifest,
  guardrails,
  preview,
  checklist,
  manualApproval,
  readiness,
  serverPdfQa,
}: {
  config: AutomationConfigContract;
  manifest: AutomationDryRunManifest;
  guardrails: AutomationDryRunGuardrails;
  preview: AutomationPreviewConsole;
  checklist: AutomationPreLiveChecklist;
  manualApproval: AutomationManualApproval;
  readiness: ExportSystemReadiness;
  serverPdfQa: DailyBriefServerPdfReliabilityQa | null;
}): AutomationInternalEmailTestPrep {
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
    manifest.recipientPlan.liveEmailEnabled === false &&
    manifest.triggerPlan.scheduledJobCreated === false;
  const manualApprovalReviewable =
    manualApproval.schemaVersion === "automation-manual-approval-v1" &&
    manualApproval.approvalStatus !== "blocked";
  const previewReviewable = preview.previewStatus !== "blocked";
  const exportReviewable = readiness.status !== "blocked";
  const pdfCandidateReady = serverPdfQa
    ? serverPdfQa.status === "healthy" || serverPdfQa.status === "review"
    : false;
  const attachmentCandidates = buildAttachmentCandidates(preview);
  const requiredAttachmentCandidate = attachmentCandidates.find(
    (item) => item.id === "pdf_download",
  );

  const prepGates: AutomationInternalEmailTestPrepGate[] = [
    gate({
      id: "manual-approval-reviewable",
      label: "Manual approval contract is reviewable",
      status: manualApprovalReviewable ? "pass" : "fail",
      severity: manualApprovalReviewable ? "success" : "danger",
      critical: true,
      testBlocking: !manualApprovalReviewable,
      detail:
        "Internal email test prep must be downstream of Manual Approval Mode, even though approval is not persisted and cannot send anything in this version.",
      evidence: [
        `approvalStatus: ${manualApproval.approvalStatus}`,
        `workflowState: ${manualApproval.workflowState}`,
        `canRecordApproval: ${manualApproval.approvalDecision.canRecordApproval}`,
      ],
      requiredAction:
        "Resolve manual approval blockers before defining any future internal test-send package.",
    }),
    gate({
      id: "dry-run-side-effects-absent",
      label: "Dry-run side effects are absent",
      status: noSideEffects ? "pass" : "fail",
      severity: noSideEffects ? "success" : "danger",
      critical: true,
      testBlocking: !noSideEffects,
      detail:
        "Prep cannot continue if the existing dry-run boundary fails. No email, cron or database write can occur.",
      evidence: [
        `noEmailSent: ${manifest.integrity.noEmailSent}`,
        `noCronCreated: ${manifest.integrity.noCronCreated}`,
        `noDatabaseWrite: ${manifest.integrity.noDatabaseWrite}`,
        `wouldSendIfLive: ${manifest.wouldSendIfLive}`,
      ],
      requiredAction:
        "Restore dry-run no-side-effect guarantees before continuing.",
    }),
    gate({
      id: "live-capabilities-disabled",
      label: "Live capabilities stay disabled",
      status: noLiveCapabilities ? "pass" : "fail",
      severity: noLiveCapabilities ? "success" : "danger",
      critical: true,
      testBlocking: !noLiveCapabilities,
      detail:
        "This prep layer cannot enable automation, live email, cron, scheduled jobs or recipients.",
      evidence: [
        `automationEnabled: ${config.automationEnabled}`,
        `liveEmailEnabled: ${config.liveEmailEnabled}`,
        `cronEnabled: ${config.cronEnabled}`,
        `recipients: ${manifest.recipientPlan.recipients.length}`,
        `scheduledJobCreated: ${manifest.triggerPlan.scheduledJobCreated}`,
      ],
      requiredAction:
        "Disable live capabilities and remove recipients before generating test prep.",
    }),
    gate({
      id: "send-risk-none",
      label: "Guardrails report zero send risk",
      status: guardrails.simulatedSendRisk.level === "none" ? "pass" : "fail",
      severity:
        guardrails.simulatedSendRisk.level === "none" ? "success" : "danger",
      critical: true,
      testBlocking: guardrails.simulatedSendRisk.level !== "none",
      detail:
        "There must be no plausible path from this prep payload to real delivery.",
      evidence: [
        `simulatedSendRisk: ${guardrails.simulatedSendRisk.level}`,
        `safetyScore: ${guardrails.safetyScore}`,
        `riskFactors: ${guardrails.simulatedSendRisk.riskFactors.length}`,
      ],
      requiredAction:
        "Fix guardrail send-risk factors before preparing an internal test package.",
    }),
    gate({
      id: "preview-reviewable",
      label: "Preview console is reviewable",
      status: previewReviewable
        ? preview.previewStatus === "review"
          ? "watch"
          : "pass"
        : "fail",
      severity: previewReviewable
        ? preview.previewStatus === "review"
          ? "warning"
          : "success"
        : "danger",
      critical: true,
      testBlocking: !previewReviewable,
      detail:
        "The future internal email test should use the same preview package: subject, body preview, links and artifact candidates.",
      evidence: [
        `previewStatus: ${preview.previewStatus}`,
        `blockers: ${preview.blockers.length}`,
        `risks: ${preview.risks.length}`,
      ],
      requiredAction:
        "Resolve preview blockers and review warnings before preparing test-send requirements.",
    }),
    gate({
      id: "export-package-reviewable",
      label: "Export package is reviewable",
      status: exportReviewable
        ? readiness.status === "review"
          ? "watch"
          : "pass"
        : "fail",
      severity: exportReviewable
        ? readiness.status === "review"
          ? "warning"
          : "success"
        : "danger",
      critical: true,
      testBlocking: !exportReviewable,
      detail:
        "HTML, JSON and PDF artifacts must be usable before any future internal email test references them.",
      evidence: [
        `readinessStatus: ${readiness.status}`,
        `readinessScore: ${readiness.score}`,
        `automationReadinessScore: ${readiness.automationReadinessScore}`,
      ],
      requiredAction:
        "Fix export readiness blockers before preparing internal email test artifacts.",
    }),
    gate({
      id: "pdf-candidate-available",
      label: "PDF attachment candidate is available",
      status: pdfCandidateReady ? "pass" : "watch",
      severity: pdfCandidateReady ? "success" : "warning",
      critical: false,
      testBlocking: false,
      detail:
        "A future internal email test can reference the server PDF only after PDF health remains available and reviewable.",
      evidence: [
        `pdfHealthStatus: ${serverPdfQa?.status ?? "unavailable"}`,
        `pdfScore: ${serverPdfQa?.score ?? "n/a"}`,
        `pdfArtifactStatus: ${requiredAttachmentCandidate?.status ?? "missing"}`,
      ],
      requiredAction:
        "Review PDF health before attaching the PDF in a later manual internal test.",
    }),
    gate({
      id: "recipient-policy-not-configured",
      label: "Recipient policy remains prep-only",
      status: "planned",
      severity: "warning",
      critical: true,
      testBlocking: false,
      detail:
        "Recipients are intentionally empty in this step. The next send-capable step must define explicit internal-only addresses manually.",
      evidence: [
        `currentRecipients: ${config.recipients.length}`,
        `recipientsAllowed: ${config.recipientPolicy.recipientsAllowed}`,
        `envRecipientsAllowed: ${config.recipientPolicy.envRecipientsAllowed}`,
      ],
      requiredAction:
        "Define explicit internal-only test recipients in a later step; do not read them from env in this prep layer.",
    }),
    gate({
      id: "provider-not-configured",
      label: "Email provider remains absent",
      status: "planned",
      severity: "warning",
      critical: true,
      testBlocking: false,
      detail:
        "No external provider is configured or called. This step only describes what the future provider boundary must enforce.",
      evidence: [
        `liveEmailEnabled: ${config.liveEmailEnabled}`,
        "providerConfigured: false",
        "providerSecretsRead: false",
      ],
      requiredAction:
        "Choose and configure a provider only in a later manual internal send step, with sending disabled by default.",
    }),
    gate({
      id: "send-ui-absent",
      label: "Send UI remains absent",
      status: config.blockedCapabilities.some(
        (capability) => capability.id === "send_button" && capability.blocked,
      )
        ? "pass"
        : "fail",
      severity: config.blockedCapabilities.some(
        (capability) => capability.id === "send_button" && capability.blocked,
      )
        ? "success"
        : "danger",
      critical: true,
      testBlocking: !config.blockedCapabilities.some(
        (capability) => capability.id === "send_button" && capability.blocked,
      ),
      detail:
        "The UI may expose prep JSON and review links only. It must not expose Send, Test Send or Enable Automation controls in this version.",
      evidence: ["sendButtonBlockedByConfig: true"],
      requiredAction:
        "Remove send-capable UI before shipping this prep layer.",
    }),
  ];

  const prepStatus = buildPrepStatus(prepGates);
  const hardBlockers = uniqueStrings(
    prepGates
      .filter((item) => item.testBlocking && item.status === "fail")
      .map((item) => item.label),
  );
  const requiredBeforeInternalTestSend = uniqueStrings([
    ...prepGates
      .filter((item) => item.status !== "pass" && item.critical)
      .map((item) => item.requiredAction),
    "Record a human approval decision in a deliberate future persistence layer, or explicitly keep the first test as non-persistent manual-only.",
    "Add a provider boundary that defaults to disabled and refuses cron-triggered sends.",
    "Add explicit internal-only recipients manually; do not load recipients from environment variables or user input.",
  ]);

  const integrityChecks: AutomationInternalEmailTestPrepIntegrityCheck[] = [
    {
      id: "same-window",
      label: "All source payloads use the same window",
      passed:
        manifest.window === preview.window &&
        manifest.window === guardrails.window &&
        manifest.window === checklist.window &&
        manifest.window === manualApproval.window,
      critical: true,
      detail: `manifest=${manifest.window}, preview=${preview.window}, guardrails=${guardrails.window}, checklist=${checklist.window}, manualApproval=${manualApproval.window}`,
    },
    {
      id: "no-provider-configured",
      label: "No email provider configured",
      passed: true,
      critical: true,
      detail:
        "Provider policy is hardcoded to providerConfigured=false and providerSecretsRead=false.",
    },
    {
      id: "no-recipients-loaded",
      label: "No recipients loaded",
      passed: config.recipients.length === 0 && manifest.recipientPlan.recipients.length === 0,
      critical: true,
      detail:
        "This prep layer does not read recipient lists from env, database or UI input.",
    },
    {
      id: "no-send-action",
      label: "No send action exposed",
      passed: noSideEffects && noLiveCapabilities,
      critical: true,
      detail:
        "No send function, cron trigger, scheduled task or database write is reachable from this payload.",
    },
    {
      id: "manual-approval-not-used-as-send-permission",
      label: "Manual approval does not grant send permission",
      passed:
        manualApproval.approvalDecision.approved === false &&
        manualApproval.approvalDecision.approvedForLive === false &&
        manualApproval.approvalDecision.approvedForLimitedInternalTest === false,
      critical: true,
      detail:
        "Manual Approval Mode v1 remains diagnostic and cannot unlock delivery.",
    },
  ];

  return {
    schemaVersion: "automation-internal-email-test-prep-v1",
    generatedAt: new Date().toISOString(),
    window: manifest.window,
    prepMode: "manual_internal_test_prep_only",
    prepStatus,
    summary: buildSummary(prepStatus),
    sourceSummary: {
      configSafetyMode: config.safetyMode,
      manualApprovalStatus: manualApproval.approvalStatus,
      manualWorkflowState: manualApproval.workflowState,
      preLiveStatus: checklist.checklistStatus,
      previewStatus: preview.previewStatus,
      guardrailStatus: guardrails.guardrailStatus,
      exportReadinessStatus: readiness.status,
      pdfHealthStatus: serverPdfQa?.status ?? "unavailable",
      safetyScore: guardrails.safetyScore,
      preLiveScore: checklist.overallScore,
    },
    testPlan: {
      currentMode: "prep_only",
      allowedFutureMode: "manual_internal_test_only",
      manualSendOnly: true,
      cronAllowed: false,
      automationAllowed: false,
      requiresManualApprovalBeforeFutureSend: true,
      requiresExplicitInternalRecipientsBeforeFutureSend: true,
      requiresProviderBeforeFutureSend: true,
      requiresCrossWindowReviewBeforeFutureSend: true,
      detail:
        "This step prepares the contract for a future manual internal email test. It does not add the provider, recipients, send action, scheduler or persistence.",
    },
    recipientPolicy: {
      configuredRecipients: [],
      recipientCount: 0,
      realRecipientsLoaded: false,
      envRecipientsLoaded: false,
      internalOnlyRequired: true,
      maxFutureInternalTestRecipients: 3,
      allowedRecipientSourceForFutureStep: "explicit_manual_config_only",
      currentStatus: "not_configured_by_design",
      detail:
        "Future internal test recipients must be explicitly configured in a later step and must remain internal-only. This layer intentionally has zero recipients.",
    },
    providerPolicy: {
      providerConfigured: false,
      providerName: null,
      sendCapabilityEnabled: false,
      liveEmailEnabled: false,
      providerSecretsRead: false,
      detail:
        "No provider SDK/API is imported, configured or called. Provider selection belongs to the next disabled-by-default manual test step.",
    },
    emailPackagePreview: {
      subject: preview.simulatedEmailPreview.subject,
      preheader: preview.simulatedEmailPreview.preheader,
      headline: preview.simulatedEmailPreview.headline,
      bodyPreview: preview.simulatedEmailPreview.bodyPreview,
      quickCopyBullets: preview.simulatedEmailPreview.quickCopyBullets,
      markdownCharacters: preview.simulatedEmailPreview.markdownCharacters,
      attachmentCandidates,
      wouldAttachPdfInFutureTest: Boolean(requiredAttachmentCandidate),
      wouldAttachHtmlFallbackInFutureTest: attachmentCandidates.some(
        (item) => item.id === "html_download",
      ),
      wouldSendNow: false,
    },
    prepGates,
    hardBlockers,
    requiredBeforeInternalTestSend,
    allowedPrepActions: [
      "Open this prep JSON for 24h, 7d and 30d.",
      "Review the simulated subject, preheader, body preview and attachment candidates.",
      "Document the future internal-only recipient policy.",
      "Document the future provider boundary with sending disabled by default.",
      "Keep the next step manual-only; do not add cron or automation scheduling.",
    ],
    disallowedActions: [
      "Do not send email.",
      "Do not configure a real provider in this prep layer.",
      "Do not add real recipients or read recipients from environment variables.",
      "Do not add Test Send, Send or Enable Automation buttons.",
      "Do not create cron jobs, scheduled tasks or background workers.",
      "Do not write approval state, recipient policy or run history to the database.",
    ],
    integrityChecks,
    crossWindowValidation: {
      currentWindow: manifest.window,
      requiredWindows,
      detail:
        "Internal email test prep must be compared across 24h, 7d and 30d before any future send-capable manual test is added.",
    },
    recommendedNextStep: buildRecommendedNextStep(prepStatus),
  };
}
