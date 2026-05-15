ALTER TABLE "raw_signals"
  ADD COLUMN IF NOT EXISTS "normalized_url" text,
  ADD COLUMN IF NOT EXISTS "content_hash" varchar(64),
  ADD COLUMN IF NOT EXISTS "signal_fingerprint" varchar(96),
  ADD COLUMN IF NOT EXISTS "quality_score" integer DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "raw_signals_signal_fingerprint_idx"
  ON "raw_signals" ("signal_fingerprint");

CREATE INDEX IF NOT EXISTS "raw_signals_normalized_url_idx"
  ON "raw_signals" ("normalized_url");

CREATE INDEX IF NOT EXISTS "raw_signals_content_hash_idx"
  ON "raw_signals" ("content_hash");

CREATE INDEX IF NOT EXISTS "raw_signals_quality_score_idx"
  ON "raw_signals" ("quality_score");

ALTER TABLE "topic_mentions"
  ADD COLUMN IF NOT EXISTS "normalized_url" text,
  ADD COLUMN IF NOT EXISTS "content_hash" varchar(64),
  ADD COLUMN IF NOT EXISTS "signal_fingerprint" varchar(96),
  ADD COLUMN IF NOT EXISTS "quality_score" integer DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "topic_mentions_topic_fingerprint_idx"
  ON "topic_mentions" ("topic_id", "signal_fingerprint");

CREATE INDEX IF NOT EXISTS "topic_mentions_quality_score_idx"
  ON "topic_mentions" ("quality_score");
