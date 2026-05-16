import { NextResponse } from "next/server";
import {
  buildDailyBriefPdfPrepFilename,
  buildDailyBriefPdfPrepHtml,
} from "@/lib/trends/daily-brief-pdf-prep";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { buildDailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";

export const dynamic = "force-dynamic";

function truthy(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const brief = await getDailyBrief(window);
    const printQa = buildDailyBriefPrintLayoutQa(brief.reportDocument);
    const html = buildDailyBriefPdfPrepHtml(brief.reportDocument, {
      autoPrint: truthy(searchParams.get("autoprint")),
    });
    const filename = buildDailyBriefPdfPrepFilename(brief.reportDocument);
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
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to prepare Daily Intelligence Brief print layout.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
