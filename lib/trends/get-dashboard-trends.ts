import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  rawSignals,
  scanRuns,
  topicMentions,
  topics,
  trendSnapshots,
} from "@/lib/db/schema";
import type {
  DashboardKpi,
  DashboardTopSignal,
  DashboardTrend,
  DashboardTrendsResponse,
  DashboardWindow,
  LatestScanStatus,
  ScanSourceCoverage,
  SourceBreakdownItem,
  TrendRadarPoint,
  TrendStatus,
  TrendTimelinePoint,
} from "@/lib/trends/types";

const dashboardWindows: DashboardWindow[] = ["24h", "7d", "30d"];

const categoryLabels: Record<string, string> = {
  agents: "Agents",
  coding: "Coding",
  video: "Video",
  image: "Image",
  audio: "Audio",
  "open-source": "Open Source",
  "local-llm": "Local LLM",
  automation: "Automation",
  research: "Research",
  business: "Business",
  education: "Education",
  security: "Security",
  robotics: "Robotics",
  marketing: "Marketing",
  "general-ai": "General AI",
};

type SnapshotJoinRow = {
  snapshotId: number;
  topicId: number;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  velocityScore: number;
  saturationScore: number;
  sourceDiversityScore: number;
  mentionCount: number;
  sourceCount: number;
  totalEngagement: number;
  topSignals: unknown;
  createdAt: Date;
};

type TopicMentionRow = {
  topicId: number;
  source: string;
  title: string;
  url: string;
  engagement: number | null;
  qualityScore: number | null;
  publishedAt: Date | null;
  createdAt: Date;
};

type LatestScanRow = {
  status: string;
  summary: string | null;
  rawPayload: unknown;
  createdAt: Date;
};

function isDashboardWindow(value: string | null): value is DashboardWindow {
  return dashboardWindows.includes(value as DashboardWindow);
}

export function normalizeDashboardWindow(
  value: string | null,
): DashboardWindow {
  return isDashboardWindow(value) ? value : "7d";
}

function windowToDays(window: DashboardWindow) {
  if (window === "24h") return 1;
  if (window === "7d") return 7;
  return 30;
}

function getCutoffDate(window: DashboardWindow) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowToDays(window));
  return cutoff;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return clampScore(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function formatCategory(category: string) {
  return (
    categoryLabels[category] ??
    category
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function formatSource(source: string) {
  const normalized = source.trim();
  if (normalized.toLowerCase() === "hacker news") return "Hacker News";
  if (normalized.toLowerCase() === "hn") return "HN";
  if (normalized.toLowerCase() === "rss") return "RSS";
  if (normalized.toLowerCase() === "github") return "GitHub";
  return normalized;
}

function getTrendStatus(row: SnapshotJoinRow): TrendStatus {
  if (row.hiddenGemScore >= 75 && row.saturationScore <= 48)
    return "Hidden Gem";
  if (row.saturationScore >= 72 && row.hiddenGemScore < 65) return "Mainstream";
  if (row.velocityScore >= 74 && row.sourceDiversityScore <= 35)
    return "Volatile";
  if (row.trendScore >= 84) return "High Signal";
  return "Rising";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberFromPayload(payload: unknown, key: string) {
  const value = asRecord(payload)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArrayFromPayload(payload: unknown, key: string) {
  const value = asRecord(payload)[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function sourceCoverageFromPayload(payload: unknown): ScanSourceCoverage {
  const coverage = asRecord(asRecord(payload).sourceCoverage);
  const scanned =
    typeof coverage.scanned === "number"
      ? coverage.scanned
      : stringArrayFromPayload(payload, "scannedSources").length;
  const successful =
    typeof coverage.successful === "number"
      ? coverage.successful
      : Math.max(0, scanned - numberFromPayload(payload, "failedSources"));
  const withSignals =
    typeof coverage.withSignals === "number"
      ? coverage.withSignals
      : Object.values(asRecord(asRecord(payload).sourceCounts)).filter(
          (value) => typeof value === "number" && value > 0,
        ).length;
  const failed =
    typeof coverage.failed === "number"
      ? coverage.failed
      : numberFromPayload(payload, "failedSources");
  const label =
    typeof coverage.label === "string"
      ? coverage.label
      : `${withSignals}/${scanned} sources with signals`;

  return { scanned, successful, withSignals, failed, label };
}

function parseTopSignals(value: unknown): DashboardTopSignal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = asRecord(item);
      const title = typeof record.title === "string" ? record.title : null;
      const source = typeof record.source === "string" ? record.source : null;
      const url = typeof record.url === "string" ? record.url : null;
      const engagement =
        typeof record.engagement === "number" &&
        Number.isFinite(record.engagement)
          ? record.engagement
          : 0;

      if (!title || !source || !url) return null;

      return {
        title,
        source: formatSource(source),
        url,
        engagement,
      } satisfies DashboardTopSignal;
    })
    .filter((item): item is DashboardTopSignal => item !== null)
    .slice(0, 5);
}

function buildWhyNow(row: SnapshotJoinRow, sources: string[]) {
  const sourceText =
    sources.length > 0 ? sources.slice(0, 3).join(", ") : "tracked sources";
  return `${row.mentionCount} fresh mentions across ${sourceText}, with ${row.totalEngagement} total engagement and ${row.velocityScore}/100 velocity.`;
}

function buildContentHook(row: SnapshotJoinRow) {
  const category = formatCategory(row.category).toLowerCase();

  if (row.hiddenGemScore >= 75) {
    return `${row.name} looks early: high hidden-gem score, low saturation and enough signal to justify a deeper breakdown.`;
  }

  if (row.contentScore >= 82) {
    return `${row.name} has a strong content angle for ${category} audiences before the topic gets over-explained.`;
  }

  return `${row.name}: the signal is forming, but the useful angle is still open.`;
}

function buildTrendSummary(row: SnapshotJoinRow) {
  if (row.description) return row.description;

  const category = formatCategory(row.category).toLowerCase();
  return `A ${category} topic with ${row.mentionCount} recent mentions, ${row.sourceCount} active sources and ${row.trendScore}/100 trend strength.`;
}

function latestSnapshotPerTopic(rows: SnapshotJoinRow[]) {
  const seen = new Set<number>();
  const latest: SnapshotJoinRow[] = [];

  for (const row of rows) {
    if (seen.has(row.topicId)) continue;
    seen.add(row.topicId);
    latest.push(row);
  }

  return latest.sort((a, b) => b.trendScore - a.trendScore);
}

function buildMentionMaps(mentions: TopicMentionRow[]) {
  const sourcesByTopic = new Map<number, Set<string>>();
  const topSignalsByTopic = new Map<number, DashboardTopSignal[]>();

  for (const mention of mentions) {
    const formattedSource = formatSource(mention.source);

    if (!sourcesByTopic.has(mention.topicId)) {
      sourcesByTopic.set(mention.topicId, new Set<string>());
    }
    sourcesByTopic.get(mention.topicId)?.add(formattedSource);

    const currentSignals = topSignalsByTopic.get(mention.topicId) ?? [];
    if (currentSignals.length < 5) {
      currentSignals.push({
        title: mention.title,
        source: formattedSource,
        url: mention.url,
        engagement: mention.engagement ?? 0,
      });
      topSignalsByTopic.set(mention.topicId, currentSignals);
    }
  }

  return { sourcesByTopic, topSignalsByTopic };
}

function buildDashboardTrend(
  row: SnapshotJoinRow,
  sourcesByTopic: Map<number, Set<string>>,
  topSignalsByTopic: Map<number, DashboardTopSignal[]>,
): DashboardTrend {
  const fallbackTopSignals = parseTopSignals(row.topSignals);
  const mentionSources = Array.from(sourcesByTopic.get(row.topicId) ?? []);
  const signalSources = fallbackTopSignals.map((signal) => signal.source);
  const sources = Array.from(
    new Set([...mentionSources, ...signalSources]),
  ).slice(0, 8);
  const topSignals = topSignalsByTopic.get(row.topicId)?.length
    ? (topSignalsByTopic.get(row.topicId) ?? [])
    : fallbackTopSignals;

  return {
    id: row.slug,
    topicId: row.topicId,
    slug: row.slug,
    topic: row.name,
    category: formatCategory(row.category),
    status: getTrendStatus(row),
    summary: buildTrendSummary(row),
    trendScore: clampScore(row.trendScore),
    hiddenGemScore: clampScore(row.hiddenGemScore),
    contentScore: clampScore(row.contentScore),
    velocity: clampScore(row.velocityScore),
    saturation: clampScore(row.saturationScore),
    creatorGap: clampScore(100 - row.saturationScore),
    sourceDiversity: clampScore(row.sourceDiversityScore),
    mentionCount: row.mentionCount,
    sourceCount: row.sourceCount,
    totalEngagement: row.totalEngagement,
    sources,
    whyNow: buildWhyNow(row, sources),
    contentHook: buildContentHook(row),
    topSignals,
    lastSeenAt: row.createdAt.toISOString(),
  };
}

function buildKpis(
  trends: DashboardTrend[],
  sourceBreakdown: SourceBreakdownItem[],
  latestScan: LatestScanStatus | null,
  window: DashboardWindow,
): DashboardKpi[] {
  const topTrendScore = Math.max(0, ...trends.map((trend) => trend.trendScore));
  const hiddenGemCount = trends.filter(
    (trend) => trend.status === "Hidden Gem",
  ).length;
  const contentGapCount = trends.filter(
    (trend) => trend.contentScore >= 78 && trend.saturation <= 58,
  ).length;
  const totalMentions = trends.reduce(
    (sum, trend) => sum + trend.mentionCount,
    0,
  );
  const latestScanDelta = latestScan?.createdAt
    ? new Date(latestScan.createdAt).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      })
    : "no scan yet";

  return [
    {
      label: "Top Trend Score",
      value: String(topTrendScore),
      helper: "Highest current composite signal from stored snapshots.",
      delta: window,
    },
    {
      label: "Hidden Gems",
      value: String(hiddenGemCount),
      helper: "High hidden-gem score with lower saturation.",
      delta: `${totalMentions} mentions`,
    },
    {
      label: "Tracked Sources",
      value: String(sourceBreakdown.length),
      helper: "Sources with fresh raw signals in this window.",
      delta: latestScanDelta,
    },
    {
      label: "Content Gaps",
      value: String(contentGapCount),
      helper: "Strong content score with room before mainstream saturation.",
      delta: "+ opportunity",
    },
  ];
}

function buildRadar(trends: DashboardTrend[]): TrendRadarPoint[] {
  return [
    { axis: "Velocity", value: average(trends.map((trend) => trend.velocity)) },
    {
      axis: "Source Diversity",
      value: average(trends.map((trend) => trend.sourceDiversity)),
    },
    {
      axis: "Trend Strength",
      value: average(trends.map((trend) => trend.trendScore)),
    },
    {
      axis: "Hidden Gem",
      value: average(trends.map((trend) => trend.hiddenGemScore)),
    },
    {
      axis: "Content Gap",
      value: average(trends.map((trend) => trend.contentScore)),
    },
    {
      axis: "Low Saturation",
      value: average(trends.map((trend) => 100 - trend.saturation)),
    },
  ];
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date, index: number) {
  if (index === 6) return "Today";
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function buildTimeline(
  rows: Array<{ window: string; trendScore: number; createdAt: Date }>,
): TrendTimelinePoint[] {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });

  return days.map((date, index) => {
    const key = dayKey(date);
    const dailyRows = rows.filter((row) => dayKey(row.createdAt) === key);
    const valueForWindow = (window: DashboardWindow) =>
      average(
        dailyRows
          .filter((row) => row.window === window)
          .map((row) => row.trendScore),
      );

    return {
      day: dayLabel(date, index),
      hot: valueForWindow("24h"),
      trend: valueForWindow("7d"),
      baseline: valueForWindow("30d"),
    };
  });
}

function buildLatestScan(
  row: LatestScanRow | undefined,
): LatestScanStatus | null {
  if (!row) return null;

  const fetchedSignals =
    numberFromPayload(row.rawPayload, "fetchedSignals") ||
    numberFromPayload(row.rawPayload, "totalSignals") ||
    numberFromPayload(row.rawPayload, "storedSignals");
  const insertedSignals =
    numberFromPayload(row.rawPayload, "insertedSignals") ||
    numberFromPayload(row.rawPayload, "storedSignals");
  const topicClusters =
    numberFromPayload(row.rawPayload, "topicClusters") ||
    numberFromPayload(row.rawPayload, "storedTopics") ||
    numberFromPayload(row.rawPayload, "topicCount");
  const snapshotsCreated =
    numberFromPayload(row.rawPayload, "snapshotsCreated") ||
    numberFromPayload(row.rawPayload, "storedSnapshots");

  return {
    status: row.status,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
    totalSignals: insertedSignals,
    fetchedSignals,
    insertedSignals,
    skippedDuplicates: numberFromPayload(row.rawPayload, "skippedDuplicates"),
    duplicateRate: numberFromPayload(row.rawPayload, "duplicateRate"),
    topicClusters,
    snapshotsCreated,
    failedSources: numberFromPayload(row.rawPayload, "failedSources"),
    sourceCoverage: sourceCoverageFromPayload(row.rawPayload),
    warnings: stringArrayFromPayload(row.rawPayload, "warnings"),
  };
}

export async function getDashboardTrends(
  requestedWindow: DashboardWindow = "7d",
): Promise<DashboardTrendsResponse> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const window = normalizeDashboardWindow(requestedWindow);
  const cutoff = getCutoffDate(window);
  const timelineCutoff = new Date();
  timelineCutoff.setDate(timelineCutoff.getDate() - 7);

  const [snapshotRows, latestScanRows, sourceRows, timelineRows] =
    await Promise.all([
      db
        .select({
          snapshotId: trendSnapshots.id,
          topicId: topics.id,
          slug: topics.slug,
          name: topics.name,
          category: topics.category,
          description: topics.description,
          trendScore: trendSnapshots.trendScore,
          hiddenGemScore: trendSnapshots.hiddenGemScore,
          contentScore: trendSnapshots.contentScore,
          velocityScore: trendSnapshots.velocityScore,
          saturationScore: trendSnapshots.saturationScore,
          sourceDiversityScore: trendSnapshots.sourceDiversityScore,
          mentionCount: trendSnapshots.mentionCount,
          sourceCount: trendSnapshots.sourceCount,
          totalEngagement: trendSnapshots.totalEngagement,
          topSignals: trendSnapshots.topSignals,
          createdAt: trendSnapshots.createdAt,
        })
        .from(trendSnapshots)
        .innerJoin(topics, eq(trendSnapshots.topicId, topics.id))
        .where(eq(trendSnapshots.window, window))
        .orderBy(
          desc(trendSnapshots.createdAt),
          desc(trendSnapshots.trendScore),
        )
        .limit(500),
      db
        .select({
          status: scanRuns.status,
          summary: scanRuns.summary,
          rawPayload: scanRuns.rawPayload,
          createdAt: scanRuns.createdAt,
        })
        .from(scanRuns)
        .orderBy(desc(scanRuns.createdAt))
        .limit(1),
      db
        .select({
          source: rawSignals.source,
          signals: sql<number>`count(*)::int`,
        })
        .from(rawSignals)
        .where(gte(rawSignals.createdAt, cutoff))
        .groupBy(rawSignals.source)
        .orderBy(sql`count(*) desc`)
        .limit(12),
      db
        .select({
          window: trendSnapshots.window,
          trendScore: trendSnapshots.trendScore,
          createdAt: trendSnapshots.createdAt,
        })
        .from(trendSnapshots)
        .where(gte(trendSnapshots.createdAt, timelineCutoff))
        .orderBy(trendSnapshots.createdAt)
        .limit(2500),
    ]);

  const latestRows = latestSnapshotPerTopic(snapshotRows);
  const topicIds = latestRows.map((row) => row.topicId);

  const mentionRows = topicIds.length
    ? await db
        .select({
          topicId: topicMentions.topicId,
          source: topicMentions.source,
          title: topicMentions.title,
          url: topicMentions.url,
          engagement: topicMentions.engagement,
          qualityScore: topicMentions.qualityScore,
          publishedAt: topicMentions.publishedAt,
          createdAt: topicMentions.createdAt,
        })
        .from(topicMentions)
        .where(
          and(
            inArray(topicMentions.topicId, topicIds),
            gte(topicMentions.createdAt, cutoff),
          ),
        )
        .orderBy(
          sql`coalesce(${topicMentions.qualityScore}, 0) desc`,
          desc(topicMentions.engagement),
          desc(topicMentions.createdAt),
        )
        .limit(1200)
    : [];

  const { sourcesByTopic, topSignalsByTopic } = buildMentionMaps(mentionRows);
  const trends = latestRows
    .map((row) => buildDashboardTrend(row, sourcesByTopic, topSignalsByTopic))
    .sort((a, b) => b.trendScore - a.trendScore);

  const sourceBreakdown = sourceRows.map((row) => ({
    source: formatSource(row.source),
    signals: Number(row.signals) || 0,
  }));
  const latestScan = buildLatestScan(latestScanRows[0]);
  const hiddenGems = trends
    .filter(
      (trend) => trend.status === "Hidden Gem" || trend.hiddenGemScore >= 72,
    )
    .sort((a, b) => b.hiddenGemScore - a.hiddenGemScore);

  return {
    ok: true,
    window,
    generatedAt: new Date().toISOString(),
    latestScan,
    kpis: buildKpis(trends, sourceBreakdown, latestScan, window),
    trends,
    hiddenGems,
    signalTable: trends,
    sourceBreakdown,
    timeline: buildTimeline(timelineRows),
    radar: buildRadar(trends),
    creatorMode: {
      trend:
        trends.find((trend) => trend.contentScore >= 78) ?? trends[0] ?? null,
    },
  };
}
