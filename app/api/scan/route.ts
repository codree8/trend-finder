import { NextResponse } from "next/server";
import { isAiCategory } from "@/lib/config/ai-categories";
import { runTrendScan } from "@/lib/scan/run-scan";
import { normalizeScanMode } from "@/lib/scan/scan-mode";

function asRequestBody(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(request: Request) {
  try {
    const body = asRequestBody(await request.json().catch(() => ({})));
    const scanMode = normalizeScanMode(body.scanMode);
    const category =
      typeof body.category === "string" && isAiCategory(body.category)
        ? body.category
        : null;
    const keywords = Array.isArray(body.keywords)
      ? body.keywords.filter(
          (keyword): keyword is string => typeof keyword === "string",
        )
      : undefined;

    const result = await runTrendScan({
      mode: "manual",
      scanMode,
      category,
      windowDays: typeof body.windowDays === "number" ? body.windowDays : 30,
      keywords,
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
