import type { DashboardTrend } from "@/lib/trends/types";

export const TREND_SEARCH_QUERY_PARAM = "q";
export const TREND_SEARCH_TREND_PARAM = "trend";
export const TREND_SEARCH_SUBMITTED_EVENT = "trend-finder-search-submitted";
export const TREND_SEARCH_RECENT_STORAGE_KEY = "trend-finder:recent-searches";

const RECENT_SEARCH_LIMIT = 8;

export type TrendSearchSubmittedDetail = {
  query: string;
  trendSlug?: string | null;
};

export type DashboardSearchScope =
  | "all"
  | "trends"
  | "sources"
  | "angles"
  | "evidence";

export type DashboardSearchResultKind =
  | "trend"
  | "source"
  | "angle"
  | "evidence";

export type DashboardSearchTrendPreview = {
  slug: string;
  topic: string;
  category: string;
  sources: string[];
  trendScore: number;
  hiddenGemScore: number;
  sourceCount: number;
};

export type DashboardSearchResult = {
  id: string;
  kind: DashboardSearchResultKind;
  title: string;
  description: string;
  score: number;
  trend: DashboardTrend;
  query: string;
  matchedFields: string[];
  badge: string;
  metadata: string;
};

export type DashboardSearchApiResult = Omit<DashboardSearchResult, "trend"> & {
  trend: DashboardSearchTrendPreview;
};

export type DashboardSearchSummary = {
  total: number;
  topCategory: string | null;
  topSource: string | null;
  bestMatch: DashboardSearchResult | null;
};

export type DashboardSearchApiSummary = Omit<
  DashboardSearchSummary,
  "bestMatch"
> & {
  bestMatch: DashboardSearchApiResult | null;
};

export type DashboardSearchResponse = {
  ok: true;
  query: string;
  scope: DashboardSearchScope;
  window: string;
  generatedAt: string;
  results: DashboardSearchApiResult[];
  summary: DashboardSearchApiSummary;
  suggestions: string[];
};

export function normalizeTrendSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function getDashboardSearchUrl(query: string, trendSlug?: string | null) {
  const normalizedQuery = normalizeTrendSearchQuery(query);
  const normalizedTrendSlug = trendSlug?.trim();

  if (!normalizedQuery && !normalizedTrendSlug) return "/dashboard";

  const params = new URLSearchParams();

  if (normalizedQuery) {
    params.set(TREND_SEARCH_QUERY_PARAM, normalizedQuery);
  }

  if (normalizedTrendSlug) {
    params.set(TREND_SEARCH_TREND_PARAM, normalizedTrendSlug);
  }

  return `/dashboard?${params.toString()}`;
}

export function readDashboardSearchQueryFromUrl(search: string) {
  return normalizeTrendSearchQuery(
    new URLSearchParams(search).get(TREND_SEARCH_QUERY_PARAM) ?? "",
  );
}

export function readDashboardSearchTrendFromUrl(search: string) {
  return new URLSearchParams(search).get(TREND_SEARCH_TREND_PARAM)?.trim() || null;
}

export function dispatchTrendSearchSubmitted(
  query: string,
  trendSlug?: string | null,
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<TrendSearchSubmittedDetail>(TREND_SEARCH_SUBMITTED_EVENT, {
      detail: {
        query: normalizeTrendSearchQuery(query),
        trendSlug: trendSlug?.trim() || null,
      },
    }),
  );
}

export function filterDashboardTrendsBySearch(
  trends: DashboardTrend[],
  query: string,
) {
  return rankDashboardTrendsBySearch(trends, query).map((result) => result.trend);
}

export function rankDashboardTrendsBySearch(
  trends: DashboardTrend[],
  query: string,
) {
  const normalizedQuery = normalizeTrendSearchQuery(query);
  if (!normalizedQuery) {
    return trends.map((trend) => ({
      trend,
      score: trend.trendScore,
      matchedFields: [] as string[],
    }));
  }

  return trends
    .map((trend) => {
      const ranked = rankTrendForSearch(trend, normalizedQuery);
      return { trend, ...ranked };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || b.trend.trendScore - a.trend.trendScore);
}

export function getDashboardSearchResults(
  trends: DashboardTrend[],
  query: string,
  scope: DashboardSearchScope = "all",
) {
  const normalizedQuery = normalizeTrendSearchQuery(query);
  if (!normalizedQuery) return [];

  const results: DashboardSearchResult[] = [];

  for (const trend of trends) {
    const trendRank = rankTrendForSearch(trend, normalizedQuery);

    if ((scope === "all" || scope === "trends") && trendRank.score > 0) {
      results.push({
        id: `trend:${trend.slug}`,
        kind: "trend",
        title: trend.topic,
        description: pickFirstText([
          trend.productIntelligence.whyNow,
          trend.summary,
          trend.whyNow,
        ]),
        score: trendRank.score + trend.trendScore / 10,
        trend,
        query: normalizedQuery,
        matchedFields: trendRank.matchedFields,
        badge: trend.category,
        metadata: `${trend.trendScore} trend · ${trend.sourceCount} sources`,
      });
    }

    if (scope === "all" || scope === "sources") {
      for (const source of trend.sources) {
        const score = scoreTextMatch(source, normalizedQuery, 70);
        if (score <= 0) continue;

        results.push({
          id: `source:${trend.slug}:${source}`,
          kind: "source",
          title: source,
          description: `${trend.topic} has source evidence from ${source}.`,
          score: score + trend.sourceQuality.sourceTrustScore / 10,
          trend,
          query: source,
          matchedFields: ["source"],
          badge: "Source",
          metadata: `${trend.topic} · ${trend.category}`,
        });
      }
    }

    if (scope === "all" || scope === "angles") {
      const angles = [
        trend.contentHook,
        trend.creatorOpportunity.bestAngle,
        trend.productIntelligence.creatorAngle,
        trend.productIntelligence.startupAngle,
        trend.productIntelligence.recommendedNextAction,
      ].filter((value): value is string => Boolean(value));

      for (const [index, angle] of angles.entries()) {
        const score = scoreTextMatch(angle, normalizedQuery, 55);
        if (score <= 0) continue;

        results.push({
          id: `angle:${trend.slug}:${index}`,
          kind: "angle",
          title: angle,
          description: `Content or action angle from ${trend.topic}.`,
          score: score + trend.creatorOpportunity.score / 12,
          trend,
          query: normalizedQuery,
          matchedFields: ["angle"],
          badge: "Angle",
          metadata: `${trend.creatorOpportunity.level} creator fit · ${trend.category}`,
        });
      }
    }

    if (scope === "all" || scope === "evidence") {
      for (const [index, signal] of trend.topSignals.entries()) {
        const score =
          scoreTextMatch(signal.title, normalizedQuery, 58) +
          scoreTextMatch(signal.source, normalizedQuery, 25) +
          scoreTextMatch(signal.url, normalizedQuery, 14);

        if (score <= 0) continue;

        results.push({
          id: `evidence:${trend.slug}:${index}`,
          kind: "evidence",
          title: signal.title,
          description: `${signal.source} evidence linked to ${trend.topic}.`,
          score: score + Math.min(signal.engagement / 50, 10),
          trend,
          query: normalizedQuery,
          matchedFields: ["evidence"],
          badge: signal.source,
          metadata: `${signal.engagement} engagement · ${trend.topic}`,
        });
      }
    }
  }

  return dedupeSearchResults(results)
    .sort((a, b) => b.score - a.score || b.trend.trendScore - a.trend.trendScore)
    .slice(0, 18);
}

export function summarizeDashboardSearchResults(
  results: DashboardSearchResult[],
): DashboardSearchSummary {
  const categoryCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  for (const result of results) {
    categoryCounts.set(
      result.trend.category,
      (categoryCounts.get(result.trend.category) ?? 0) + 1,
    );

    for (const source of result.trend.sources) {
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }
  }

  return {
    total: results.length,
    topCategory: getTopMapKey(categoryCounts),
    topSource: getTopMapKey(sourceCounts),
    bestMatch: results[0] ?? null,
  };
}


export function toDashboardSearchApiResult(
  result: DashboardSearchResult,
): DashboardSearchApiResult {
  return {
    ...result,
    trend: {
      slug: result.trend.slug,
      topic: result.trend.topic,
      category: result.trend.category,
      sources: result.trend.sources,
      trendScore: result.trend.trendScore,
      hiddenGemScore: result.trend.hiddenGemScore,
      sourceCount: result.trend.sourceCount,
    },
  };
}

export function toDashboardSearchApiSummary(
  summary: DashboardSearchSummary,
): DashboardSearchApiSummary {
  return {
    ...summary,
    bestMatch: summary.bestMatch
      ? toDashboardSearchApiResult(summary.bestMatch)
      : null,
  };
}

export function getDashboardSearchSuggestions(trends: DashboardTrend[]) {
  const categorySuggestions = uniqueStrings(
    trends
      .slice()
      .sort((a, b) => b.trendScore - a.trendScore)
      .map((trend) => trend.category),
  ).slice(0, 5);

  const sourceSuggestions = uniqueStrings(
    trends.flatMap((trend) => trend.sources),
  ).slice(0, 5);

  const topicSuggestions = trends
    .slice()
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 5)
    .map((trend) => trend.topic);

  return uniqueStrings([
    ...topicSuggestions,
    ...categorySuggestions,
    ...sourceSuggestions,
  ]).slice(0, 10);
}

export function readRecentDashboardSearches() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(TREND_SEARCH_RECENT_STORAGE_KEY) ?? "[]",
    );

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map(normalizeTrendSearchQuery)
      .filter(Boolean)
      .slice(0, RECENT_SEARCH_LIMIT);
  } catch {
    return [];
  }
}

export function recordRecentDashboardSearch(query: string) {
  if (typeof window === "undefined") return;

  const normalizedQuery = normalizeTrendSearchQuery(query);
  if (!normalizedQuery) return;

  const nextSearches = uniqueStrings([
    normalizedQuery,
    ...readRecentDashboardSearches(),
  ]).slice(0, RECENT_SEARCH_LIMIT);

  window.localStorage.setItem(
    TREND_SEARCH_RECENT_STORAGE_KEY,
    JSON.stringify(nextSearches),
  );
}

export function clearRecentDashboardSearches() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TREND_SEARCH_RECENT_STORAGE_KEY);
}

function rankTrendForSearch(trend: DashboardTrend, query: string) {
  const fields: Array<{ label: string; value: string | string[]; weight: number }> = [
    { label: "topic", value: trend.topic, weight: 95 },
    { label: "canonical", value: trend.canonicalKey, weight: 85 },
    { label: "alias", value: trend.aliases, weight: 76 },
    { label: "category", value: trend.category, weight: 66 },
    { label: "status", value: trend.status, weight: 46 },
    { label: "summary", value: trend.summary, weight: 38 },
    { label: "why now", value: trend.whyNow, weight: 44 },
    { label: "content hook", value: trend.contentHook, weight: 48 },
    { label: "lifecycle", value: [trend.lifecycle.status, trend.lifecycle.summary], weight: 36 },
    {
      label: "creator angle",
      value: [
        trend.creatorOpportunity.bestAngle,
        trend.creatorOpportunity.explanation,
        trend.creatorOpportunity.recommendedFormat,
        trend.creatorOpportunity.recommendedTiming,
        ...trend.creatorOpportunity.drivers,
        ...trend.creatorOpportunity.warnings,
      ],
      weight: 42,
    },
    {
      label: "source",
      value: [
        ...trend.sources,
        trend.sourceQuality.summary,
        ...trend.sourceQuality.contribution.map((item) => item.source),
      ],
      weight: 50,
    },
    {
      label: "evidence",
      value: trend.topSignals.flatMap((signal) => [
        signal.title,
        signal.source,
        signal.url,
      ]),
      weight: 34,
    },
    {
      label: "research",
      value: [
        trend.researchSignal.summary,
        trend.researchSignal.caveat,
        trend.researchSignal.recommendedUse,
        ...trend.researchSignal.drivers,
        ...trend.researchSignal.warnings,
      ],
      weight: 32,
    },
    {
      label: "decision",
      value: [
        trend.productIntelligence.classificationLabel,
        trend.productIntelligence.whyNow,
        trend.productIntelligence.whyItMatters,
        trend.productIntelligence.creatorAngle,
        trend.productIntelligence.startupAngle,
        trend.productIntelligence.noiseRisk,
        trend.productIntelligence.saturationRisk,
        trend.productIntelligence.recommendedNextAction,
        trend.trendValidation.summary,
        trend.trendValidation.recommendedAction,
        trend.visibility.primaryReason,
        ...trend.visibility.reasons,
      ],
      weight: 36,
    },
  ];

  let score = 0;
  const matchedFields = new Set<string>();

  for (const field of fields) {
    const values = Array.isArray(field.value) ? field.value : [field.value];
    const bestFieldScore = values.reduce(
      (best, value) => Math.max(best, scoreTextMatch(value, query, field.weight)),
      0,
    );

    if (bestFieldScore > 0) {
      score += bestFieldScore;
      matchedFields.add(field.label);
    }
  }

  if (score > 0) {
    score += trend.trendScore / 15;
    score += trend.hiddenGemScore / 30;
    score += Math.min(trend.sourceCount, 8);
  }

  return { score, matchedFields: Array.from(matchedFields).slice(0, 5) };
}

function scoreTextMatch(value: string | null | undefined, query: string, weight: number) {
  if (!value) return 0;

  const normalizedValue = normalizeForSearch(value);
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedValue || !normalizedQuery) return 0;

  const terms = normalizedQuery.split(" ").filter(Boolean);
  if (terms.length === 0) return 0;

  const allTermsMatch = terms.every((term) => normalizedValue.includes(term));
  const anyTermMatches = terms.filter((term) => normalizedValue.includes(term));
  if (anyTermMatches.length === 0) return 0;

  let score = (anyTermMatches.length / terms.length) * weight;

  if (normalizedValue === normalizedQuery) score += weight * 1.4;
  else if (normalizedValue.startsWith(normalizedQuery)) score += weight * 0.75;
  else if (allTermsMatch) score += weight * 0.4;

  return score;
}

function normalizeForSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function pickFirstText(values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? "Open the trend intelligence view for the full signal context.";
}

function dedupeSearchResults(results: DashboardSearchResult[]) {
  const seen = new Set<string>();
  const deduped: DashboardSearchResult[] = [];

  for (const result of results) {
    const key = `${result.kind}:${result.title.toLowerCase()}:${result.trend.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalizedValue = normalizeTrendSearchQuery(value);
    if (!normalizedValue) continue;
    const key = normalizedValue.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalizedValue);
  }

  return output;
}

function getTopMapKey(map: Map<string, number>) {
  let topKey: string | null = null;
  let topValue = 0;

  for (const [key, value] of map.entries()) {
    if (value > topValue) {
      topKey = key;
      topValue = value;
    }
  }

  return topKey;
}
