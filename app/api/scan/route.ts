import { NextResponse } from "next/server";
import { trends } from "@/lib/data/mock-trends";

export async function POST() {
  // Phase 2: replace mock response with source connector orchestration and DB writes.
  return NextResponse.json({
    ok: true,
    mode: "manual",
    message: "Mock scan completed. Source connectors are scaffolded for the next phase.",
    trendsFound: trends.length,
  });
}
