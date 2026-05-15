import { NextResponse } from "next/server";
import { removeTrendFromWatchlist } from "@/lib/trends/watchlist";
import type {
  WatchlistErrorResponse,
  WatchlistMutationResponse,
} from "@/lib/trends/types";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ trendKey: string }> },
) {
  try {
    const { trendKey } = await context.params;
    const removedTrendKey = await removeTrendFromWatchlist(trendKey);
    const response: WatchlistMutationResponse = {
      ok: true,
      trendKey: removedTrendKey,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const body: WatchlistErrorResponse = {
      ok: false,
      message: "Failed to remove trend from watchlist.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 400 });
  }
}
