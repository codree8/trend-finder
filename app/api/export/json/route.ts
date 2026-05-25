import { NextResponse } from "next/server";
import { getDashboardTrends, normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import { buildApiErrorBody } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const data = await getDashboardTrends(window);

    return NextResponse.json(
      {
        ok: true,
        generatedAt: data.generatedAt,
        window: data.window,
        latestScan: data.latestScan,
        trends: data.trends,
        hiddenGems: data.hiddenGems,
        sourceBreakdown: data.sourceBreakdown,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      buildApiErrorBody("JSON export could not be generated from current trend data.", error),
      { status: 500 },
    );
  }
}
