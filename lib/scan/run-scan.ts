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
import { getActiveConnectors } from "@/lib/scan/connectors";
import { getConnectorReadinessSummary } from "@/lib/scan/connector-readiness";
import { clusterSourceSignals } from "@/lib/clustering/cluster-topics";
import {
  addTrendSnapshots,
  scoringCalibrationVersion,
  type ClusterWithSnapshots,
} from "@/lib/scoring/trend-snapshots";
import {
  getSignalQualityMeta,
  prepareSignalForStorage,
  uniquePreparedSignals,
} from "@/lib/signals/signal-fingerprint";
import type { SourceConnector, SourceSignal } from "@/lib/sources/types";

export type RunScanOptions = {
  mode: "manual" | "daily";
  windowDays?: number;
  keywords?: string[];
  persist?: boolean;
};

type SourceCoverage = {
  scanned: number;
  successful: number;
  withSignals: number;
  failed: number;
  label: string;
};

type ScanSummary = {
  fetchedSignals: number;
  insertCandidateSignals: number;
  insertedSignals: number;
  skippedDuplicates: number;
  skippedBatchDuplicates: number;
  skippedStoredDuplicates: number;
  topicClusters: number;
  snapshotsCreated: number;
  duplicateRate: number;
  sourceCoverage: SourceCoverage;
  warnings: string[];
};

type PersistenceResult = {
  persisted: boolean;
  reason: string | null;
  fetchedSignals: number;
  insertCandidateSignals: number;
  insertedSignals: number;
  skippedDuplicates: number;
  skippedBatchDuplicates: number;
  skippedStoredDuplicates: number;
  topicClusters: number;
  snapshotsCreated: number;
  storedSignals: number;
  storedTopics: number;
  storedSnapshots: number;
  duplicateRate: number;
  sourceCoverage: SourceCoverage;
  warnings: string[];
};

type ConnectorScanResult = {
  source: string;
  ok: boolean;
  signals: SourceSignal[];
  error?: string;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function countBySource(signals: SourceSignal[]) {
  return signals.reduce<Record<string, number>>((counts, signal) => {
    counts[signal.source] = (counts[signal.source] ?? 0) + 1;
    return counts;
  }, {});
}

function countInsertedBySource(rows: Array<{ source: string }>) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.source] = (counts[row.source] ?? 0) + 1;
    return counts;
  }, {});
}

function buildSourceCoverage(args: {
  scannedSources: string[];
  successfulSources: string[];
  sourceCounts: Record<string, number>;
  failedSources: number;
}): SourceCoverage {
  const scanned = args.scannedSources.length;
  const withSignals = Object.values(args.sourceCounts).filter(
    (count) => count > 0,
  ).length;
  const successful = args.successfulSources.length;

  return {
    scanned,
    successful,
    withSignals,
    failed: args.failedSources,
    label: `${withSignals}/${scanned} sources with signals`,
  };
}

function buildWarnings(args: {
  fetchedSignals: number;
  insertedSignals: number;
  skippedDuplicates: number;
  duplicateRate: number;
  sourceCoverage: SourceCoverage;
}) {
  const warnings: string[] = [];

  if (args.fetchedSignals > 0 && args.duplicateRate >= 0.65) {
    warnings.push(
      "High duplicate rate: scan is mostly seeing known signals. Consider widening sources or keywords before trusting velocity spikes.",
    );
  }

  if (args.fetchedSignals > 0 && args.insertedSignals === 0) {
    warnings.push(
      "No new raw signals were inserted. The scan completed, but it did not expand the signal base.",
    );
  }

  if (
    args.sourceCoverage.withSignals <
    Math.max(1, args.sourceCoverage.scanned - 1)
  ) {
    warnings.push(
      "Source coverage is thin. Trend confirmation may be weaker than the headline score suggests.",
    );
  }

  if (args.sourceCoverage.failed > 0) {
    warnings.push(
      `${args.sourceCoverage.failed} source connector${args.sourceCoverage.failed === 1 ? "" : "s"} failed during this scan.`,
    );
  }

  return warnings;
}

function buildSummaryText(summary: ScanSummary) {
  return `Scan completed: ${summary.fetchedSignals} fetched, ${summary.insertedSignals} inserted, ${summary.skippedDuplicates} duplicates skipped, ${summary.topicClusters} topic clusters, ${summary.snapshotsCreated} snapshots created.`;
}

function buildScanSummary(args: {
  fetchedSignals: number;
  insertCandidateSignals: number;
  insertedSignals: number;
  skippedBatchDuplicates: number;
  skippedStoredDuplicates: number;
  topicClusters: number;
  snapshotsCreated: number;
  sourceCoverage: SourceCoverage;
}): ScanSummary {
  const skippedDuplicates =
    args.skippedBatchDuplicates + args.skippedStoredDuplicates;
  const duplicateRate = args.fetchedSignals
    ? Math.round((skippedDuplicates / args.fetchedSignals) * 100) / 100
    : 0;
  const warnings = buildWarnings({
    fetchedSignals: args.fetchedSignals,
    insertedSignals: args.insertedSignals,
    skippedDuplicates,
    duplicateRate,
    sourceCoverage: args.sourceCoverage,
  });

  return {
    fetchedSignals: args.fetchedSignals,
    insertCandidateSignals: args.insertCandidateSignals,
    insertedSignals: args.insertedSignals,
    skippedDuplicates,
    skippedBatchDuplicates: args.skippedBatchDuplicates,
    skippedStoredDuplicates: args.skippedStoredDuplicates,
    topicClusters: args.topicClusters,
    snapshotsCreated: args.snapshotsCreated,
    duplicateRate,
    sourceCoverage: args.sourceCoverage,
    warnings,
  };
}

function prepareSignalsForScan(signals: SourceSignal[], observedAt: Date) {
  return signals.map((signal) => prepareSignalForStorage(signal, observedAt));
}

async function scanConnector(
  connector: SourceConnector,
  args: { keywords: string[]; since: Date },
): Promise<ConnectorScanResult> {
  try {
    return {
      source: connector.name,
      ok: true,
      signals: await connector.scan({
        keywords: args.keywords,
        since: args.since,
        limitPerSource: 20,
      }),
    };
  } catch (error) {
    return {
      source: connector.name,
      ok: false,
      signals: [],
      error: error instanceof Error ? error.message : "Unknown connector error",
    };
  }
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

  const storedSignals = rows.map((row) => {
    const rawPayload = asRecord(row.rawPayload);
    const normalizedUrl = row.normalizedUrl ?? rawPayload.normalizedUrl;
    const contentHash = row.contentHash ?? rawPayload.contentHash;
    const signalFingerprint =
      row.signalFingerprint ?? rawPayload.signalFingerprint;
    const qualityScore = row.qualityScore ?? rawPayload.qualityScore;

    return {
      source: row.source,
      externalId: row.externalId,
      title: row.title,
      url: row.url,
      author: row.author ?? undefined,
      publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
      engagement: row.engagement ?? 0,
      normalizedUrl:
        typeof normalizedUrl === "string" ? normalizedUrl : undefined,
      contentHash: typeof contentHash === "string" ? contentHash : undefined,
      signalFingerprint:
        typeof signalFingerprint === "string" ? signalFingerprint : undefined,
      qualityScore: typeof qualityScore === "number" ? qualityScore : undefined,
      rawPayload: {
        ...rawPayload,
        observedAt:
          typeof rawPayload.observedAt === "string"
            ? rawPayload.observedAt
            : row.createdAt.toISOString(),
      },
    } satisfies SourceSignal;
  });

  return uniquePreparedSignals(storedSignals).unique;
}

async function persistRawSignals(
  db: NonNullable<ReturnType<typeof getDb>>,
  signals: SourceSignal[],
) {
  if (signals.length === 0) {
    return {
      insertedSignals: 0,
      insertedSourceCounts: {} as Record<string, number>,
    };
  }

  const insertedRows = await db
    .insert(rawSignals)
    .values(
      signals.map((signal) => {
        const meta = getSignalQualityMeta(signal);

        return {
          source: signal.source,
          externalId: signal.externalId,
          title: signal.title,
          url: signal.url,
          normalizedUrl: meta.normalizedUrl,
          contentHash: meta.contentHash,
          signalFingerprint: meta.signalFingerprint,
          qualityScore: meta.qualityScore,
          author: signal.author,
          publishedAt: getDateOrNull(signal.publishedAt),
          engagement: signal.engagement ?? 0,
          rawPayload: signal.rawPayload,
        };
      }),
    )
    .onConflictDoNothing()
    .returning({ id: rawSignals.id, source: rawSignals.source });

  return {
    insertedSignals: insertedRows.length,
    insertedSourceCounts: countInsertedBySource(insertedRows),
  };
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
        canonicalKey: cluster.canonicalKey,
        aliases: cluster.aliases,
        relatedLabels: cluster.relatedLabels,
        category: cluster.category,
        description: cluster.description,
      })
      .onConflictDoUpdate({
        target: topics.slug,
        set: {
          name: cluster.name,
          canonicalKey: cluster.canonicalKey,
          aliases: cluster.aliases,
          relatedLabels: cluster.relatedLabels,
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
          cluster.signals.map((signal) => {
            const meta = getSignalQualityMeta(signal);

            return {
              topicId: topic.id,
              topicSlug: topic.slug,
              canonicalTopicKey:
                signal.canonicalTopicKey ?? cluster.canonicalKey,
              matchedAlias: signal.matchedTopicAlias ?? cluster.name,
              source: signal.source,
              externalId: signal.externalId,
              title: signal.title,
              url: signal.url,
              normalizedUrl: meta.normalizedUrl,
              contentHash: meta.contentHash,
              signalFingerprint: meta.signalFingerprint,
              qualityScore: meta.qualityScore,
              publishedAt: getDateOrNull(signal.publishedAt),
              engagement: signal.engagement ?? 0,
              weight: Math.max(
                1,
                Math.min(
                  10,
                  Math.round((signal.engagement ?? 0) / 50) +
                    Math.round(meta.qualityScore / 25) +
                    1,
                ),
              ),
            };
          }),
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

async function persistScanState(args: {
  signals: SourceSignal[];
  observedAt: Date;
  metadata: Record<string, unknown>;
  sourceCoverage: SourceCoverage;
}): Promise<{
  persistence: PersistenceResult;
  historicalSignals: SourceSignal[];
  scanSummary: ScanSummary;
}> {
  const preparedSignals = prepareSignalsForScan(args.signals, args.observedAt);
  const deduped = uniquePreparedSignals(preparedSignals);
  const db = getDb();

  if (!db) {
    const localClusters = addTrendSnapshots(
      clusterSourceSignals(deduped.unique),
      args.observedAt,
    );
    const scanSummary = buildScanSummary({
      fetchedSignals: preparedSignals.length,
      insertCandidateSignals: deduped.unique.length,
      insertedSignals: 0,
      skippedBatchDuplicates: deduped.duplicateCount,
      skippedStoredDuplicates: 0,
      topicClusters: localClusters.length,
      snapshotsCreated: 0,
      sourceCoverage: args.sourceCoverage,
    });

    return {
      persistence: {
        persisted: false,
        reason: "DATABASE_URL is not configured.",
        fetchedSignals: scanSummary.fetchedSignals,
        insertCandidateSignals: scanSummary.insertCandidateSignals,
        insertedSignals: 0,
        skippedDuplicates: scanSummary.skippedDuplicates,
        skippedBatchDuplicates: scanSummary.skippedBatchDuplicates,
        skippedStoredDuplicates: 0,
        topicClusters: scanSummary.topicClusters,
        snapshotsCreated: 0,
        storedSignals: 0,
        storedTopics: scanSummary.topicClusters,
        storedSnapshots: 0,
        duplicateRate: scanSummary.duplicateRate,
        sourceCoverage: scanSummary.sourceCoverage,
        warnings: scanSummary.warnings,
      },
      historicalSignals: deduped.unique,
      scanSummary,
    };
  }

  const rawInsert = await persistRawSignals(db, deduped.unique);
  const skippedStoredDuplicates = Math.max(
    0,
    deduped.unique.length - rawInsert.insertedSignals,
  );
  const historicalSignals = await loadRecentStoredSignals(db, 30);
  const historicalClusters = addTrendSnapshots(
    clusterSourceSignals(historicalSignals),
    args.observedAt,
  );
  const { storedTopics, storedSnapshots } = await persistTopicsAndSnapshots(
    db,
    historicalClusters,
  );
  const scanSummary = buildScanSummary({
    fetchedSignals: preparedSignals.length,
    insertCandidateSignals: deduped.unique.length,
    insertedSignals: rawInsert.insertedSignals,
    skippedBatchDuplicates: deduped.duplicateCount,
    skippedStoredDuplicates,
    topicClusters: historicalClusters.length,
    snapshotsCreated: storedSnapshots,
    sourceCoverage: args.sourceCoverage,
  });

  await db.insert(scanRuns).values({
    status: "completed",
    summary: buildSummaryText(scanSummary),
    rawPayload: {
      ...args.metadata,
      ...scanSummary,
      storedSignals: rawInsert.insertedSignals,
      storedTopics,
      storedSnapshots,
      insertedSourceCounts: rawInsert.insertedSourceCounts,
    },
  });

  return {
    persistence: {
      persisted: true,
      reason: null,
      fetchedSignals: scanSummary.fetchedSignals,
      insertCandidateSignals: scanSummary.insertCandidateSignals,
      insertedSignals: scanSummary.insertedSignals,
      skippedDuplicates: scanSummary.skippedDuplicates,
      skippedBatchDuplicates: scanSummary.skippedBatchDuplicates,
      skippedStoredDuplicates: scanSummary.skippedStoredDuplicates,
      topicClusters: scanSummary.topicClusters,
      snapshotsCreated: scanSummary.snapshotsCreated,
      storedSignals: scanSummary.insertedSignals,
      storedTopics,
      storedSnapshots,
      duplicateRate: scanSummary.duplicateRate,
      sourceCoverage: scanSummary.sourceCoverage,
      warnings: scanSummary.warnings,
    },
    historicalSignals,
    scanSummary,
  };
}

export async function runTrendScan(options: RunScanOptions) {
  const windowDays = options.windowDays ?? 30;
  const since = getSinceDate(windowDays);
  const keywords = options.keywords?.length
    ? options.keywords
    : defaultAiKeywords;
  const observedAt = new Date();
  const connectors = getActiveConnectors();
  const connectorReadiness = getConnectorReadinessSummary();
  const scannedSources = connectors.map((connector) => connector.name);

  const connectorResults = await Promise.all(
    connectors.map((connector) =>
      scanConnector(connector, { keywords, since }),
    ),
  );

  const successful = connectorResults.filter((result) => result.ok);
  const failed = connectorResults.filter((result) => !result.ok);
  const fetchedSignals = successful.flatMap((result) => result.signals);
  const sourceCounts = countBySource(fetchedSignals);
  const sourceCoverage = buildSourceCoverage({
    scannedSources,
    successfulSources: successful.map((result) => result.source),
    sourceCounts,
    failedSources: failed.length,
  });

  const metadata = {
    mode: options.mode,
    scoringCalibrationVersion,
    windowDays,
    keywords,
    scannedSources,
    activeSources: connectorReadiness.activeSources,
    connectorReadiness,
    sourceCounts,
    failedSources: failed.length,
    failedSourceDetails: failed.map((result) => ({
      source: result.source,
      error: result.error,
    })),
    observedAt: observedAt.toISOString(),
  };

  const persistenceResult =
    options.persist === false
      ? (() => {
          const preparedSignals = prepareSignalsForScan(
            fetchedSignals,
            observedAt,
          );
          const deduped = uniquePreparedSignals(preparedSignals);
          const localClusters = addTrendSnapshots(
            clusterSourceSignals(deduped.unique),
            observedAt,
          );
          const scanSummary = buildScanSummary({
            fetchedSignals: preparedSignals.length,
            insertCandidateSignals: deduped.unique.length,
            insertedSignals: 0,
            skippedBatchDuplicates: deduped.duplicateCount,
            skippedStoredDuplicates: 0,
            topicClusters: localClusters.length,
            snapshotsCreated: 0,
            sourceCoverage,
          });

          return {
            persistence: {
              persisted: false,
              reason: "Persistence disabled.",
              fetchedSignals: scanSummary.fetchedSignals,
              insertCandidateSignals: scanSummary.insertCandidateSignals,
              insertedSignals: 0,
              skippedDuplicates: scanSummary.skippedDuplicates,
              skippedBatchDuplicates: scanSummary.skippedBatchDuplicates,
              skippedStoredDuplicates: 0,
              topicClusters: scanSummary.topicClusters,
              snapshotsCreated: 0,
              storedSignals: 0,
              storedTopics: scanSummary.topicClusters,
              storedSnapshots: 0,
              duplicateRate: scanSummary.duplicateRate,
              sourceCoverage: scanSummary.sourceCoverage,
              warnings: scanSummary.warnings,
            },
            historicalSignals: deduped.unique,
            scanSummary,
          };
        })()
      : await persistScanState({
          signals: fetchedSignals,
          observedAt,
          metadata,
          sourceCoverage,
        });

  const clusteredTopics = addTrendSnapshots(
    clusterSourceSignals(persistenceResult.historicalSignals),
    observedAt,
  );

  return {
    ok: true,
    mode: options.mode,
    windowDays,
    scannedSources,
    totalSignals: persistenceResult.scanSummary.fetchedSignals,
    fetchedSignals: persistenceResult.scanSummary.fetchedSignals,
    insertedSignals: persistenceResult.scanSummary.insertedSignals,
    skippedDuplicates: persistenceResult.scanSummary.skippedDuplicates,
    duplicateRate: persistenceResult.scanSummary.duplicateRate,
    totalHistoricalSignals: persistenceResult.historicalSignals.length,
    topicCount: clusteredTopics.length,
    topicClusters: clusteredTopics.length,
    snapshotsCreated: persistenceResult.scanSummary.snapshotsCreated,
    sourceCounts,
    sourceCoverage,
    connectorReadiness,
    failedSources: failed.length,
    scanSummary: {
      ...persistenceResult.scanSummary,
      message: buildSummaryText(persistenceResult.scanSummary),
    },
    persistence: persistenceResult.persistence,
    topics: clusteredTopics.slice(0, 25).map((topic) => ({
      name: topic.name,
      slug: topic.slug,
      category: topic.category,
      description: topic.description,
      canonicalKey: topic.canonicalKey,
      aliases: topic.aliases,
      relatedLabels: topic.relatedLabels,
      mergedTopicCount: topic.mergedTopicCount,
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
        qualityScore: getSignalQualityMeta(signal).qualityScore,
      })),
    })),
    signals: persistenceResult.historicalSignals.slice(0, 40),
  };
}
