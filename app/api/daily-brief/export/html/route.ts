import { NextResponse } from "next/server";
import {
  buildDailyBriefHtmlExport,
  buildDailyBriefHtmlFilename,
} from "@/lib/trends/daily-brief-html-export";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";

export const dynamic = "force-dynamic";

function shouldDownload(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const brief = await getDailyBrief(window);
    const html = buildDailyBriefHtmlExport(brief.reportDocument);
    const filename = buildDailyBriefHtmlFilename(brief.reportDocument);
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
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to export daily intelligence brief as HTML.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
