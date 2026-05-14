import { NextResponse } from "next/server";
import { runTrendScan } from "@/lib/scan/run-scan";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  try {
    const result = await runTrendScan({ mode: "daily", windowDays: 1 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Daily trend scan failed.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
