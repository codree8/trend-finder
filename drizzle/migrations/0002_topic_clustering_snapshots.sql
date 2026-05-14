CREATE TABLE IF NOT EXISTS "topic_mentions" (
  "id" serial PRIMARY KEY NOT NULL,
  "topic_id" integer NOT NULL,
  "topic_slug" varchar(220) NOT NULL,
  "source" varchar(80) NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "published_at" timestamp,
  "engagement" integer DEFAULT 0,
  "weight" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "topic_mentions_topic_source_external_idx"
  ON "topic_mentions" ("topic_id", "source", "external_id");

CREATE INDEX IF NOT EXISTS "topic_mentions_topic_slug_idx"
  ON "topic_mentions" ("topic_slug");

CREATE INDEX IF NOT EXISTS "topic_mentions_created_at_idx"
  ON "topic_mentions" ("created_at");

CREATE INDEX IF NOT EXISTS "raw_signals_created_at_idx"
  ON "raw_signals" ("created_at");

ALTER TABLE "trend_snapshots"
  ADD COLUMN IF NOT EXISTS "mention_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "source_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "total_engagement" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "top_signals" jsonb;

CREATE INDEX IF NOT EXISTS "trend_snapshots_topic_id_idx"
  ON "trend_snapshots" ("topic_id");

CREATE INDEX IF NOT EXISTS "trend_snapshots_window_idx"
  ON "trend_snapshots" ("window");

CREATE INDEX IF NOT EXISTS "trend_snapshots_created_at_idx"
  ON "trend_snapshots" ("created_at");
