import { NextResponse } from "next/server";
import {
  buildDailyBriefPdfPrepFilename,
  buildDailyBriefPdfPrepHtml,
} from "@/lib/trends/daily-brief-pdf-prep";
import { getDailyBrief } from "@/lib/trends/daily-brief";
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
