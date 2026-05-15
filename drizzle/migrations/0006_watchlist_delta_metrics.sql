ALTER TABLE "saved_trends"
  ADD COLUMN IF NOT EXISTS "last_seen_mention_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_seen_source_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_seen_total_engagement" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;

CREATE INDEX IF NOT EXISTS "saved_trends_last_seen_at_idx"
  ON "saved_trends" ("last_seen_at");
