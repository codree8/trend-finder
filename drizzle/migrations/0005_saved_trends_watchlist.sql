CREATE TABLE IF NOT EXISTS "saved_trends" (
  "id" serial PRIMARY KEY NOT NULL,
  "trend_key" varchar(220) NOT NULL,
  "trend_slug" varchar(220) NOT NULL,
  "topic" varchar(220) NOT NULL,
  "saved_at" timestamp DEFAULT now() NOT NULL,
  "last_seen_score" integer DEFAULT 0 NOT NULL,
  "last_seen_creator_opportunity_score" integer DEFAULT 0 NOT NULL,
  "last_seen_quality_score" integer DEFAULT 0 NOT NULL,
  "last_seen_lifecycle_status" varchar(40),
  "note" text,
  "tags" jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_trends_trend_key_idx"
  ON "saved_trends" ("trend_key");

CREATE INDEX IF NOT EXISTS "saved_trends_trend_slug_idx"
  ON "saved_trends" ("trend_slug");

CREATE INDEX IF NOT EXISTS "saved_trends_saved_at_idx"
  ON "saved_trends" ("saved_at");
