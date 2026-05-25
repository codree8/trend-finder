import { NextResponse } from "next/server";
import {
  normalizeDashboardSearchScope,
  normalizeSearchLimit,
  searchDashboardDatabase,
} from "@/lib/search/server-dashboard-search";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import { buildApiErrorBody } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const scope = normalizeDashboardSearchScope(searchParams.get("scope"));
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const limit = normalizeSearchLimit(searchParams.get("limit"));

    const data = await searchDashboardDatabase({
      query,
      scope,
      window,
      limit,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      buildApiErrorBody("Failed to search the radar database.", error),
      { status: 500 },
    );
  }
}
