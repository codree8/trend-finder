import { lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  rawSignals,
  scanRuns,
  topicMentions,
  trendSnapshots,
} from "@/lib/db/schema";

export type RetentionCleanupSummary = {
  retentionDays: number;
  cutoff: string;
  deleted: {
    topicMentions: number;
    trendSnapshots: number;
    rawSignals: number;
    scanRuns: number;
  };
  preserved: string[];
};

const DEFAULT_RETENTION_DAYS = 30;
const MIN_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 365;

function clampRetentionDays(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_RETENTION_DAYS;
  return Math.min(
    MAX_RETENTION_DAYS,
    Math.max(MIN_RETENTION_DAYS, Math.round(value)),
  );
}

export function getConfiguredRetentionDays(value?: unknown) {
  if (typeof value === "number") return clampRetentionDays(value);
  if (typeof value === "string" && value.trim()) {
    return clampRetentionDays(Number(value));
  }

  const envValue = process.env.CRON_RETENTION_DAYS;
  return clampRetentionDays(envValue ? Number(envValue) : DEFAULT_RETENTION_DAYS);
}

export async function runRetentionCleanup(args?: {
  retentionDays?: number;
}): Promise<RetentionCleanupSummary> {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not configured. Retention cleanup requires database persistence.");
  }

  const retentionDays = getConfiguredRetentionDays(args?.retentionDays);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const deletedTopicMentions = await db
    .delete(topicMentions)
    .where(lt(topicMentions.createdAt, cutoff))
    .returning({ id: topicMentions.id });

  const deletedTrendSnapshots = await db
    .delete(trendSnapshots)
    .where(lt(trendSnapshots.createdAt, cutoff))
    .returning({ id: trendSnapshots.id });

  const deletedRawSignals = await db
    .delete(rawSignals)
    .where(lt(rawSignals.createdAt, cutoff))
    .returning({ id: rawSignals.id });

  const deletedScanRuns = await db
    .delete(scanRuns)
    .where(lt(scanRuns.createdAt, cutoff))
    .returning({ id: scanRuns.id });

  const summary: RetentionCleanupSummary = {
    retentionDays,
    cutoff: cutoff.toISOString(),
    deleted: {
      topicMentions: deletedTopicMentions.length,
      trendSnapshots: deletedTrendSnapshots.length,
      rawSignals: deletedRawSignals.length,
      scanRuns: deletedScanRuns.length,
    },
    preserved: [
      "topics",
      "saved_trends",
      "reports",
      "browser-local preferences",
      "browser-local report history",
    ],
  };

  await db.insert(scanRuns).values({
    status: "cleanup_completed",
    summary: `Retention cleanup completed: ${summary.deleted.rawSignals} raw signals, ${summary.deleted.topicMentions} mentions, ${summary.deleted.trendSnapshots} snapshots and ${summary.deleted.scanRuns} old scan logs deleted.`,
    rawPayload: {
      type: "retention_cleanup",
      ...summary,
    },
  });

  return summary;
}
