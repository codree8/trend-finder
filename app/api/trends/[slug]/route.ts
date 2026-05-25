import { NextResponse } from "next/server";
import { getTrendDetail } from "@/lib/trends/get-trend-detail";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { TrendDetailErrorResponse } from "@/lib/trends/types";
import { buildApiErrorBody } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const { slug } = await context.params;
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const data = await getTrendDetail(slug, window);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const body: TrendDetailErrorResponse = buildApiErrorBody(
      "Failed to load trend detail.",
      error,
    );

    return NextResponse.json(body, { status: 500 });
  }
}
