import {
  buildDailyBriefAutomationDryRunUrl,
  buildDailyBriefAutomationGuardrailsUrl,
  buildDailyBriefExportReadinessUrl,
} from "@/lib/trends/daily-brief-export-links";
import type { AutomationDryRunManifest } from "@/lib/trends/automation-dry-run-manifest";
import type { ExportSystemReadiness } from "@/lib/trends/export-system-readiness";
import type { DashboardWindow } from "@/lib/trends/types";

export type AutomationDryRunGuardrailStatus = "safe" | "review" | "blocked";

export type AutomationLiveAutomationStatus =
  | "blocked"
  | "not_configured"
  | "ready_for_dry_run_only"
  | "ready_for_limited_test";

export type AutomationDryRunGuardrailCheckStatus =
  | "pass"
  | "watch"
  | "fail"
  | "protected";

export type AutomationDryRunGuardrailSeverity =
  | "success"
  | "info"
  | "warning"
  | "danger";

export type AutomationDryRunRiskLevel = "none" | "low" | "medium" | "high";

export type AutomationDryRunCriticalGuardrail = {
  id: string;
  label: string;
  status: AutomationDryRunGuardrailCheckStatus;
  severity: AutomationDryRunGuardrailSeverity;
  critical: boolean;
  detail: string;
  recommendedAction: string;
};

export type AutomationDryRunBlockerPolicy = {
  mode: "fail_closed";
  liveActionsAllowed: false;
  sendActionAvailable: false;
  schedulerActionAvailable: false;
  databaseWriteAllowed: false;
  recipientConfigurationAllowed: false;
  blockedBy: string[];
  detail: string;
};

export type AutomationDryRunSimulatedSendRisk = {
  level: AutomationDryRunRiskLevel;
  score: number;
  hasAnyLiveSendPath: boolean;
  hasRealRecipients: boolean;
  hasScheduler: boolean;
  hasDatabaseWrite: boolean;
  riskFactors: string[];
  mitigations: string[];
  summary: string;
};

export type AutomationDryRunChannelReadiness = {
  summary: string;
  counts: Record<"ready" | "review" | "blocked" | "planned", number>;
  allLiveDeliveryDisabled: boolean;
  channels: Array<{
    id: AutomationDryRunManifest["deliveryChannels"][number]["id"];
    label: string;
    role: AutomationDryRunManifest["deliveryChannels"][number]["role"];
    status: AutomationDryRunManifest["deliveryChannels"][number]["status"];
    liveDeliveryEnabled: false;
    wouldIncludeInLiveRun: boolean;
    risk: AutomationDryRunRiskLevel;
    detail: string;
  }>;
};

export type AutomationDryRunArtifactReadiness = {
  summary: string;
  requiredReady: number;
  requiredReview: number;
  requiredBlocked: number;
  optionalReady: number;
  artifacts: Array<{
    id: AutomationDryRunManifest["artifacts"][number]["id"];
    label: string;
    format: AutomationDryRunManifest["artifacts"][number]["format"];
    status: AutomationDryRunManifest["artifacts"][number]["status"];
    requiredForLiveRun: boolean;
    href: string;
  }>;
};

export type AutomationDryRunExportReadinessSummary = {
  status: ExportSystemReadiness["status"];
  automationStatus: ExportSystemReadiness["automationStatus"];
  score: number;
  manualExportScore: number;
  automationReadinessScore: number;
  criticalBlockers: number;
  warnings: number;
  summary: string;
  recommendedNextStep: string;
};

export type AutomationDryRunIntegrityCheck = {
  id: string;
  label: string;
  passed: boolean;
  critical: boolean;
  detail: string;
};

export type AutomationDryRunCrossWindowSummary = {
  currentWindow: DashboardWindow;
  requiredWindows: Array<{
    window: DashboardWindow;
    isCurrent: boolean;
    dryRunManifestUrl: string;
    guardrailsUrl: string;
    readinessUrl: string;
  }>;
  validationRequiredBeforeLive: true;
  detail: string;
};

export type AutomationDryRunGuardrails = {
  schemaVersion: "automation-dry-run-guardrails-v1";
  generatedAt: string;
  window: DashboardWindow;
  guardrailStatus: AutomationDryRunGuardrailStatus;
  liveAutomationStatus: AutomationLiveAutomationStatus;
  safetyScore: number;
  criticalGuardrails: AutomationDryRunCriticalGuardrail[];
  blockerPolicy: AutomationDryRunBlockerPolicy;
  cannotGoLiveUntil: string[];
  simulatedSendRisk: AutomationDryRunSimulatedSendRisk;
  channelReadiness: AutomationDryRunChannelReadiness;
  artifactReadiness: AutomationDryRunArtifactReadiness;
  exportReadinessSummary: AutomationDryRunExportReadinessSummary;
  dryRunIntegrityChecks: AutomationDryRunIntegrityCheck[];
  crossWindowSummary: AutomationDryRunCrossWindowSummary;
  recommendedNextStep: string;
};

const windowsToValidate: DashboardWindow[] = ["24h", "7d", "30d"];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countByStatus<TStatus extends string, TItem extends { status: TStatus }>(
  items: TItem[],
  statuses: readonly TStatus[],
): Record<TStatus, number> {
  return statuses.reduce(
    (counts, status) => ({
      ...counts,
      [status]: items.filter((item) => item.status === status).length,
    }),
    {} as Record<TStatus, number>,
  );
}

function check({
  id,
  label,
  passed,
  critical,
  detail,
}: AutomationDryRunIntegrityCheck): AutomationDryRunIntegrityCheck {
  return { id, label, passed, critical, detail };
}

function guardrail({
  id,
  label,
  status,
  severity,
  critical,
  detail,
  recommendedAction,
}: AutomationDryRunCriticalGuardrail): AutomationDryRunCriticalGuardrail {
  return {
    id,
    label,
    status,
    severity,
    critical,
    detail,
    recommendedAction,
  };
}

function checkStatus(
  passed: boolean,
): AutomationDryRunGuardrailCheckStatus {
  return passed ? "protected" : "fail";
}

function checkSeverity(passed: boolean): AutomationDryRunGuardrailSeverity {
  return passed ? "success" : "danger";
}

function riskFromChannel(
  channel: AutomationDryRunManifest["deliveryChannels"][number],
): AutomationDryRunRiskLevel {
  if (channel.liveDeliveryEnabled) return "high";
  if (channel.status === "blocked") return "low";
  if (channel.id === "email_summary" || channel.status === "planned") {
    return "low";
  }

  return "none";
}

function buildRecommendedNextStep(
  status: AutomationDryRunGuardrailStatus,
  liveAutomationStatus: AutomationLiveAutomationStatus,
) {
  if (status === "blocked") {
    return "Do not design live automation yet. Fix the failed guardrails and export blockers first.";
  }

  if (status === "review") {
    return "Keep this as a dry-run only. Review warnings, compare the 24h, 7d and 30d guardrail payloads, then repeat the check.";
  }

  if (liveAutomationStatus === "ready_for_dry_run_only") {
    return "Dry-run guardrails are safe enough for simulation. The next step should be a limited send-preview design, still without real recipients or scheduled delivery.";
  }

  return "Keep the automation boundary closed until live configuration is explicitly designed and approved.";
}

export function guardrailStatusTone(status: AutomationDryRunGuardrailStatus) {
  if (status === "safe") return "positive";
  if (status === "review") return "warning";
  return "danger";
}

export function buildAutomationDryRunGuardrails({
  manifest,
  readiness,
}: {
  manifest: AutomationDryRunManifest;
  readiness: ExportSystemReadiness;
}): AutomationDryRunGuardrails {
  const hasRealRecipients = manifest.recipientPlan.recipients.length > 0;
  const hasLiveEmail = manifest.recipientPlan.liveEmailEnabled;
  const hasScheduler =
    manifest.triggerPlan.cronEnabled || manifest.triggerPlan.scheduledJobCreated;
  const hasDatabaseWrite = !manifest.integrity.noDatabaseWrite;
  const hasAnyLiveDeliveryChannel = manifest.deliveryChannels.some(
    (channel) => channel.liveDeliveryEnabled,
  );
  const wouldSendIfLive = manifest.wouldSendIfLive;

  const integrityChecks: AutomationDryRunIntegrityCheck[] = [
    check({
      id: "dry-run-flag",
      label: "Dry-run flag is locked",
      passed: manifest.dryRun === true,
      critical: true,
      detail: "The manifest must always declare dryRun: true for this phase.",
    }),
    check({
      id: "no-send-intent",
      label: "No send intent",
      passed: wouldSendIfLive === false,
      critical: true,
      detail: "wouldSendIfLive must stay false until a separate live-delivery step exists.",
    }),
    check({
      id: "no-email-sent",
      label: "No email sent",
      passed: manifest.integrity.noEmailSent === true && !hasLiveEmail,
      critical: true,
      detail: "The current flow must not call SMTP, email APIs or provider SDKs.",
    }),
    check({
      id: "no-real-recipients",
      label: "No real recipients",
      passed: !hasRealRecipients,
      critical: true,
      detail: "Recipients must remain empty in dry-run guardrail mode.",
    }),
    check({
      id: "no-live-delivery-channel",
      label: "No live delivery channel",
      passed: !hasAnyLiveDeliveryChannel,
      critical: true,
      detail: "Every delivery channel must keep liveDeliveryEnabled disabled.",
    }),
    check({
      id: "no-cron-created",
      label: "No cron or scheduler",
      passed: manifest.integrity.noCronCreated === true && !hasScheduler,
      critical: true,
      detail: "The route may generate JSON only; it must not create schedules.",
    }),
    check({
      id: "no-database-write",
      label: "No database write",
      passed: !hasDatabaseWrite,
      critical: true,
      detail: "Dry-run guardrails may inspect generated data but must not persist report runs.",
    }),
    check({
      id: "manifest-contract",
      label: "Generated from reportDocument",
      passed: manifest.integrity.generatedFromReportDocument === true,
      critical: true,
      detail: "The payload must be generated from the stable reportDocument contract.",
    }),
    check({
      id: "readiness-not-blocked",
      label: "Export readiness is not blocked",
      passed: readiness.status !== "blocked" && readiness.metrics.criticalBlockers === 0,
      critical: false,
      detail: "Export readiness can be review/safe for dry-run, but blockers stop live automation design.",
    }),
  ];

  const criticalFailures = integrityChecks.filter(
    (item) => item.critical && !item.passed,
  );
  const readinessBlockers = readiness.gates.filter(
    (item) => item.status === "fail" && item.automationBlocking,
  );
  const manifestBlockers = manifest.gates.filter(
    (item) => item.status === "fail" && item.automationBlocking,
  );
  const reviewGates = [
    ...manifest.gates.filter((item) => item.status === "watch"),
    ...readiness.gates.filter((item) => item.status === "watch"),
  ];

  const criticalGuardrails: AutomationDryRunCriticalGuardrail[] = [
    ...integrityChecks
      .filter((item) => item.critical)
      .map((item) =>
        guardrail({
          id: item.id,
          label: item.label,
          status: checkStatus(item.passed),
          severity: checkSeverity(item.passed),
          critical: item.critical,
          detail: item.detail,
          recommendedAction: item.passed
            ? "Keep this guardrail locked while the automation stays in dry-run mode."
            : "Stop immediately and remove any live side effect before continuing.",
        }),
      ),
    guardrail({
      id: "export-readiness-boundary",
      label: "Export readiness boundary",
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
      critical: false,
      detail: readiness.summary,
      recommendedAction: readiness.recommendedNextStep,
    }),
    guardrail({
      id: "manifest-readiness-boundary",
      label: "Manifest readiness boundary",
      status:
        manifest.status === "blocked"
          ? "fail"
          : manifest.status === "review"
            ? "watch"
            : "pass",
      severity:
        manifest.status === "blocked"
          ? "danger"
          : manifest.status === "review"
            ? "warning"
            : "success",
      critical: false,
      detail: manifest.summary,
      recommendedAction: manifest.recommendedNextStep,
    }),
  ];

  const blockedBy = Array.from(
    new Set([
      ...criticalFailures.map((item) => item.label),
      ...readinessBlockers.map((item) => item.label),
      ...manifestBlockers.map((item) => item.label),
      ...manifest.blockers,
    ]),
  );

  const riskFactors = [
    hasRealRecipients ? "Real recipients are configured." : null,
    hasLiveEmail ? "Live email delivery is enabled." : null,
    hasScheduler ? "A cron/scheduler path is enabled." : null,
    hasDatabaseWrite ? "A dry-run path is writing to the database." : null,
    hasAnyLiveDeliveryChannel ? "At least one channel has liveDeliveryEnabled=true." : null,
    wouldSendIfLive ? "The manifest says it would send if live." : null,
  ].filter((item): item is string => Boolean(item));

  const riskScore = clampScore(
    riskFactors.length * 28 + criticalFailures.length * 18 + blockedBy.length * 5,
  );
  const riskLevel: AutomationDryRunRiskLevel =
    riskScore >= 70
      ? "high"
      : riskScore >= 35
        ? "medium"
        : riskScore > 0
          ? "low"
          : "none";

  const guardrailStatus: AutomationDryRunGuardrailStatus =
    criticalFailures.length > 0 || readiness.status === "blocked" || manifest.status === "blocked"
      ? "blocked"
      : readiness.status === "review" || manifest.status === "review" || reviewGates.length > 0
        ? "review"
        : "safe";

  const liveAutomationStatus: AutomationLiveAutomationStatus =
    guardrailStatus === "blocked"
      ? "blocked"
      : hasLiveEmail || hasRealRecipients || hasScheduler
        ? "ready_for_limited_test"
        : guardrailStatus === "safe" || guardrailStatus === "review"
          ? "ready_for_dry_run_only"
          : "not_configured";

  const safetyScore = clampScore(
    100 -
      criticalFailures.length * 30 -
      readinessBlockers.length * 16 -
      manifestBlockers.length * 16 -
      reviewGates.length * 3 -
      riskScore * 0.35 -
      readiness.metrics.warnings * 2,
  );

  const channelCounts = countByStatus(manifest.deliveryChannels, [
    "ready",
    "review",
    "blocked",
    "planned",
  ] as const);
  const requiredArtifacts = manifest.artifacts.filter(
    (artifact) => artifact.requiredForLiveRun,
  );
  const optionalArtifacts = manifest.artifacts.filter(
    (artifact) => !artifact.requiredForLiveRun,
  );

  const cannotGoLiveUntil = [
    "A separate live automation design introduces an explicit approval step before any send action.",
    "Recipient configuration is created intentionally, reviewed, and kept out of dry-run defaults.",
    "Email provider integration is isolated from this dry-run route and protected by environment flags.",
    "Cron/scheduler setup is added as a separate, visible configuration step — not as a side effect of this endpoint.",
    "Report persistence/audit history exists for scheduled runs before recurring delivery is allowed.",
    "24h, 7d and 30d guardrail JSON outputs are reviewed with no critical failures.",
    ...blockedBy.map((item) => `Blocking issue resolved: ${item}`),
  ];

  return {
    schemaVersion: "automation-dry-run-guardrails-v1",
    generatedAt: new Date().toISOString(),
    window: manifest.window,
    guardrailStatus,
    liveAutomationStatus,
    safetyScore,
    criticalGuardrails,
    blockerPolicy: {
      mode: "fail_closed",
      liveActionsAllowed: false,
      sendActionAvailable: false,
      schedulerActionAvailable: false,
      databaseWriteAllowed: false,
      recipientConfigurationAllowed: false,
      blockedBy,
      detail:
        blockedBy.length > 0
          ? "Live automation is blocked by failing guardrails or export readiness gates. The API remains inspection-only."
          : "No live actions are exposed. This guardrail layer fails closed and only returns JSON diagnostics.",
    },
    cannotGoLiveUntil,
    simulatedSendRisk: {
      level: riskLevel,
      score: riskScore,
      hasAnyLiveSendPath: hasAnyLiveDeliveryChannel || hasLiveEmail || wouldSendIfLive,
      hasRealRecipients,
      hasScheduler,
      hasDatabaseWrite,
      riskFactors,
      mitigations: manifest.safeguards,
      summary:
        riskLevel === "none"
          ? "No real send path is reachable from the current dry-run manifest. This is simulation only."
          : "One or more dry-run boundaries changed. Treat the automation layer as unsafe until the listed risk factors are removed.",
    },
    channelReadiness: {
      summary:
        "Channels are simulated only; liveDeliveryEnabled must remain false for every channel in this phase.",
      counts: channelCounts,
      allLiveDeliveryDisabled: !hasAnyLiveDeliveryChannel,
      channels: manifest.deliveryChannels.map((channel) => ({
        id: channel.id,
        label: channel.label,
        role: channel.role,
        status: channel.status,
        liveDeliveryEnabled: channel.liveDeliveryEnabled,
        wouldIncludeInLiveRun: channel.wouldIncludeInLiveRun,
        risk: riskFromChannel(channel),
        detail: channel.detail,
      })),
    },
    artifactReadiness: {
      summary:
        "Required artifacts are checked as future live-run dependencies, but this endpoint still does not send or store them.",
      requiredReady: requiredArtifacts.filter((item) => item.status === "ready").length,
      requiredReview: requiredArtifacts.filter((item) => item.status === "review").length,
      requiredBlocked: requiredArtifacts.filter((item) => item.status === "blocked").length,
      optionalReady: optionalArtifacts.filter((item) => item.status === "ready").length,
      artifacts: manifest.artifacts.map((artifact) => ({
        id: artifact.id,
        label: artifact.label,
        format: artifact.format,
        status: artifact.status,
        requiredForLiveRun: artifact.requiredForLiveRun,
        href: artifact.href,
      })),
    },
    exportReadinessSummary: {
      status: readiness.status,
      automationStatus: readiness.automationStatus,
      score: readiness.score,
      manualExportScore: readiness.manualExportScore,
      automationReadinessScore: readiness.automationReadinessScore,
      criticalBlockers: readiness.metrics.criticalBlockers,
      warnings: readiness.metrics.warnings,
      summary: readiness.summary,
      recommendedNextStep: readiness.recommendedNextStep,
    },
    dryRunIntegrityChecks: integrityChecks,
    crossWindowSummary: {
      currentWindow: manifest.window,
      requiredWindows: windowsToValidate.map((window) => ({
        window,
        isCurrent: window === manifest.window,
        dryRunManifestUrl: buildDailyBriefAutomationDryRunUrl(window),
        guardrailsUrl: buildDailyBriefAutomationGuardrailsUrl(window),
        readinessUrl: buildDailyBriefExportReadinessUrl(window),
      })),
      validationRequiredBeforeLive: true,
      detail:
        "Before live automation exists, inspect guardrails for 24h, 7d and 30d because report density, PDF size and evidence quality can differ by window.",
    },
    recommendedNextStep: buildRecommendedNextStep(
      guardrailStatus,
      liveAutomationStatus,
    ),
  };
}
