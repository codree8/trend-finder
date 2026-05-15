import { NextResponse } from "next/server";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import { listSavedTrends, saveTrendToWatchlist } from "@/lib/trends/watchlist";
import type {
  WatchlistErrorResponse,
  WatchlistMutationResponse,
} from "@/lib/trends/types";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function optionalTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const data = await listSavedTrends(window);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const body: WatchlistErrorResponse = {
      ok: false,
      message: "Failed to load watchlist.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const body = asRecord(await request.json());

    const item = await saveTrendToWatchlist(
      {
        trendKey: optionalString(body.trendKey) ?? "",
        trendSlug: optionalString(body.trendSlug) ?? "",
        topic: optionalString(body.topic) ?? "",
        lastSeenScore: optionalNumber(body.lastSeenScore),
        lastSeenCreatorOpportunityScore: optionalNumber(
          body.lastSeenCreatorOpportunityScore,
        ),
        lastSeenQualityScore: optionalNumber(body.lastSeenQualityScore),
        lastSeenLifecycleStatus: optionalString(body.lastSeenLifecycleStatus),
        lastSeenMentionCount: optionalNumber(body.lastSeenMentionCount),
        lastSeenSourceCount: optionalNumber(body.lastSeenSourceCount),
        lastSeenTotalEngagement: optionalNumber(body.lastSeenTotalEngagement),
        lastSeenAt: optionalString(body.lastSeenAt) ?? null,
        note: optionalString(body.note) ?? null,
        tags: optionalTags(body.tags),
      },
      window,
    );

    const response: WatchlistMutationResponse = { ok: true, item };

    return NextResponse.json(response, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const body: WatchlistErrorResponse = {
      ok: false,
      message: "Failed to save trend to watchlist.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 400 });
  }
}
