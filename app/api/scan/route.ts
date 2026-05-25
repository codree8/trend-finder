import { NextResponse } from "next/server";
import { isAiCategory } from "@/lib/config/ai-categories";
import { acquireCronLock, releaseCronLock } from "@/lib/cron/cron-lock";
import { runTrendScan } from "@/lib/scan/run-scan";
import { normalizeScanMode } from "@/lib/scan/scan-mode";
import { buildApiErrorBody } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

const MANUAL_SCAN_LOCK_SECONDS = 20 * 60;

function asRequestBody(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(request: Request) {
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
  const windowDays = typeof body.windowDays === "number" ? body.windowDays : 30;

  let lock = null;

  try {
    lock = await acquireCronLock({
      lockKey: "trend-scan",
      ttlSeconds: MANUAL_SCAN_LOCK_SECONDS,
      metadata: {
        route: "/api/scan",
        trigger: "manual",
        scanMode,
        category,
        windowDays,
      },
    });

    if (!lock) {
      return NextResponse.json(
        {
          ok: false,
          code: "SCAN_ALREADY_RUNNING",
          message:
            "A scan is already running. Wait for the current scan to finish before starting another one.",
        },
        { status: 409 },
      );
    }

    const result = await runTrendScan({
      mode: "manual",
      scanMode,
      category,
      windowDays,
      keywords,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      buildApiErrorBody("Trend scan failed.", error),
      { status: 500 },
    );
  } finally {
    if (lock) await releaseCronLock(lock);
  }
}
