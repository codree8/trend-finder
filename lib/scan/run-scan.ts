import { rawSignals, scanRuns } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { defaultAiKeywords } from "@/lib/config/scan-keywords";
import { activeConnectors } from "@/lib/scan/connectors";
import type { SourceSignal } from "@/lib/sources/types";

export type RunScanOptions = {
  mode: "manual" | "daily";
  windowDays?: number;
  keywords?: string[];
  persist?: boolean;
};

function getSinceDate(windowDays: number): Date {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  return since;
}

async function persistSignals(
  signals: SourceSignal[],
  metadata: Record<string, unknown>,
) {
  const db = getDb();
  if (!db) {
    return { persisted: false, reason: "DATABASE_URL is not configured." };
  }

  if (signals.length > 0) {
    await db
      .insert(rawSignals)
      .values(
        signals.map((signal) => ({
          source: signal.source,
          externalId: signal.externalId,
          title: signal.title,
          url: signal.url,
          author: signal.author,
          publishedAt: signal.publishedAt ? new Date(signal.publishedAt) : null,
          engagement: signal.engagement ?? 0,
          rawPayload: signal.rawPayload,
        })),
      )
      .onConflictDoNothing();
  }

  await db.insert(scanRuns).values({
    status: "completed",
    summary: `Stored ${signals.length} normalized source signals.`,
    rawPayload: metadata,
  });

  return { persisted: true, reason: null };
}

export async function runTrendScan(options: RunScanOptions) {
  const windowDays = options.windowDays ?? 7;
  const since = getSinceDate(windowDays);
  const keywords = options.keywords?.length
    ? options.keywords
    : defaultAiKeywords;
  const connectorResults = await Promise.allSettled(
    activeConnectors.map(async (connector) => ({
      source: connector.name,
      signals: await connector.scan({ keywords, since, limitPerSource: 15 }),
    })),
  );

  const successful = connectorResults.filter(
    (result) => result.status === "fulfilled",
  );
  const failed = connectorResults.filter(
    (result) => result.status === "rejected",
  );
  const signals = successful.flatMap(
    (result) =>
      (
        result as PromiseFulfilledResult<{
          source: string;
          signals: SourceSignal[];
        }>
      ).value.signals,
  );

  const metadata = {
    mode: options.mode,
    windowDays,
    keywords,
    sourceCounts: Object.fromEntries(
      successful.map((result) => {
        const value = (
          result as PromiseFulfilledResult<{
            source: string;
            signals: SourceSignal[];
          }>
        ).value;
        return [value.source, value.signals.length];
      }),
    ),
    failedSources: failed.length,
  };

  const persistence =
    options.persist === false
      ? { persisted: false, reason: "Persistence disabled." }
      : await persistSignals(signals, metadata);

  return {
    ok: true,
    mode: options.mode,
    windowDays,
    scannedSources: activeConnectors.map((connector) => connector.name),
    totalSignals: signals.length,
    sourceCounts: metadata.sourceCounts,
    failedSources: failed.length,
    persistence,
    signals: signals.slice(0, 40),
  };
}
