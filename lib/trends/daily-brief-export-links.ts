import type { DashboardWindow } from "@/lib/trends/types";

export function buildDailyBriefPageUrl(trendWindow: DashboardWindow) {
  return `/daily-brief?window=${encodeURIComponent(trendWindow)}`;
}

export function buildDailyBriefApiUrl(trendWindow: DashboardWindow) {
  return `/api/daily-brief?window=${encodeURIComponent(trendWindow)}`;
}

export function buildDailyBriefHtmlExportUrl(
  trendWindow: DashboardWindow,
  options: { download?: boolean } = {},
) {
  const params = new URLSearchParams({ window: trendWindow });

  if (options.download) {
    params.set("download", "1");
  }

  return `/api/daily-brief/export/html?${params.toString()}`;
}

export function buildDailyBriefPdfPrepUrl(
  trendWindow: DashboardWindow,
  options: { autoPrint?: boolean; download?: boolean } = {},
) {
  const params = new URLSearchParams({ window: trendWindow });

  if (options.autoPrint) {
    params.set("autoprint", "1");
  }

  if (options.download) {
    params.set("download", "1");
  }

  return `/api/daily-brief/export/pdf-prep?${params.toString()}`;
}

export function buildDailyBriefPdfExportUrl(
  trendWindow: DashboardWindow,
  options: { inline?: boolean } = {},
) {
  const params = new URLSearchParams({ window: trendWindow });

  if (options.inline) {
    params.set("inline", "1");
  }

  return `/api/daily-brief/export/pdf?${params.toString()}`;
}

export function buildDailyBriefPdfHealthUrl(trendWindow: DashboardWindow) {
  const params = new URLSearchParams({ window: trendWindow });

  return `/api/daily-brief/export/pdf/health?${params.toString()}`;
}

export function buildDailyBriefJsonExportUrl(
  trendWindow: DashboardWindow,
  options: {
    download?: boolean;
    payload?: "report-document" | "full-brief";
  } = {},
) {
  const params = new URLSearchParams({ window: trendWindow });

  if (options.download) {
    params.set("download", "1");
  }

  if (options.payload && options.payload !== "report-document") {
    params.set("payload", options.payload);
  }

  return `/api/daily-brief/export/json?${params.toString()}`;
}

export function buildDailyBriefFullJsonExportUrl(
  trendWindow: DashboardWindow,
  options: { download?: boolean } = {},
) {
  return buildDailyBriefJsonExportUrl(trendWindow, {
    ...options,
    payload: "full-brief",
  });
}

export function buildDailyBriefExportReadinessUrl(
  trendWindow: DashboardWindow,
) {
  const params = new URLSearchParams({ window: trendWindow });

  return `/api/daily-brief/export/readiness?${params.toString()}`;
}

export function buildDailyBriefAutomationDryRunUrl(
  trendWindow: DashboardWindow,
) {
  const params = new URLSearchParams({ window: trendWindow });

  return `/api/daily-brief/automation/dry-run?${params.toString()}`;
}

export function buildDailyBriefAutomationGuardrailsUrl(
  trendWindow: DashboardWindow,
) {
  const params = new URLSearchParams({ window: trendWindow });

  return `/api/daily-brief/automation/dry-run/guardrails?${params.toString()}`;
}
export function buildDailyBriefAutomationPreviewUrl(
  trendWindow: DashboardWindow,
) {
  const params = new URLSearchParams({ window: trendWindow });

  return `/api/daily-brief/automation/preview?${params.toString()}`;
}
export function buildDailyBriefAutomationConfigUrl() {
  return "/api/daily-brief/automation/config";
}

export function buildDailyBriefAutomationPreLiveChecklistUrl(
  trendWindow: DashboardWindow,
) {
  const params = new URLSearchParams({ window: trendWindow });

  return `/api/daily-brief/automation/pre-live-checklist?${params.toString()}`;
}

export function buildDailyBriefAutomationManualApprovalUrl(
  trendWindow: DashboardWindow,
) {
  const params = new URLSearchParams({ window: trendWindow });

  return `/api/daily-brief/automation/manual-approval?${params.toString()}`;
}
