import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
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
  type DashboardSearchApiResult,
  type DashboardSearchApiSummary,
  type DashboardSearchResponse,
  type DashboardSearchScope,
} from "@/lib/search/dashboard-search";
import { ensureSemanticSearchIndex } from "@/lib/search/semantic-search-documents";
import {
  createSemanticEmbedding,
  toPgVectorLiteral,
} from "@/lib/search/semantic-vector";
import type { DashboardTrend, DashboardWindow } from "@/lib/trends/types";

const DEFAULT_SEARCH_LIMIT = 18;
const MAX_SEARCH_LIMIT = 30;
const MIN_SEMANTIC_SCORE = 8;

export type SearchDashboardDatabaseInput = {
  query: string;
  scope: DashboardSearchScope;
  window: DashboardWindow;
  limit?: number;
};

type SemanticSearchRow = {
  document_key: string;
  kind: "trend" | "source" | "angle" | "evidence";
  topic_slug: string;
  topic_name: string;
  category: string;
  title: string;
  description: string;
  badge: string;
  metadata: string;
  trend_score: number;
  hidden_gem_score: number;
  source_count: number;
  matched_fields: unknown;
  semantic_score: number | string;
  text_score: number | string;
  hybrid_score: number | string;
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
  const suggestions = getDashboardSearchSuggestions(trends);

  if (!normalizedQuery) {
    return {
      ok: true,
      query: normalizedQuery,
      scope,
      window: normalizedWindow,
      mode: "semantic-vector",
      generatedAt: new Date().toISOString(),
      results: [],
      summary: emptyApiSummary(),
      suggestions,
      searchIndex: {
        mode: "semantic-vector",
        documentCount: 0,
        indexUpdatedAt: null,
      },
    };
  }

  try {
    const semanticResponse = await searchSemanticVectorIndex({
      normalizedQuery,
      scope,
      window: normalizedWindow,
      safeLimit,
      trends,
      suggestions,
    });

    if (semanticResponse.results.length > 0) return semanticResponse;
  } catch (error) {
    void error;
  }

  return searchRankedLexicalFallback({
    normalizedQuery,
    scope,
    window: normalizedWindow,
    safeLimit,
    trends,
    suggestions,
  });
}

async function searchSemanticVectorIndex(args: {
  normalizedQuery: string;
  scope: DashboardSearchScope;
  window: DashboardWindow;
  safeLimit: number;
  trends: DashboardTrend[];
  suggestions: string[];
}): Promise<DashboardSearchResponse> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const indexState = await ensureSemanticSearchIndex({
    trends: args.trends,
    window: args.window,
  });
  const queryEmbedding = createSemanticEmbedding(args.normalizedQuery);
  if (queryEmbedding.every((value) => value === 0)) {
    throw new Error("Query does not contain enough semantic signal.");
  }

  const queryVector = toPgVectorLiteral(queryEmbedding);
  const kind = scopeToResultKind(args.scope);
  const kindFilter = kind ? sql`AND kind = ${kind}` : sql``;

  const rows = await db.execute<SemanticSearchRow>(sql`
    WITH ranked_documents AS (
      SELECT
        document_key,
        kind,
        topic_slug,
        topic_name,
        category,
        title,
        description,
        badge,
        metadata,
        trend_score,
        hidden_gem_score,
        source_count,
        matched_fields,
        greatest(0, 1 - (embedding <=> ${queryVector}::vector)) AS semantic_score,
        ts_rank_cd(search_vector, plainto_tsquery('english', ${args.normalizedQuery})) AS text_score,
        (
          greatest(0, 1 - (embedding <=> ${queryVector}::vector)) * 76
          + ts_rank_cd(search_vector, plainto_tsquery('english', ${args.normalizedQuery})) * 42
          + CASE
              WHEN lower(title) = lower(${args.normalizedQuery}) THEN 34
              WHEN lower(title) LIKE lower(${`${args.normalizedQuery}%`}) THEN 22
              WHEN lower(title) LIKE lower(${`%${args.normalizedQuery}%`}) THEN 16
              WHEN lower(search_text) LIKE lower(${`%${args.normalizedQuery}%`}) THEN 9
              ELSE 0
            END
          + trend_score * 0.12
          + hidden_gem_score * 0.08
          + source_count * 0.35
        ) AS hybrid_score
      FROM semantic_search_documents
      WHERE window = ${args.window}
      ${kindFilter}
    )
    SELECT *
    FROM ranked_documents
    WHERE hybrid_score >= ${MIN_SEMANTIC_SCORE}
    ORDER BY hybrid_score DESC, semantic_score DESC, trend_score DESC
    LIMIT ${args.safeLimit}
  `);

  const results = rows.rows.map(toSemanticApiResult);

  return {
    ok: true,
    query: args.normalizedQuery,
    scope: args.scope,
    window: args.window,
    mode: "semantic-vector",
    generatedAt: new Date().toISOString(),
    results,
    summary: summarizeApiSearchResults(results),
    suggestions: args.suggestions,
    searchIndex: {
      mode: indexState.mode,
      documentCount: indexState.documentCount,
      indexUpdatedAt: indexState.indexUpdatedAt,
    },
  };
}

function searchRankedLexicalFallback(args: {
  normalizedQuery: string;
  scope: DashboardSearchScope;
  window: DashboardWindow;
  safeLimit: number;
  trends: DashboardTrend[];
  suggestions: string[];
}): DashboardSearchResponse {
  const rawResults = getDashboardSearchResults(
    args.trends,
    args.normalizedQuery,
    args.scope,
  ).slice(0, args.safeLimit);
  const rawSummary = summarizeDashboardSearchResults(rawResults);

  return {
    ok: true,
    query: args.normalizedQuery,
    scope: args.scope,
    window: args.window,
    mode: "ranked-lexical-fallback",
    generatedAt: new Date().toISOString(),
    results: rawResults.map(toDashboardSearchApiResult),
    summary: toDashboardSearchApiSummary(rawSummary),
    suggestions: args.suggestions,
    searchIndex: {
      mode: "ranked-lexical-fallback",
      documentCount: args.trends.length,
      indexUpdatedAt: null,
    },
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

function scopeToResultKind(scope: DashboardSearchScope) {
  if (scope === "trends") return "trend" as const;
  if (scope === "sources") return "source" as const;
  if (scope === "angles") return "angle" as const;
  if (scope === "evidence") return "evidence" as const;
  return null;
}

function toSemanticApiResult(row: SemanticSearchRow): DashboardSearchApiResult {
  return {
    id: row.document_key,
    kind: row.kind,
    title: row.title,
    description: row.description,
    score: Number(row.hybrid_score),
    query: row.title,
    matchedFields: normalizeMatchedFields(row.matched_fields),
    badge: row.badge,
    metadata: `${row.metadata} · semantic ${Math.round(Number(row.semantic_score) * 100)}%`,
    trend: {
      slug: row.topic_slug,
      topic: row.topic_name,
      category: row.category,
      sources: [],
      trendScore: Number(row.trend_score),
      hiddenGemScore: Number(row.hidden_gem_score),
      sourceCount: Number(row.source_count),
    },
  };
}

function summarizeApiSearchResults(
  results: DashboardSearchApiResult[],
): DashboardSearchApiSummary {
  const categoryCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  for (const result of results) {
    categoryCounts.set(
      result.trend.category,
      (categoryCounts.get(result.trend.category) ?? 0) + 1,
    );

    if (result.kind === "source") {
      sourceCounts.set(result.title, (sourceCounts.get(result.title) ?? 0) + 1);
    }
  }

  return {
    total: results.length,
    topCategory: getTopMapKey(categoryCounts),
    topSource: getTopMapKey(sourceCounts),
    bestMatch: results[0] ?? null,
  };
}

function emptyApiSummary(): DashboardSearchApiSummary {
  return {
    total: 0,
    topCategory: null,
    topSource: null,
    bestMatch: null,
  };
}

function normalizeMatchedFields(value: unknown) {
  const parsed = typeof value === "string" ? safeJsonParse(value) : value;
  if (!Array.isArray(parsed)) return ["semantic vector"];

  return parsed
    .filter((item): item is string => typeof item === "string")
    .slice(0, 6);
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function getTopMapKey(counts: Map<string, number>) {
  let bestKey: string | null = null;
  let bestCount = 0;

  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }

  return bestKey;
}
