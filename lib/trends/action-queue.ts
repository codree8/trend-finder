import {
  getDashboardTrends,
  normalizeDashboardWindow,
} from "@/lib/trends/get-dashboard-trends";
import { buildTrendActionRecommendation } from "@/lib/trends/action-priority";
import { buildActionQueueQa } from "@/lib/trends/action-queue-qa";
import {
  buildWatchlistResponseFromRows,
  listSavedTrendRows,
  savedTrendKeyFromTrend,
} from "@/lib/trends/watchlist";
import type {
  ActionQueueItem,
  ActionQueueResponse,
  ActionQueueSummary,
  DashboardTrend,
  DashboardWindow,
  SavedTrendWithCurrent,
  TrendActionPriority,
} from "@/lib/trends/types";

const priorityRank: Record<TrendActionPriority, number> = {
  act_now: 0,
  monitor: 1,
  review: 2,
  ignore: 3,
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function indexWatchlist(items: SavedTrendWithCurrent[]) {
  const byKey = new Map<string, SavedTrendWithCurrent>();

  for (const item of items) {
    const keys = [
      item.trendKey,
      item.trendSlug,
      item.currentTrend?.canonicalKey,
      item.currentTrend?.id,
      item.currentTrend?.slug,
    ].filter((key): key is string => Boolean(key));

    for (const key of keys) {
      const normalized = normalizeKey(key);
      if (!byKey.has(normalized)) byKey.set(normalized, item);
    }
  }

  return byKey;
}

function watchlistItemForTrend(
  trend: DashboardTrend,
  byKey: Map<string, SavedTrendWithCurrent>,
) {
  return (
    byKey.get(savedTrendKeyFromTrend(trend)) ??
    byKey.get(normalizeKey(trend.canonicalKey)) ??
    byKey.get(normalizeKey(trend.slug)) ??
    byKey.get(normalizeKey(trend.id)) ??
    null
  );
}

function buildSummary(items: ActionQueueItem[]): ActionQueueSummary {
  return items.reduce(
    (acc, item) => {
      if (item.actionPriority === "act_now") acc.actNow += 1;
      if (item.actionPriority === "monitor") acc.monitor += 1;
      if (item.actionPriority === "review") acc.review += 1;
      if (item.actionPriority === "ignore") acc.ignore += 1;
      if (item.urgencyLevel === "high") acc.highUrgency += 1;
      return acc;
    },
    {
      actNow: 0,
      monitor: 0,
      review: 0,
      ignore: 0,
      highUrgency: 0,
    } satisfies ActionQueueSummary,
  );
}

function compareQueueItems(a: ActionQueueItem, b: ActionQueueItem) {
  const priorityDelta =
    priorityRank[a.actionPriority] - priorityRank[b.actionPriority];
  if (priorityDelta !== 0) return priorityDelta;

  const urgencyDelta =
    (b.urgencyLevel === "high" ? 2 : b.urgencyLevel === "medium" ? 1 : 0) -
    (a.urgencyLevel === "high" ? 2 : a.urgencyLevel === "medium" ? 1 : 0);
  if (urgencyDelta !== 0) return urgencyDelta;

  return b.actionScore - a.actionScore;
}

export function buildActionQueueFromData(args: {
  requestedWindow?: DashboardWindow | string | null;
  dashboardData: { trends: DashboardTrend[] };
  watchlistData: { items: SavedTrendWithCurrent[] };
  generatedAt?: string;
}): ActionQueueResponse {
  const window = normalizeDashboardWindow(args.requestedWindow ?? "7d");
  const watchlistByKey = indexWatchlist(args.watchlistData.items);

  const items = args.dashboardData.trends
    .map((trend) => {
      const watchlistItem = watchlistItemForTrend(trend, watchlistByKey);
      const recommendation = buildTrendActionRecommendation({
        trend,
        watchlistItem,
      });

      return {
        ...recommendation,
        trend,
        isSaved: Boolean(watchlistItem),
        watchlistItem,
      } satisfies ActionQueueItem;
    })
    .sort(compareQueueItems)
    .slice(0, 80);

  return {
    ok: true,
    window,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    summary: buildSummary(items),
    qa: buildActionQueueQa(items),
    items,
  };
}

export async function getActionQueue(
  requestedWindow: DashboardWindow = "7d",
): Promise<ActionQueueResponse> {
  const window = normalizeDashboardWindow(requestedWindow);
  const [dashboardData, savedRows] = await Promise.all([
    getDashboardTrends(window),
    listSavedTrendRows(),
  ]);
  const generatedAt = new Date().toISOString();
  const watchlistData = buildWatchlistResponseFromRows({
    requestedWindow: window,
    rows: savedRows,
    dashboardData,
    generatedAt,
  });

  return buildActionQueueFromData({
    requestedWindow: window,
    dashboardData,
    watchlistData,
    generatedAt,
  });
}
