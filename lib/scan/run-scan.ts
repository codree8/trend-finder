import { desc, gte } from "drizzle-orm";
import {
  rawSignals,
  scanRuns,
  topicMentions,
  topics,
  trendSnapshots,
} from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { defaultAiKeywords } from "@/lib/config/scan-keywords";
import { activeConnectors } from "@/lib/scan/connectors";
import { clusterSourceSignals } from "@/lib/clustering/cluster-topics";
import {
  addTrendSnapshots,
  type ClusterWithSnapshots,
} from "@/lib/scoring/trend-snapshots";
import type { SourceSignal } from "@/lib/sources/types";

export type RunScanOptions = {
  mode: "manual" | "daily";
  windowDays?: number;
  keywords?: string[];
  persist?: boolean;
};

type PersistenceResult = {
  persisted: boolean;
  reason: string | null;
  storedSignals?: number;
  storedTopics?: number;
  storedSnapshots?: number;
};

function getSinceDate(windowDays: number): Date {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  return since;
}

function getDateOrNull(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function enrichSignalsWithObservedAt(
  signals: SourceSignal[],
  observedAt: Date,
): SourceSignal[] {
  const observedAtIso = observedAt.toISOString();

  return signals.map((signal) => {
    const rawPayload =
      signal.rawPayload && typeof signal.rawPayload === "object"
        ? {
            ...(signal.rawPayload as Record<string, unknown>),
            observedAt: observedAtIso,
          }
        : { observedAt: observedAtIso };

    return {
      ...signal,
      rawPayload,
    };
  });
}

async function loadRecentStoredSignals(
  db: NonNullable<ReturnType<typeof getDb>>,
  days = 30,
): Promise<SourceSignal[]> {
  const cutoff = getSinceDate(days);
  const rows = await db
    .select()
    .from(rawSignals)
    .where(gte(rawSignals.createdAt, cutoff))
    .orderBy(desc(rawSignals.createdAt))
    .limit(1500);

  return rows.map((row) => ({
    source: row.source,
    externalId: row.externalId,
    title: row.title,
    url: row.url,
    author: row.author ?? undefined,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    engagement: row.engagement ?? 0,
    rawPayload:
      row.rawPayload && typeof row.rawPayload === "object"
        ? {
            ...(row.rawPayload as Record<string, unknown>),
            observedAt: row.createdAt.toISOString(),
          }
        : { observedAt: row.createdAt.toISOString() },
  }));
}

async function persistRawSignals(
  db: NonNullable<ReturnType<typeof getDb>>,
  signals: SourceSignal[],
) {
  if (signals.length === 0) return 0;

  await db
    .insert(rawSignals)
    .values(
      signals.map((signal) => ({
        source: signal.source,
        externalId: signal.externalId,
        title: signal.title,
        url: signal.url,
        author: signal.author,
        publishedAt: getDateOrNull(signal.publishedAt),
        engagement: signal.engagement ?? 0,
        rawPayload: signal.rawPayload,
      })),
    )
    .onConflictDoNothing();

  return signals.length;
}

async function persistTopicsAndSnapshots(
  db: NonNullable<ReturnType<typeof getDb>>,
  clusters: ClusterWithSnapshots[],
) {
  let storedTopics = 0;
  let storedSnapshots = 0;

  for (const cluster of clusters) {
    const [topic] = await db
      .insert(topics)
      .values({
        name: cluster.name,
        slug: cluster.slug,
        category: cluster.category,
        description: cluster.description,
      })
      .onConflictDoUpdate({
        target: topics.slug,
        set: {
          name: cluster.name,
          category: cluster.category,
          description: cluster.description,
          updatedAt: new Date(),
        },
      })
      .returning({ id: topics.id, slug: topics.slug });

    if (!topic) continue;
    storedTopics += 1;

    if (cluster.signals.length > 0) {
      await db
        .insert(topicMentions)
        .values(
          cluster.signals.map((signal) => ({
            topicId: topic.id,
            topicSlug: topic.slug,
            source: signal.source,
            externalId: signal.externalId,
            title: signal.title,
            url: signal.url,
            publishedAt: getDateOrNull(signal.publishedAt),
            engagement: signal.engagement ?? 0,
            weight: Math.max(
              1,
              Math.min(10, Math.round((signal.engagement ?? 0) / 50) + 1),
            ),
          })),
        )
        .onConflictDoNothing();
    }

    if (cluster.snapshots.length > 0) {
      await db.insert(trendSnapshots).values(
        cluster.snapshots.map((snapshot) => ({
          topicId: topic.id,
          window: snapshot.window,
          trendScore: snapshot.trendScore,
          hiddenGemScore: snapshot.hiddenGemScore,
          contentScore: snapshot.contentScore,
          velocityScore: snapshot.velocityScore,
          saturationScore: snapshot.saturationScore,
          sourceDiversityScore: snapshot.sourceDiversityScore,
          mentionCount: snapshot.mentionCount,
          sourceCount: snapshot.sourceCount,
          totalEngagement: snapshot.totalEngagement,
          topSignals: snapshot.topSignals,
        })),
      );
      storedSnapshots += cluster.snapshots.length;
    }
  }

  return { storedTopics, storedSnapshots };
}

async function persistScanState(
  signals: SourceSignal[],
  metadata: Record<string, unknown>,
): Promise<{
  persistence: PersistenceResult;
  historicalSignals: SourceSignal[];
}> {
  const db = getDb();
  if (!db) {
    return {
      persistence: {
        persisted: false,
        reason: "DATABASE_URL is not configured.",
      },
      historicalSignals: signals,
    };
  }

  const storedSignals = await persistRawSignals(db, signals);
  const historicalSignals = await loadRecentStoredSignals(db, 30);
  const historicalClusters = addTrendSnapshots(
    clusterSourceSignals(historicalSignals),
  );
  const { storedTopics, storedSnapshots } = await persistTopicsAndSnapshots(
    db,
    historicalClusters,
  );

  await db.insert(scanRuns).values({
    status: "completed",
    summary: `Stored ${storedSignals} source signals, ${storedTopics} topic clusters and ${storedSnapshots} trend snapshots.`,
    rawPayload: {
      ...metadata,
      topicCount: historicalClusters.length,
      storedSignals,
      storedTopics,
      storedSnapshots,
    },
  });

  return {
    persistence: {
      persisted: true,
      reason: null,
      storedSignals,
      storedTopics,
      storedSnapshots,
    },
    historicalSignals,
  };
}

export async function runTrendScan(options: RunScanOptions) {
  const windowDays = options.windowDays ?? 30;
  const since = getSinceDate(windowDays);
  const keywords = options.keywords?.length
    ? options.keywords
    : defaultAiKeywords;
  const observedAt = new Date();

  const connectorResults = await Promise.allSettled(
    activeConnectors.map(async (connector) => ({
      source: connector.name,
      signals: await connector.scan({ keywords, since, limitPerSource: 20 }),
    })),
  );

  const successful = connectorResults.filter(
    (result) => result.status === "fulfilled",
  );
  const failed = connectorResults.filter(
    (result) => result.status === "rejected",
  );
  const signals = enrichSignalsWithObservedAt(
    successful.flatMap(
      (result) =>
        (
          result as PromiseFulfilledResult<{
            source: string;
            signals: SourceSignal[];
          }>
        ).value.signals,
    ),
    observedAt,
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

  const persistenceResult =
    options.persist === false
      ? {
          persistence: { persisted: false, reason: "Persistence disabled." },
          historicalSignals: signals,
        }
      : await persistScanState(signals, metadata);

  const clusteredTopics = addTrendSnapshots(
    clusterSourceSignals(persistenceResult.historicalSignals),
    observedAt,
  );

  return {
    ok: true,
    mode: options.mode,
    windowDays,
    scannedSources: activeConnectors.map((connector) => connector.name),
    totalSignals: signals.length,
    totalHistoricalSignals: persistenceResult.historicalSignals.length,
    topicCount: clusteredTopics.length,
    sourceCounts: metadata.sourceCounts,
    failedSources: failed.length,
    persistence: persistenceResult.persistence,
    topics: clusteredTopics.slice(0, 25).map((topic) => ({
      name: topic.name,
      slug: topic.slug,
      category: topic.category,
      description: topic.description,
      sources: topic.sources,
      mentionCount: topic.mentionCount,
      totalEngagement: topic.totalEngagement,
      topKeywords: topic.topKeywords,
      current: topic.current,
      snapshots: topic.snapshots,
      topSignals: topic.signals.slice(0, 5).map((signal) => ({
        title: signal.title,
        source: signal.source,
        url: signal.url,
        engagement: signal.engagement ?? 0,
      })),
    })),
    signals: signals.slice(0, 40),
  };
}
