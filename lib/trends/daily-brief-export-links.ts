import type { ReportTemplateId } from "@/lib/preferences/product-preferences";
import type { DashboardWindow } from "@/lib/trends/types";

type TemplateOption = {
  template?: ReportTemplateId;
};

function applyTemplateParam(params: URLSearchParams, template?: ReportTemplateId) {
  if (template) {
    params.set("template", template);
  }
}

export function buildDailyBriefPageUrl(trendWindow: DashboardWindow) {
  return `/daily-brief?window=${encodeURIComponent(trendWindow)}`;
}

export function buildDailyBriefApiUrl(trendWindow: DashboardWindow) {
  return `/api/daily-brief?window=${encodeURIComponent(trendWindow)}`;
}

export function buildDailyBriefHtmlExportUrl(
  trendWindow: DashboardWindow,
  options: { download?: boolean } & TemplateOption = {},
) {
  const params = new URLSearchParams({ window: trendWindow });

  if (options.download) {
    params.set("download", "1");
  }

  applyTemplateParam(params, options.template);

  return `/api/daily-brief/export/html?${params.toString()}`;
}

export function buildDailyBriefPdfPrepUrl(
  trendWindow: DashboardWindow,
  options: { autoPrint?: boolean; download?: boolean } & TemplateOption = {},
) {
  const params = new URLSearchParams({ window: trendWindow });

  if (options.autoPrint) {
    params.set("autoprint", "1");
  }

  if (options.download) {
    params.set("download", "1");
  }

  applyTemplateParam(params, options.template);

  return `/api/daily-brief/export/pdf-prep?${params.toString()}`;
}

export function buildDailyBriefPdfExportUrl(
  trendWindow: DashboardWindow,
  options: { inline?: boolean } & TemplateOption = {},
) {
  const params = new URLSearchParams({ window: trendWindow });

  if (options.inline) {
    params.set("inline", "1");
  }

  applyTemplateParam(params, options.template);

  return `/api/daily-brief/export/pdf?${params.toString()}`;
}

export function buildDailyBriefPdfHealthUrl(
  trendWindow: DashboardWindow,
  options: TemplateOption = {},
) {
  const params = new URLSearchParams({ window: trendWindow });
  applyTemplateParam(params, options.template);

  return `/api/daily-brief/export/pdf/health?${params.toString()}`;
}

export function buildDailyBriefJsonExportUrl(
  trendWindow: DashboardWindow,
  options: {
    download?: boolean;
    payload?: "report-document" | "full-brief";
  } & TemplateOption = {},
) {
  const params = new URLSearchParams({ window: trendWindow });

  if (options.download) {
    params.set("download", "1");
  }

  if (options.payload && options.payload !== "report-document") {
    params.set("payload", options.payload);
  }

  applyTemplateParam(params, options.template);

  return `/api/daily-brief/export/json?${params.toString()}`;
}

export function buildDailyBriefFullJsonExportUrl(
  trendWindow: DashboardWindow,
  options: { download?: boolean } & TemplateOption = {},
) {
  return buildDailyBriefJsonExportUrl(trendWindow, {
    ...options,
    payload: "full-brief",
  });
}

export function buildDailyBriefExportReadinessUrl(
  trendWindow: DashboardWindow,
  options: TemplateOption = {},
) {
  const params = new URLSearchParams({ window: trendWindow });
  applyTemplateParam(params, options.template);

  return `/api/daily-brief/export/readiness?${params.toString()}`;
}
