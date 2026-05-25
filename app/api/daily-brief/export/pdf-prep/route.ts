import { NextResponse } from "next/server";
import {
  buildDailyBriefPdfPrepFilename,
  buildDailyBriefPdfPrepHtml,
} from "@/lib/trends/daily-brief-pdf-prep";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { parseReportTemplateId } from "@/lib/preferences/product-preferences";
import { buildTemplateReportDocument } from "@/lib/reports/report-templates";
import { buildDailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";
import { buildApiErrorBody } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

function truthy(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const template = parseReportTemplateId(searchParams.get("template"));
    const brief = await getDailyBrief(window);
    const document = buildTemplateReportDocument(brief.reportDocument, template);
    const printQa = buildDailyBriefPrintLayoutQa(document);
    const html = buildDailyBriefPdfPrepHtml(document, {
      autoPrint: truthy(searchParams.get("autoprint")),
      template,
    });
    const filename = buildDailyBriefPdfPrepFilename(document, template);
    const dispositionType = truthy(searchParams.get("download"))
      ? "attachment"
      : "inline";

    return new Response(html, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `${dispositionType}; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        "X-Print-Layout-Status": printQa.status,
        "X-Print-Layout-Score": String(printQa.score),
        "X-Estimated-Print-Pages": String(printQa.metrics.estimatedPages),
      },
    });
  } catch (error) {
    const body: DailyBriefErrorResponse = buildApiErrorBody(
      "Failed to prepare Daily Intelligence Brief print layout.",
      error,
    );

    return NextResponse.json(body, { status: 500 });
  }
}
