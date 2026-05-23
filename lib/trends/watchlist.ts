import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { savedTrends } from "@/lib/db/schema";
import {
  getDashboardTrends,
  normalizeDashboardWindow,
} from "@/lib/trends/get-dashboard-trends";
import type {
  DashboardTrend,
  DashboardWindow,
  SavedTrend,
  SavedTrendWithCurrent,
  TrendLifecycleStatus,
  WatchlistDelta,
  WatchlistResponse,
  WatchlistStatus,
} from "@/lib/trends/types";

export type SavedTrendRow = typeof savedTrends.$inferSelect;

type SaveTrendInput = {
  trendKey: string;
  trendSlug: string;
  topic: string;
  lastSeenScore?: number;
  lastSeenCreatorOpportunityScore?: number;
  lastSeenQualityScore?: number;
  lastSeenLifecycleStatus?: TrendLifecycleStatus | string | null;
  lastSeenMentionCount?: number;
  lastSeenSourceCount?: number;
  lastSeenTotalEngagement?: number;
  lastSeenAt?: string | null;
  note?: string | null;
  tags?: string[] | null;
};

function clampScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function normalizeTrendKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRequiredText(value: string, fieldName: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeNullableDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeTags(tags: string[] | null | undefined) {
  if (!Array.isArray(tags)) return [];

  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function tagsFromJson(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function dateToIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function mapSavedTrend(row: SavedTrendRow): SavedTrend {
  return {
    id: row.id,
    trendKey: row.trendKey,
    trendSlug: row.trendSlug,
    topic: row.topic,
    savedAt: row.savedAt.toISOString(),
    lastSeenScore: row.lastSeenScore,
    lastSeenCreatorOpportunityScore: row.lastSeenCreatorOpportunityScore,
    lastSeenQualityScore: row.lastSeenQualityScore,
    lastSeenLifecycleStatus: row.lastSeenLifecycleStatus,
    lastSeenMentionCount: row.lastSeenMentionCount,
    lastSeenSourceCount: row.lastSeenSourceCount,
    lastSeenTotalEngagement: row.lastSeenTotalEngagement,
    lastSeenAt: dateToIso(row.lastSeenAt),
    note: row.note,
    tags: tagsFromJson(row.tags),
  };
}

function indexCurrentTrends(trends: DashboardTrend[]) {
  const byKey = new Map<string, DashboardTrend>();

  for (const trend of trends) {
    const keys = [trend.canonicalKey, trend.id, trend.slug]
      .filter(Boolean)
      .map((key) => normalizeTrendKey(key));

    for (const key of keys) {
      if (!byKey.has(key)) byKey.set(key, trend);
    }
  }

  return byKey;
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function lifecycleImproved(
  previous: TrendLifecycleStatus | string | null,
  current: TrendLifecycleStatus | string | null,
) {
  return (
    previous === "Emerging" &&
    (current === "Accelerating" || current === "Peaking")
  );
}

function lifecycleCooled(current: TrendLifecycleStatus | string | null) {
  return current === "Cooling" || current === "Stale" || current === "Dormant";
}

function buildWatchStatus(args: {
  currentTrend: DashboardTrend | null;
  scoreDelta: number;
  creatorOpportunityDelta: number;
  qualityDelta: number;
  mentionDelta: number;
  sourceDelta: number;
  lifecycleChanged: boolean;
  previousLifecycleStatus: TrendLifecycleStatus | string | null;
  currentLifecycleStatus: TrendLifecycleStatus | string | null;
  lastSignalAgeHours: number | null;
}): WatchlistStatus {
  if (!args.currentTrend) return "stale";

  const gateStatus = args.currentTrend.topicQuality.gateStatus;

  if (
    gateStatus === "suppress" ||
    args.qualityDelta <= -15 ||
    args.currentTrend.topicQuality.noiseRisk === "high"
  ) {
    return "attention";
  }

  if (
    lifecycleCooled(args.currentLifecycleStatus) ||
    args.scoreDelta <= -10 ||
    args.creatorOpportunityDelta <= -15 ||
    (args.lastSignalAgeHours !== null && args.lastSignalAgeHours >= 168)
  ) {
    return args.currentLifecycleStatus === "Stale" ||
      args.currentLifecycleStatus === "Dormant"
      ? "stale"
      : "cooling";
  }

  if (
    args.scoreDelta >= 8 ||
    args.creatorOpportunityDelta >= 10 ||
    args.mentionDelta >= 3 ||
    args.sourceDelta >= 1 ||
    lifecycleImproved(args.previousLifecycleStatus, args.currentLifecycleStatus)
  ) {
    return "rising";
  }

  return "stable";
}

function statusLabel(status: WatchlistStatus) {
  const labels: Record<WatchlistStatus, string> = {
    rising: "Rising",
    stable: "Stable",
    cooling: "Cooling",
    attention: "Needs attention",
    stale: "Stale",
  };

  return labels[status];
}

function recommendedAction(status: WatchlistStatus) {
  const actions: Record<WatchlistStatus, string> = {
    rising:
      "Open intelligence and consider publishing while the signal is still moving.",
    stable:
      "Keep watching; the trend is holding, but it does not demand action yet.",
    cooling:
      "Review before acting; momentum is weakening or the timing window may be closing.",
    attention:
      "Inspect quality warnings before using this as a content or product signal.",
    stale: "Do not prioritize unless new evidence appears in the next scan.",
  };

  return actions[status];
}

function buildDelta(
  savedTrend: SavedTrend,
  currentTrend: DashboardTrend | null,
): WatchlistDelta {
  const currentScore = currentTrend?.trendScore ?? savedTrend.lastSeenScore;
  const currentCreatorScore =
    currentTrend?.creatorOpportunity.score ??
    savedTrend.lastSeenCreatorOpportunityScore;
  const currentQualityScore =
    currentTrend?.topicQuality.score ?? savedTrend.lastSeenQualityScore;
  const currentLifecycleStatus =
    currentTrend?.lifecycle.status ?? savedTrend.lastSeenLifecycleStatus;

  const scoreDelta = currentScore - savedTrend.lastSeenScore;
  const creatorOpportunityDelta =
    currentCreatorScore - savedTrend.lastSeenCreatorOpportunityScore;
  const qualityDelta = currentQualityScore - savedTrend.lastSeenQualityScore;
  const hasEvidenceBaseline = Boolean(savedTrend.lastSeenAt);
  const mentionDelta = hasEvidenceBaseline
    ? (currentTrend?.mentionCount ?? savedTrend.lastSeenMentionCount) -
      savedTrend.lastSeenMentionCount
    : 0;
  const sourceDelta = hasEvidenceBaseline
    ? (currentTrend?.sourceCount ?? savedTrend.lastSeenSourceCount) -
      savedTrend.lastSeenSourceCount
    : 0;
  const engagementDelta = hasEvidenceBaseline
    ? (currentTrend?.totalEngagement ?? savedTrend.lastSeenTotalEngagement) -
      savedTrend.lastSeenTotalEngagement
    : 0;
  const lifecycleChanged =
    Boolean(currentTrend) &&
    savedTrend.lastSeenLifecycleStatus !== currentLifecycleStatus;
  const lastSignalAgeHours =
    currentTrend?.lifecycle.latestSignalAgeHours ?? null;
  const watchStatus = buildWatchStatus({
    currentTrend,
    scoreDelta,
    creatorOpportunityDelta,
    qualityDelta,
    mentionDelta,
    sourceDelta,
    lifecycleChanged,
    previousLifecycleStatus: savedTrend.lastSeenLifecycleStatus,
    currentLifecycleStatus,
    lastSignalAgeHours,
  });

  const drivers: string[] = [];
  const warnings: string[] = [];

  if (scoreDelta >= 8)
    drivers.push(`Trend score moved ${formatDelta(scoreDelta)}.`);
  if (creatorOpportunityDelta >= 10) {
    drivers.push(
      `Creator opportunity improved ${formatDelta(creatorOpportunityDelta)}.`,
    );
  }
  if (qualityDelta >= 8)
    drivers.push(`Quality improved ${formatDelta(qualityDelta)}.`);
  if (mentionDelta > 0)
    drivers.push(
      `${mentionDelta} new mention${mentionDelta === 1 ? "" : "s"} since save.`,
    );
  if (sourceDelta > 0)
    drivers.push(
      `${sourceDelta} new source${sourceDelta === 1 ? "" : "s"} confirmed it.`,
    );
  if (lifecycleChanged) {
    drivers.push(
      `Lifecycle moved ${savedTrend.lastSeenLifecycleStatus ?? "unknown"} → ${
        currentLifecycleStatus ?? "unknown"
      }.`,
    );
  }

  if (!hasEvidenceBaseline) {
    warnings.push(
      "Evidence baseline is missing because this trend was saved before Delta v1. Re-save it to track new evidence accurately.",
    );
  }
  if (!currentTrend)
    warnings.push("No matching current snapshot in this window.");
  if (scoreDelta <= -10)
    warnings.push(`Trend score dropped ${formatDelta(scoreDelta)}.`);
  if (creatorOpportunityDelta <= -15) {
    warnings.push(
      `Creator opportunity weakened ${formatDelta(creatorOpportunityDelta)}.`,
    );
  }
  if (qualityDelta <= -15)
    warnings.push(`Quality dropped ${formatDelta(qualityDelta)}.`);
  if (currentTrend?.topicQuality.gateStatus === "suppress") {
    warnings.push("Topic quality gate now suppresses this trend.");
  }
  if (lastSignalAgeHours !== null && lastSignalAgeHours >= 168) {
    warnings.push("Latest signal is older than seven days.");
  }

  const summary = currentTrend
    ? `${statusLabel(watchStatus)}: score ${savedTrend.lastSeenScore} → ${currentScore}, creator ${savedTrend.lastSeenCreatorOpportunityScore} → ${currentCreatorScore}, quality ${savedTrend.lastSeenQualityScore} → ${currentQualityScore}.`
    : "Stale: saved trend is not present in the current dashboard window.";

  return {
    scoreDelta,
    creatorOpportunityDelta,
    qualityDelta,
    mentionDelta,
    sourceDelta,
    engagementDelta,
    newSignalsCount: hasEvidenceBaseline ? Math.max(0, mentionDelta) : 0,
    hasEvidenceBaseline,
    lifecycleChanged,
    previousLifecycleStatus: savedTrend.lastSeenLifecycleStatus,
    currentLifecycleStatus,
    lastSeenChangedAt: currentTrend?.lastSeenAt ?? null,
    watchStatus,
    watchStatusLabel: statusLabel(watchStatus),
    summary,
    recommendedAction: recommendedAction(watchStatus),
    drivers,
    warnings,
  };
}

function attachCurrentTrend(
  savedTrend: SavedTrend,
  currentTrend: DashboardTrend | null,
): SavedTrendWithCurrent {
  const delta = buildDelta(savedTrend, currentTrend);

  return {
    ...savedTrend,
    currentTrend,
    currentScore: currentTrend?.trendScore ?? savedTrend.lastSeenScore,
    currentCreatorOpportunityScore:
      currentTrend?.creatorOpportunity.score ??
      savedTrend.lastSeenCreatorOpportunityScore,
    currentQualityScore:
      currentTrend?.topicQuality.score ?? savedTrend.lastSeenQualityScore,
    currentLifecycleStatus:
      currentTrend?.lifecycle.status ?? savedTrend.lastSeenLifecycleStatus,
    lastSignalAgeHours: currentTrend?.lifecycle.latestSignalAgeHours ?? null,
    delta,
  };
}

export function savedTrendKeyFromTrend(
  trend: Pick<DashboardTrend, "canonicalKey" | "id">,
) {
  return normalizeTrendKey(trend.canonicalKey || trend.id);
}

export async function listSavedTrendRows(limit = 200): Promise<SavedTrendRow[]> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return db
    .select()
    .from(savedTrends)
    .orderBy(desc(savedTrends.savedAt))
    .limit(limit);
}

export function buildWatchlistResponseFromRows(args: {
  requestedWindow?: DashboardWindow | string | null;
  rows: SavedTrendRow[];
  dashboardData: { trends: DashboardTrend[] };
  generatedAt?: string;
}): WatchlistResponse {
  const window = normalizeDashboardWindow(args.requestedWindow ?? "7d");
  const currentByKey = indexCurrentTrends(args.dashboardData.trends);
  const items = args.rows.map((row) => {
    const savedTrend = mapSavedTrend(row);
    const currentTrend =
      currentByKey.get(normalizeTrendKey(savedTrend.trendKey)) ??
      currentByKey.get(normalizeTrendKey(savedTrend.trendSlug)) ??
      null;

    return attachCurrentTrend(savedTrend, currentTrend);
  });

  return {
    ok: true,
    window,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    items,
  };
}

export async function listSavedTrends(
  requestedWindow: DashboardWindow = "7d",
): Promise<WatchlistResponse> {
  const window = normalizeDashboardWindow(requestedWindow);
  const [rows, dashboardData] = await Promise.all([
    listSavedTrendRows(),
    getDashboardTrends(window),
  ]);

  return buildWatchlistResponseFromRows({
    requestedWindow: window,
    rows,
    dashboardData,
  });
}

export async function saveTrendToWatchlist(
  input: SaveTrendInput,
  _requestedWindow: DashboardWindow = "7d",
) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const trendKey = normalizeTrendKey(
    normalizeRequiredText(input.trendKey, "trendKey"),
  );
  const trendSlug = normalizeRequiredText(input.trendSlug, "trendSlug");
  const topic = normalizeRequiredText(input.topic, "topic");
  const tags = normalizeTags(input.tags);
  const lastSeenScore = clampScore(input.lastSeenScore);
  const lastSeenCreatorOpportunityScore = clampScore(
    input.lastSeenCreatorOpportunityScore,
  );
  const lastSeenQualityScore = clampScore(input.lastSeenQualityScore);
  const lastSeenLifecycleStatus = input.lastSeenLifecycleStatus ?? null;
  const lastSeenMentionCount = clampCount(input.lastSeenMentionCount);
  const lastSeenSourceCount = clampCount(input.lastSeenSourceCount);
  const lastSeenTotalEngagement = clampCount(input.lastSeenTotalEngagement);
  const lastSeenAt = normalizeNullableDate(input.lastSeenAt);
  const note = input.note?.trim() || null;

  const [row] = await db
    .insert(savedTrends)
    .values({
      trendKey,
      trendSlug,
      topic,
      lastSeenScore,
      lastSeenCreatorOpportunityScore,
      lastSeenQualityScore,
      lastSeenLifecycleStatus,
      lastSeenMentionCount,
      lastSeenSourceCount,
      lastSeenTotalEngagement,
      lastSeenAt,
      note,
      tags,
    })
    .onConflictDoUpdate({
      target: savedTrends.trendKey,
      set: {
        trendSlug,
        topic,
        lastSeenScore,
        lastSeenCreatorOpportunityScore,
        lastSeenQualityScore,
        lastSeenLifecycleStatus,
        lastSeenMentionCount,
        lastSeenSourceCount,
        lastSeenTotalEngagement,
        lastSeenAt,
        note,
        tags,
      },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to save trend to watchlist.");
  }

  return attachCurrentTrend(mapSavedTrend(row), null);
}

export async function removeTrendFromWatchlist(trendKey: string) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const normalizedTrendKey = normalizeTrendKey(
    normalizeRequiredText(decodeURIComponent(trendKey), "trendKey"),
  );

  await db
    .delete(savedTrends)
    .where(eq(savedTrends.trendKey, normalizedTrendKey));

  return normalizedTrendKey;
}
