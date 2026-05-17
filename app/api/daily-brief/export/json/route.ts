import { NextResponse } from "next/server";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { parseReportTemplateId } from "@/lib/preferences/product-preferences";
import {
  buildDailyBriefJsonExport,
  buildDailyBriefJsonFilename,
  getDailyBriefJsonExportPayload,
  serializeDailyBriefJsonExport,
} from "@/lib/trends/daily-brief-json-export";
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
    const payload = getDailyBriefJsonExportPayload(searchParams.get("payload"));
    const template = parseReportTemplateId(searchParams.get("template"));
    const brief = await getDailyBrief(window);
    const exportEnvelope = buildDailyBriefJsonExport(brief, payload, template);
    const body = serializeDailyBriefJsonExport(exportEnvelope);
    const filename = buildDailyBriefJsonFilename(brief.reportDocument, payload, template);
    const dispositionType = shouldDownload(searchParams.get("download"))
      ? "attachment"
      : "inline";

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `${dispositionType}; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to export daily intelligence brief as JSON.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
