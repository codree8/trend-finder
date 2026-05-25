import { NextResponse } from "next/server";
import {
  buildDailyBriefHtmlExport,
  buildDailyBriefHtmlFilename,
} from "@/lib/trends/daily-brief-html-export";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { parseReportTemplateId } from "@/lib/preferences/product-preferences";
import { buildTemplateReportDocument } from "@/lib/reports/report-templates";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";
import { buildApiErrorBody } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

function shouldDownload(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const template = parseReportTemplateId(searchParams.get("template"));
    const brief = await getDailyBrief(window);
    const document = buildTemplateReportDocument(brief.reportDocument, template);
    const html = buildDailyBriefHtmlExport(document, { template });
    const filename = buildDailyBriefHtmlFilename(document, template);
    const dispositionType = shouldDownload(searchParams.get("download"))
      ? "attachment"
      : "inline";

    return new Response(html, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `${dispositionType}; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const body: DailyBriefErrorResponse = buildApiErrorBody(
      "Failed to export daily intelligence brief as HTML.",
      error,
    );

    return NextResponse.json(body, { status: 500 });
  }
}
