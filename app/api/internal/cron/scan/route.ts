import { NextResponse } from "next/server";
import { isAiCategory } from "@/lib/config/ai-categories";
import { acquireCronLock, releaseCronLock } from "@/lib/cron/cron-lock";
import { requireCronSecret } from "@/lib/cron/cron-auth";
import { runTrendScan } from "@/lib/scan/run-scan";
import { normalizeScanMode } from "@/lib/scan/scan-mode";

export const dynamic = "force-dynamic";

const CRON_SCAN_LOCK_SECONDS = 20 * 60;

function asRequestBody(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function readBody(request: Request) {
  return asRequestBody(await request.json().catch(() => ({})));
}

function getNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

async function handleCronScan(request: Request) {
  const auth = requireCronSecret(request);
  if (!auth.ok) return auth.response;

  const body = await readBody(request);
  const scanMode = normalizeScanMode(
    body.scanMode ?? process.env.CRON_SCAN_MODE ?? "balanced",
  );
  const category =
    typeof body.category === "string" && isAiCategory(body.category)
      ? body.category
      : null;
  const keywords = Array.isArray(body.keywords)
    ? body.keywords.filter(
        (keyword): keyword is string => typeof keyword === "string",
      )
    : undefined;
  const windowDays = getNumber(
    body.windowDays ?? process.env.CRON_SCAN_WINDOW_DAYS,
    30,
  );

  const lock = await acquireCronLock({
    lockKey: "trend-scan",
    ttlSeconds: CRON_SCAN_LOCK_SECONDS,
    metadata: {
      route: "/api/internal/cron/scan",
      scanMode,
      category,
      windowDays,
    },
  });

  if (!lock) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      code: "SCAN_ALREADY_RUNNING",
      message:
        "A scheduled scan is already running or the previous lock has not expired yet.",
    });
  }

  try {
    const result = await runTrendScan({
      mode: "daily",
      scanMode,
      category,
      windowDays,
      keywords,
    });

    return NextResponse.json({
      ok: true,
      scheduled: true,
      lock,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        scheduled: true,
        lock,
        message: "Scheduled trend scan failed.",
      },
      { status: 500 },
    );
  } finally {
    await releaseCronLock(lock);
  }
}

export async function POST(request: Request) {
  return handleCronScan(request);
}

