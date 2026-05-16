import { NextResponse } from "next/server";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import { getActionQueue } from "@/lib/trends/action-queue";
import type { ActionQueueErrorResponse } from "@/lib/trends/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const data = await getActionQueue(window);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const body: ActionQueueErrorResponse = {
      ok: false,
      message: "Failed to load action queue.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
