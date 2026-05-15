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
  WatchlistResponse,
} from "@/lib/trends/types";

type SavedTrendRow = typeof savedTrends.$inferSelect;

type SaveTrendInput = {
  trendKey: string;
  trendSlug: string;
  topic: string;
  lastSeenScore?: number;
  lastSeenCreatorOpportunityScore?: number;
  lastSeenQualityScore?: number;
  lastSeenLifecycleStatus?: TrendLifecycleStatus | string | null;
  note?: string | null;
  tags?: string[] | null;
};

function clampScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function attachCurrentTrend(
  savedTrend: SavedTrend,
  currentTrend: DashboardTrend | null,
): SavedTrendWithCurrent {
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
  };
}

export function savedTrendKeyFromTrend(
  trend: Pick<DashboardTrend, "canonicalKey" | "id">,
) {
  return normalizeTrendKey(trend.canonicalKey || trend.id);
}

export async function listSavedTrends(
  requestedWindow: DashboardWindow = "7d",
): Promise<WatchlistResponse> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const window = normalizeDashboardWindow(requestedWindow);

  const [rows, dashboardData] = await Promise.all([
    db.select().from(savedTrends).orderBy(desc(savedTrends.savedAt)).limit(200),
    getDashboardTrends(window),
  ]);

  const currentByKey = indexCurrentTrends(dashboardData.trends);
  const items = rows.map((row) => {
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
    generatedAt: new Date().toISOString(),
    items,
  };
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
