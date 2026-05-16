import type { DashboardWindow } from "@/lib/trends/types";

export type AutomationConfigEnvironment =
  | "development"
  | "test"
  | "production"
  | "unknown";

export type AutomationConfigSafetyMode =
  | "dry_run_only"
  | "manual_test_ready"
  | "live_blocked";

export type AutomationConfigChannelId =
  | "html"
  | "json"
  | "pdf"
  | "email-preview";

export type AutomationConfigBlockedCapabilityId =
  | "email_sending"
  | "cron_scheduling"
  | "database_writes"
  | "real_recipients"
  | "send_button"
  | "external_email_provider";

export type AutomationConfigIntegrityStatus = "pass" | "fail";

export type AutomationConfigRecipientPolicy = {
  status: "not_configured_by_design";
  recipientsAllowed: false;
  envRecipientsAllowed: false;
  internalOnlyRequiredBeforeLive: true;
  manualApprovalRequiredBeforeRecipients: true;
  maxRecipientsInCurrentMode: 0;
  detail: string;
};

export type AutomationConfigChannel = {
  id: AutomationConfigChannelId;
  label: string;
  enabled: boolean;
  liveDelivery: false;
  role: "artifact" | "diagnostic" | "preview_only";
  detail: string;
};

export type AutomationConfigBlockedCapability = {
  id: AutomationConfigBlockedCapabilityId;
  label: string;
  blocked: true;
  critical: boolean;
  detail: string;
};

export type AutomationConfigIntegrityCheck = {
  id: string;
  label: string;
  status: AutomationConfigIntegrityStatus;
  passed: boolean;
  critical: boolean;
  detail: string;
};

export type AutomationConfigContract = {
  schemaVersion: "automation-config-contract-v1";
  generatedAt: string;
  environment: AutomationConfigEnvironment;
  safetyMode: AutomationConfigSafetyMode;
  automationEnabled: false;
  liveEmailEnabled: false;
  cronEnabled: false;
  manualApprovalRequired: true;
  manualSendOnly: true;
  recipients: [];
  recipientPolicy: AutomationConfigRecipientPolicy;
  allowedWindows: DashboardWindow[];
  allowedChannels: AutomationConfigChannel[];
  blockedCapabilities: AutomationConfigBlockedCapability[];
  requiredBeforeLive: string[];
  configIntegrityChecks: AutomationConfigIntegrityCheck[];
  recommendedNextStep: string;
};

const allowedWindows: DashboardWindow[] = ["24h", "7d", "30d"];

const allowedChannels: AutomationConfigChannel[] = [
  {
    id: "html",
    label: "HTML report artifact",
    enabled: true,
    liveDelivery: false,
    role: "artifact",
    detail:
      "HTML can be generated and reviewed manually. It is not connected to live delivery.",
  },
  {
    id: "json",
    label: "JSON report model",
    enabled: true,
    liveDelivery: false,
    role: "diagnostic",
    detail:
      "JSON is available for inspection and contract validation only. It does not write automation history.",
  },
  {
    id: "pdf",
    label: "Server PDF artifact",
    enabled: true,
    liveDelivery: false,
    role: "artifact",
    detail:
      "PDF can be generated manually. It is not attached to any outbound email path.",
  },
  {
    id: "email-preview",
    label: "Email preview",
    enabled: true,
    liveDelivery: false,
    role: "preview_only",
    detail:
      "Email content may be simulated for review, but there is no provider, recipient list or send action.",
  },
];

const blockedCapabilities: AutomationConfigBlockedCapability[] = [
  {
    id: "email_sending",
    label: "Email sending",
    blocked: true,
    critical: true,
    detail:
      "No live email provider or send API is configured in this contract.",
  },
  {
    id: "cron_scheduling",
    label: "Cron scheduling",
    blocked: true,
    critical: true,
    detail:
      "No scheduled Daily Brief automation job is allowed by the current contract.",
  },
  {
    id: "database_writes",
    label: "Automation database writes",
    blocked: true,
    critical: true,
    detail:
      "The current automation layer must not persist run history, recipients or approval state.",
  },
  {
    id: "real_recipients",
    label: "Real recipients",
    blocked: true,
    critical: true,
    detail:
      "Recipients are intentionally empty and must not be loaded from environment variables yet.",
  },
  {
    id: "send_button",
    label: "Send / Enable automation UI",
    blocked: true,
    critical: true,
    detail:
      "The UI may expose JSON and preview links only. It must not expose a send or enable action.",
  },
  {
    id: "external_email_provider",
    label: "External email provider",
    blocked: true,
    critical: true,
    detail:
      "Provider integration belongs to a later limited internal test step, not this config contract.",
  },
];

const requiredBeforeLive = [
  "Define a recipient policy with explicit internal-only test addresses.",
  "Add manual approval mode and keep it required before any send action.",
  "Add a pre-live checklist that verifies preview, guardrails, export readiness and PDF health.",
  "Introduce an email provider only in a separate limited internal test step.",
  "Keep cron disabled until manual internal sending is proven safe and observable.",
  "Add persistence intentionally only when approval/run history is designed.",
];

function normalizeEnvironment(
  value: string | undefined,
): AutomationConfigEnvironment {
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  return "unknown";
}

function integrityCheck({
  id,
  label,
  passed,
  critical,
  detail,
}: Omit<
  AutomationConfigIntegrityCheck,
  "status"
>): AutomationConfigIntegrityCheck {
  return {
    id,
    label,
    passed,
    critical,
    status: passed ? "pass" : "fail",
    detail,
  };
}

export function safetyModeTone(mode: AutomationConfigSafetyMode) {
  if (mode === "dry_run_only") return "positive";
  if (mode === "manual_test_ready") return "warning";
  return "danger";
}

export function buildAutomationConfigContract(): AutomationConfigContract {
  const automationEnabled = false;
  const liveEmailEnabled = false;
  const cronEnabled = false;
  const manualApprovalRequired = true;
  const manualSendOnly = true;
  const recipients: [] = [];

  const configIntegrityChecks: AutomationConfigIntegrityCheck[] = [
    integrityCheck({
      id: "automation-disabled",
      label: "Automation disabled",
      passed: automationEnabled === false,
      critical: true,
      detail:
        "automationEnabled must remain false while the system is still in dry-run and preview mode.",
    }),
    integrityCheck({
      id: "live-email-disabled",
      label: "Live email disabled",
      passed: liveEmailEnabled === false,
      critical: true,
      detail:
        "liveEmailEnabled must remain false until the limited internal email test step exists.",
    }),
    integrityCheck({
      id: "cron-disabled",
      label: "Cron disabled",
      passed: cronEnabled === false,
      critical: true,
      detail:
        "cronEnabled must remain false. Scheduled delivery is not part of this contract.",
    }),
    integrityCheck({
      id: "manual-approval-required",
      label: "Manual approval required",
      passed: manualApprovalRequired === true,
      critical: true,
      detail:
        "Manual approval must remain mandatory before any future live delivery design.",
    }),
    integrityCheck({
      id: "manual-send-only",
      label: "Manual send only",
      passed: manualSendOnly === true,
      critical: true,
      detail:
        "Even a future test send must be manual-only before cron is considered.",
    }),
    integrityCheck({
      id: "empty-recipients",
      label: "Recipient list empty",
      passed: recipients.length === 0,
      critical: true,
      detail:
        "The current contract intentionally exposes no real recipients and reads none from env.",
    }),
    integrityCheck({
      id: "windows-locked",
      label: "Allowed windows locked",
      passed:
        allowedWindows.length === 3 &&
        allowedWindows.includes("24h") &&
        allowedWindows.includes("7d") &&
        allowedWindows.includes("30d"),
      critical: false,
      detail:
        "Only 24h, 7d and 30d Daily Brief windows are part of this contract.",
    }),
    integrityCheck({
      id: "delivery-blocked",
      label: "All live delivery paths blocked",
      passed: allowedChannels.every(
        (channel) => channel.liveDelivery === false,
      ),
      critical: true,
      detail:
        "Channels can expose artifacts and previews only. No channel can deliver live messages.",
    }),
  ];

  const hasFailedCriticalCheck = configIntegrityChecks.some(
    (item) => item.critical && !item.passed,
  );
  const safetyMode: AutomationConfigSafetyMode = hasFailedCriticalCheck
    ? "live_blocked"
    : "dry_run_only";

  return {
    schemaVersion: "automation-config-contract-v1",
    generatedAt: new Date().toISOString(),
    environment: normalizeEnvironment(process.env.NODE_ENV),
    safetyMode,
    automationEnabled,
    liveEmailEnabled,
    cronEnabled,
    manualApprovalRequired,
    manualSendOnly,
    recipients,
    recipientPolicy: {
      status: "not_configured_by_design",
      recipientsAllowed: false,
      envRecipientsAllowed: false,
      internalOnlyRequiredBeforeLive: true,
      manualApprovalRequiredBeforeRecipients: true,
      maxRecipientsInCurrentMode: 0,
      detail:
        "Recipients are intentionally unavailable in the current contract. Do not read recipients from env or UI until the limited internal test step is designed.",
    },
    allowedWindows,
    allowedChannels,
    blockedCapabilities,
    requiredBeforeLive,
    configIntegrityChecks,
    recommendedNextStep:
      "Use this safe-by-default config contract as the boundary for the next step: Automation Pre-Live Checklist v1. Do not add live sending, cron or recipients yet.",
  };
}
