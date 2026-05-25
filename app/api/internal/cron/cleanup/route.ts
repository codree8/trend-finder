import { NextResponse } from "next/server";
import { acquireCronLock, releaseCronLock } from "@/lib/cron/cron-lock";
import { requireCronSecret } from "@/lib/cron/cron-auth";
import {
  getConfiguredRetentionDays,
  runRetentionCleanup,
} from "@/lib/cron/retention-cleanup";

export const dynamic = "force-dynamic";

const CRON_CLEANUP_LOCK_SECONDS = 10 * 60;

function asRequestBody(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function readBody(request: Request) {
  return asRequestBody(await request.json().catch(() => ({})));
}

async function handleCronCleanup(request: Request) {
  const auth = requireCronSecret(request);
  if (!auth.ok) return auth.response;

  const body = await readBody(request);
  const retentionDays = getConfiguredRetentionDays(body.retentionDays);
  const lock = await acquireCronLock({
    lockKey: "retention-cleanup",
    ttlSeconds: CRON_CLEANUP_LOCK_SECONDS,
    metadata: {
      route: "/api/internal/cron/cleanup",
      retentionDays,
    },
  });

  if (!lock) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      code: "CLEANUP_ALREADY_RUNNING",
      message:
        "A retention cleanup is already running or the previous lock has not expired yet.",
    });
  }

  try {
    const result = await runRetentionCleanup({ retentionDays });

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
        message: "Scheduled retention cleanup failed.",
      },
      { status: 500 },
    );
  } finally {
    await releaseCronLock(lock);
  }
}

export async function POST(request: Request) {
  return handleCronCleanup(request);
}

