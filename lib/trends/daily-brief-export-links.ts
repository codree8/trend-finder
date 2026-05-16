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
