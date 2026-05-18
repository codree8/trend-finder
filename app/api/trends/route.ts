import { NextResponse } from "next/server";
import {
  getDashboardTrends,
  normalizeDashboardWindow,
} from "@/lib/trends/get-dashboard-trends";
import type { DashboardTrendsErrorResponse } from "@/lib/trends/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const includeSuppressed =
      searchParams.get("includeSuppressed") === "1" ||
      searchParams.get("includeSuppressed") === "true";
    const data = await getDashboardTrends(window, { includeSuppressed });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const body: DashboardTrendsErrorResponse = {
      ok: false,
      message: "Failed to load dashboard trends.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
