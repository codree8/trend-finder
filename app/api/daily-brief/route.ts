import { NextResponse } from "next/server";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";
import { buildApiErrorBody } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const data = await getDailyBrief(window);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const body: DailyBriefErrorResponse = buildApiErrorBody(
      "Failed to load daily intelligence brief.",
      error,
    );

    return NextResponse.json(body, { status: 500 });
  }
}
