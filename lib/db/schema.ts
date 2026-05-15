import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  type: varchar("type", { length: 40 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rawSignals = pgTable(
  "raw_signals",
  {
    id: serial("id").primaryKey(),
    source: varchar("source", { length: 80 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url"),
    contentHash: varchar("content_hash", { length: 64 }),
    signalFingerprint: varchar("signal_fingerprint", { length: 96 }),
    qualityScore: integer("quality_score").default(0),
    author: varchar("author", { length: 160 }),
    publishedAt: timestamp("published_at"),
    engagement: integer("engagement").default(0),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sourceExternalIdIdx: uniqueIndex("raw_signals_source_external_id_idx").on(
      table.source,
      table.externalId,
    ),
    signalFingerprintIdx: uniqueIndex("raw_signals_signal_fingerprint_idx").on(
      table.signalFingerprint,
    ),
    normalizedUrlIdx: index("raw_signals_normalized_url_idx").on(
      table.normalizedUrl,
    ),
    contentHashIdx: index("raw_signals_content_hash_idx").on(table.contentHash),
    qualityScoreIdx: index("raw_signals_quality_score_idx").on(
      table.qualityScore,
    ),
    createdAtIdx: index("raw_signals_created_at_idx").on(table.createdAt),
  }),
);

export const topics = pgTable(
  "topics",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    canonicalKey: varchar("canonical_key", { length: 220 }),
    aliases: jsonb("aliases"),
    relatedLabels: jsonb("related_labels"),
    category: varchar("category", { length: 80 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    canonicalKeyIdx: index("topics_canonical_key_idx").on(table.canonicalKey),
  }),
);

export const topicMentions = pgTable(
  "topic_mentions",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id").notNull(),
    topicSlug: varchar("topic_slug", { length: 220 }).notNull(),
    canonicalTopicKey: varchar("canonical_topic_key", { length: 220 }),
    matchedAlias: varchar("matched_alias", { length: 220 }),
    source: varchar("source", { length: 80 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url"),
    contentHash: varchar("content_hash", { length: 64 }),
    signalFingerprint: varchar("signal_fingerprint", { length: 96 }),
    qualityScore: integer("quality_score").default(0),
    publishedAt: timestamp("published_at"),
    engagement: integer("engagement").default(0),
    weight: integer("weight").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    topicMentionUniqueIdx: uniqueIndex(
      "topic_mentions_topic_source_external_idx",
    ).on(table.topicId, table.source, table.externalId),
    topicMentionFingerprintIdx: uniqueIndex(
      "topic_mentions_topic_fingerprint_idx",
    ).on(table.topicId, table.signalFingerprint),
    topicMentionSlugIdx: index("topic_mentions_topic_slug_idx").on(
      table.topicSlug,
    ),
    topicMentionCanonicalKeyIdx: index(
      "topic_mentions_canonical_topic_key_idx",
    ).on(table.canonicalTopicKey),
    topicMentionMatchedAliasIdx: index("topic_mentions_matched_alias_idx").on(
      table.matchedAlias,
    ),
    topicMentionQualityIdx: index("topic_mentions_quality_score_idx").on(
      table.qualityScore,
    ),
    topicMentionCreatedAtIdx: index("topic_mentions_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const trendSnapshots = pgTable(
  "trend_snapshots",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id").notNull(),
    window: varchar("window", { length: 16 }).notNull(),
    trendScore: integer("trend_score").notNull(),
    hiddenGemScore: integer("hidden_gem_score").notNull(),
    contentScore: integer("content_score").notNull(),
    velocityScore: integer("velocity_score").notNull(),
    saturationScore: integer("saturation_score").notNull(),
    sourceDiversityScore: integer("source_diversity_score").notNull(),
    mentionCount: integer("mention_count").default(0).notNull(),
    sourceCount: integer("source_count").default(0).notNull(),
    totalEngagement: integer("total_engagement").default(0).notNull(),
    topSignals: jsonb("top_signals"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    trendSnapshotTopicIdx: index("trend_snapshots_topic_id_idx").on(
      table.topicId,
    ),
    trendSnapshotWindowIdx: index("trend_snapshots_window_idx").on(
      table.window,
    ),
    trendSnapshotCreatedAtIdx: index("trend_snapshots_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const scanRuns = pgTable("scan_runs", {
  id: serial("id").primaryKey(),
  status: varchar("status", { length: 32 }).notNull(),
  summary: text("summary"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  html: text("html").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedTrends = pgTable(
  "saved_trends",
  {
    id: serial("id").primaryKey(),
    trendKey: varchar("trend_key", { length: 220 }).notNull(),
    trendSlug: varchar("trend_slug", { length: 220 }).notNull(),
    topic: varchar("topic", { length: 220 }).notNull(),
    savedAt: timestamp("saved_at").defaultNow().notNull(),
    lastSeenScore: integer("last_seen_score").default(0).notNull(),
    lastSeenCreatorOpportunityScore: integer(
      "last_seen_creator_opportunity_score",
    )
      .default(0)
      .notNull(),
    lastSeenQualityScore: integer("last_seen_quality_score")
      .default(0)
      .notNull(),
    lastSeenLifecycleStatus: varchar("last_seen_lifecycle_status", {
      length: 40,
    }),
    note: text("note"),
    tags: jsonb("tags"),
  },
  (table) => ({
    savedTrendKeyIdx: uniqueIndex("saved_trends_trend_key_idx").on(
      table.trendKey,
    ),
    savedTrendSlugIdx: index("saved_trends_trend_slug_idx").on(table.trendSlug),
    savedTrendSavedAtIdx: index("saved_trends_saved_at_idx").on(table.savedAt),
  }),
);
