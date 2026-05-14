import {
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
  }),
);

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  category: varchar("category", { length: 80 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const trendSnapshots = pgTable("trend_snapshots", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  window: varchar("window", { length: 16 }).notNull(),
  trendScore: integer("trend_score").notNull(),
  hiddenGemScore: integer("hidden_gem_score").notNull(),
  contentScore: integer("content_score").notNull(),
  velocityScore: integer("velocity_score").notNull(),
  saturationScore: integer("saturation_score").notNull(),
  sourceDiversityScore: integer("source_diversity_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
