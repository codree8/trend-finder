import {
  getDashboardTrends,
  normalizeDashboardWindow,
} from "@/lib/trends/get-dashboard-trends";
import {
  getDashboardSearchResults,
  getDashboardSearchSuggestions,
  normalizeTrendSearchQuery,
  summarizeDashboardSearchResults,
  toDashboardSearchApiResult,
  toDashboardSearchApiSummary,
  type DashboardSearchResponse,
  type DashboardSearchScope,
} from "@/lib/search/dashboard-search";
import type { DashboardTrend, DashboardWindow } from "@/lib/trends/types";

const DEFAULT_SEARCH_LIMIT = 18;
const MAX_SEARCH_LIMIT = 30;

export type SearchDashboardDatabaseInput = {
  query: string;
  scope: DashboardSearchScope;
  window: DashboardWindow;
  limit?: number;
};

export function normalizeDashboardSearchScope(
  value: string | null,
): DashboardSearchScope {
  if (
    value === "trends" ||
    value === "sources" ||
    value === "angles" ||
    value === "evidence"
  ) {
    return value;
  }

  return "all";
}

export function normalizeSearchLimit(value: string | number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SEARCH_LIMIT;

  return Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.round(parsed)));
}

export async function searchDashboardDatabase({
  query,
  scope,
  window,
  limit = DEFAULT_SEARCH_LIMIT,
}: SearchDashboardDatabaseInput): Promise<DashboardSearchResponse> {
  const normalizedQuery = normalizeTrendSearchQuery(query);
  const normalizedWindow = normalizeDashboardWindow(window);
  const safeLimit = normalizeSearchLimit(limit);

  const dashboardData = await getDashboardTrends(normalizedWindow);
  const trends = uniqueDashboardTrends([
    ...dashboardData.trends,
    ...dashboardData.hiddenGems,
    ...dashboardData.signalTable,
    ...dashboardData.creatorMode.opportunities,
    ...(dashboardData.creatorMode.trend ? [dashboardData.creatorMode.trend] : []),
  ]);

  const rawResults = normalizedQuery
    ? getDashboardSearchResults(trends, normalizedQuery, scope).slice(0, safeLimit)
    : [];
  const rawSummary = summarizeDashboardSearchResults(rawResults);

  return {
    ok: true,
    query: normalizedQuery,
    scope,
    window: normalizedWindow,
    generatedAt: new Date().toISOString(),
    results: rawResults.map(toDashboardSearchApiResult),
    summary: toDashboardSearchApiSummary(rawSummary),
    suggestions: getDashboardSearchSuggestions(trends),
  };
}

function uniqueDashboardTrends(trends: DashboardTrend[]) {
  const unique = new Map<string, DashboardTrend>();

  for (const trend of trends) {
    unique.set(trend.slug, trend);
  }

  return Array.from(unique.values()).sort(
    (a, b) => b.trendScore - a.trendScore || b.hiddenGemScore - a.hiddenGemScore,
  );
}
