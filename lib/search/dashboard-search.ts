import type { DashboardTrend } from "@/lib/trends/types";

export const TREND_SEARCH_QUERY_PARAM = "q";
export const TREND_SEARCH_SUBMITTED_EVENT = "trend-finder-search-submitted";

export type TrendSearchSubmittedDetail = {
  query: string;
};

export function normalizeTrendSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function getDashboardSearchUrl(query: string) {
  const normalizedQuery = normalizeTrendSearchQuery(query);

  if (!normalizedQuery) return "/dashboard";

  const params = new URLSearchParams({
    [TREND_SEARCH_QUERY_PARAM]: normalizedQuery,
  });

  return `/dashboard?${params.toString()}`;
}

export function readDashboardSearchQueryFromUrl(search: string) {
  return normalizeTrendSearchQuery(
    new URLSearchParams(search).get(TREND_SEARCH_QUERY_PARAM) ?? "",
  );
}

export function dispatchTrendSearchSubmitted(query: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<TrendSearchSubmittedDetail>(TREND_SEARCH_SUBMITTED_EVENT, {
      detail: { query: normalizeTrendSearchQuery(query) },
    }),
  );
}

export function filterDashboardTrendsBySearch(
  trends: DashboardTrend[],
  query: string,
) {
  const normalizedQuery = normalizeTrendSearchQuery(query).toLowerCase();
  if (!normalizedQuery) return trends;

  const terms = normalizedQuery.split(" ").filter(Boolean);
  if (terms.length === 0) return trends;

  return trends.filter((trend) => {
    const haystack = buildTrendSearchHaystack(trend);
    return terms.every((term) => haystack.includes(term));
  });
}

function buildTrendSearchHaystack(trend: DashboardTrend) {
  const values = [
    trend.topic,
    trend.canonicalKey,
    trend.category,
    trend.status,
    trend.summary,
    trend.whyNow,
    trend.contentHook,
    trend.lifecycle.status,
    trend.lifecycle.summary,
    trend.creatorOpportunity.bestAngle,
    trend.creatorOpportunity.explanation,
    trend.creatorOpportunity.recommendedFormat,
    trend.creatorOpportunity.recommendedTiming,
    trend.topicQuality.explanation,
    trend.sourceQuality.summary,
    trend.researchSignal.summary,
    trend.researchSignal.caveat,
    trend.researchSignal.recommendedUse,
    trend.productIntelligence.classificationLabel,
    trend.productIntelligence.whyNow,
    trend.productIntelligence.whyItMatters,
    trend.productIntelligence.creatorAngle,
    trend.productIntelligence.startupAngle,
    trend.productIntelligence.noiseRisk,
    trend.productIntelligence.saturationRisk,
    trend.trendValidation.summary,
    trend.trendValidation.recommendedAction,
    trend.visibility.primaryReason,
    ...trend.aliases,
    ...trend.relatedLabels,
    ...trend.sources,
    ...trend.creatorOpportunity.drivers,
    ...trend.creatorOpportunity.warnings,
    ...trend.topicQuality.positiveSignals,
    ...trend.topicQuality.warnings,
    ...trend.researchSignal.drivers,
    ...trend.researchSignal.warnings,
    ...trend.trendValidation.positiveSignals,
    ...trend.trendValidation.blockers,
    ...trend.trendValidation.warnings,
    ...trend.visibility.reasons,
    ...trend.topSignals.flatMap((signal) => [signal.title, signal.source, signal.url]),
  ];

  return values
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}
