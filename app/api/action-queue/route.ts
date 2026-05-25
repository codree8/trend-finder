import { NextResponse } from "next/server";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import { getActionQueue } from "@/lib/trends/action-queue";
import type { ActionQueueErrorResponse } from "@/lib/trends/types";
import { buildApiErrorBody } from "@/lib/security/api-error";

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
    const body: ActionQueueErrorResponse = buildApiErrorBody(
      "Failed to load action queue.",
      error,
    );

    return NextResponse.json(body, { status: 500 });
  }
}
