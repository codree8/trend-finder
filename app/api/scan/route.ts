import { NextResponse } from "next/server";
import { runTrendScan } from "@/lib/scan/run-scan";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await runTrendScan({
      mode: "manual",
      windowDays: typeof body.windowDays === "number" ? body.windowDays : 7,
      keywords: Array.isArray(body.keywords) ? body.keywords : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Trend scan failed.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
