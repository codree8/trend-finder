import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron request" }, { status: 401 });
  }

  // Phase 2: call the same scan service used by the manual scan endpoint.
  return NextResponse.json({
    ok: true,
    mode: "daily",
    message: "Daily mock scan endpoint is ready.",
  });
}
