import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  createSemanticEmbedding,
  stableSemanticHash,
  toPgVectorLiteral,
} from "@/lib/search/semantic-vector";
import type { DashboardSearchResultKind } from "@/lib/search/dashboard-search";
import type { DashboardTrend, DashboardWindow } from "@/lib/trends/types";

export type SemanticSearchDocument = {
  documentKey: string;
  kind: DashboardSearchResultKind;
  window: DashboardWindow;
  topicSlug: string;
  topicName: string;
  category: string;
  title: string;
  description: string;
  badge: string;
  metadata: string;
  searchText: string;
  trendScore: number;
  hiddenGemScore: number;
  sourceCount: number;
  matchedFields: string[];
  sourceHash: string;
  embedding: string;
};

export type SemanticSearchIndexState = {
  mode: "semantic-vector";
  documentCount: number;
  indexUpdatedAt: string;
};

const SEMANTIC_INDEX_REFRESH_MS = 1000 * 60 * 10;

export async function ensureSemanticSearchIndex(args: {
  trends: DashboardTrend[];
  window: DashboardWindow;
}): Promise<SemanticSearchIndexState> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const documents = buildSemanticSearchDocuments(args.trends, args.window);
  const corpusHash = stableSemanticHash(
    documents.map((document) => document.sourceHash).sort().join("|"),
  );

  const currentRows = await db.execute<{
    source_hash: string;
    document_count: number;
    updated_at: Date;
  }>(sql`
    SELECT source_hash, document_count, updated_at
    FROM semantic_search_index_state
    WHERE window = ${args.window}
    LIMIT 1
  `);

  const current = currentRows.rows[0];
  const currentUpdatedAt = current?.updated_at
    ? new Date(current.updated_at)
    : null;
  const isFresh = currentUpdatedAt
    ? Date.now() - currentUpdatedAt.getTime() < SEMANTIC_INDEX_REFRESH_MS
    : false;

  if (
    current &&
    current.source_hash === corpusHash &&
    current.document_count === documents.length &&
    isFresh
  ) {
    return {
      mode: "semantic-vector",
      documentCount: current.document_count,
      indexUpdatedAt: currentUpdatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  const syncStartedAt = new Date();

  for (const batch of chunkDocuments(documents, 80)) {
    await upsertSemanticSearchDocumentsBatch(batch);
  }

  await db.execute(sql`
    DELETE FROM semantic_search_documents
    WHERE window = ${args.window}
      AND updated_at < ${syncStartedAt}
  `);

  await db.execute(sql`
    INSERT INTO semantic_search_index_state (
      window,
      source_hash,
      document_count,
      updated_at
    )
    VALUES (${args.window}, ${corpusHash}, ${documents.length}, ${new Date()})
    ON CONFLICT (window) DO UPDATE SET
      source_hash = EXCLUDED.source_hash,
      document_count = EXCLUDED.document_count,
      updated_at = EXCLUDED.updated_at
  `);

  return {
    mode: "semantic-vector",
    documentCount: documents.length,
    indexUpdatedAt: new Date().toISOString(),
  };
}

function buildSemanticSearchDocuments(
  trends: DashboardTrend[],
  window: DashboardWindow,
) {
  const documents: SemanticSearchDocument[] = [];

  for (const trend of trends) {
    const baseText = compactText([
      trend.topic,
      trend.canonicalKey,
      trend.aliases.join(" "),
      trend.relatedLabels.join(" "),
      trend.category,
      trend.status,
      trend.summary,
      trend.whyNow,
      trend.contentHook,
      trend.lifecycle.summary,
      trend.topicQuality.explanation,
      trend.sourceQuality.summary,
      trend.productIntelligence.whyNow,
      trend.productIntelligence.creatorAngle,
      trend.productIntelligence.startupAngle,
      trend.productIntelligence.recommendedNextAction,
      trend.creatorOpportunity.bestAngle,
      trend.creatorOpportunity.explanation,
      trend.creatorOpportunity.drivers.join(" "),
      trend.trendValidation.summary,
      trend.trendValidation.recommendedAction,
    ]);

    documents.push(
      createSemanticDocument({
        kind: "trend",
        window,
        trend,
        uniquePart: "summary",
        title: trend.topic,
        description: pickText([
          trend.productIntelligence.whyNow,
          trend.summary,
          trend.whyNow,
        ]),
        badge: trend.category,
        metadata: `${trend.trendScore} trend · ${trend.sourceCount} sources`,
        matchedFields: ["semantic trend", "topic", "summary"],
        searchText: baseText,
      }),
    );

    for (const source of trend.sources) {
      documents.push(
        createSemanticDocument({
          kind: "source",
          window,
          trend,
          uniquePart: `source:${source}`,
          title: source,
          description: `${trend.topic} has source evidence from ${source}.`,
          badge: "Source",
          metadata: `${trend.topic} · ${trend.category}`,
          matchedFields: ["semantic source", "source"],
          searchText: compactText([
            source,
            trend.topic,
            trend.category,
            trend.aliases.join(" "),
            trend.relatedLabels.join(" "),
            trend.sourceQuality.summary,
            baseText,
          ]),
        }),
      );
    }

    const angles = uniqueStrings([
      trend.contentHook,
      trend.creatorOpportunity.bestAngle,
      trend.productIntelligence.creatorAngle,
      trend.productIntelligence.startupAngle,
      trend.productIntelligence.recommendedNextAction,
      ...trend.creatorOpportunity.drivers,
    ]);

    for (const [index, angle] of angles.entries()) {
      documents.push(
        createSemanticDocument({
          kind: "angle",
          window,
          trend,
          uniquePart: `angle:${index}`,
          title: angle,
          description: `Content or product angle from ${trend.topic}.`,
          badge: "Angle",
          metadata: `${trend.creatorOpportunity.level} creator fit · ${trend.category}`,
          matchedFields: ["semantic angle", "angle"],
          searchText: compactText([
            angle,
            trend.topic,
            trend.category,
            trend.aliases.join(" "),
            trend.productIntelligence.creatorAngle,
            trend.productIntelligence.startupAngle,
            trend.creatorOpportunity.explanation,
            baseText,
          ]),
        }),
      );
    }

    for (const [index, signal] of trend.topSignals.entries()) {
      documents.push(
        createSemanticDocument({
          kind: "evidence",
          window,
          trend,
          uniquePart: `evidence:${index}:${signal.source}`,
          title: signal.title,
          description: `${signal.source} evidence linked to ${trend.topic}.`,
          badge: signal.source,
          metadata: `${signal.engagement} engagement · ${trend.topic}`,
          matchedFields: ["semantic evidence", "evidence"],
          searchText: compactText([
            signal.title,
            signal.source,
            signal.url,
            trend.topic,
            trend.category,
            trend.aliases.join(" "),
            trend.relatedLabels.join(" "),
            baseText,
          ]),
        }),
      );
    }
  }

  return dedupeDocuments(documents).slice(0, 1800);
}

function createSemanticDocument(args: {
  kind: DashboardSearchResultKind;
  window: DashboardWindow;
  trend: DashboardTrend;
  uniquePart: string;
  title: string;
  description: string;
  badge: string;
  metadata: string;
  matchedFields: string[];
  searchText: string;
}): SemanticSearchDocument {
  const documentKey = `${args.window}:${args.kind}:${args.trend.slug}:${stableSemanticHash(args.uniquePart).slice(0, 16)}`;
  const searchText = compactText([
    args.title,
    args.description,
    args.searchText,
    args.trend.sources.join(" "),
  ]);
  const sourceHash = stableSemanticHash(
    JSON.stringify({
      documentKey,
      kind: args.kind,
      title: args.title,
      description: args.description,
      badge: args.badge,
      metadata: args.metadata,
      searchText,
      trendScore: args.trend.trendScore,
      hiddenGemScore: args.trend.hiddenGemScore,
      sourceCount: args.trend.sourceCount,
    }),
  );

  return {
    documentKey,
    kind: args.kind,
    window: args.window,
    topicSlug: args.trend.slug,
    topicName: args.trend.topic,
    category: args.trend.category,
    title: args.title.slice(0, 500),
    description: args.description.slice(0, 900),
    badge: args.badge.slice(0, 120),
    metadata: args.metadata.slice(0, 260),
    searchText,
    trendScore: args.trend.trendScore,
    hiddenGemScore: args.trend.hiddenGemScore,
    sourceCount: args.trend.sourceCount,
    matchedFields: args.matchedFields,
    sourceHash,
    embedding: toPgVectorLiteral(createSemanticEmbedding(searchText)),
  };
}

async function upsertSemanticSearchDocumentsBatch(
  documents: SemanticSearchDocument[],
) {
  if (documents.length === 0) return;

  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const values = documents.map((document) => sql`(
    ${document.documentKey},
    ${document.kind},
    ${document.window},
    ${document.topicSlug},
    ${document.topicName},
    ${document.category},
    ${document.title},
    ${document.description},
    ${document.badge},
    ${document.metadata},
    ${document.searchText},
    ${document.embedding}::vector,
    ${document.trendScore},
    ${document.hiddenGemScore},
    ${document.sourceCount},
    ${JSON.stringify(document.matchedFields)}::jsonb,
    ${document.sourceHash},
    ${new Date()}
  )`);

  await db.execute(sql`
    INSERT INTO semantic_search_documents (
      document_key,
      kind,
      window,
      topic_slug,
      topic_name,
      category,
      title,
      description,
      badge,
      metadata,
      search_text,
      embedding,
      trend_score,
      hidden_gem_score,
      source_count,
      matched_fields,
      source_hash,
      updated_at
    )
    VALUES ${sql.join(values, sql`, `)}
    ON CONFLICT (document_key) DO UPDATE SET
      kind = EXCLUDED.kind,
      window = EXCLUDED.window,
      topic_slug = EXCLUDED.topic_slug,
      topic_name = EXCLUDED.topic_name,
      category = EXCLUDED.category,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      badge = EXCLUDED.badge,
      metadata = EXCLUDED.metadata,
      search_text = EXCLUDED.search_text,
      embedding = EXCLUDED.embedding,
      trend_score = EXCLUDED.trend_score,
      hidden_gem_score = EXCLUDED.hidden_gem_score,
      source_count = EXCLUDED.source_count,
      matched_fields = EXCLUDED.matched_fields,
      source_hash = EXCLUDED.source_hash,
      updated_at = EXCLUDED.updated_at
  `);
}

function chunkDocuments<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function dedupeDocuments(documents: SemanticSearchDocument[]) {
  const seen = new Map<string, SemanticSearchDocument>();

  for (const document of documents) {
    seen.set(document.documentKey, document);
  }

  return Array.from(seen.values());
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }

  return output;
}

function compactText(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 9000);
}

function pickText(values: Array<string | null | undefined>) {
  return (
    values.find((value): value is string => Boolean(value?.trim()))?.trim() ??
    "Semantic match from the current radar index."
  );
}
