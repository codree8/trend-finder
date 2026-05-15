ALTER TABLE "topics"
  ADD COLUMN IF NOT EXISTS "canonical_key" varchar(220),
  ADD COLUMN IF NOT EXISTS "aliases" jsonb,
  ADD COLUMN IF NOT EXISTS "related_labels" jsonb;

UPDATE "topics"
SET "canonical_key" = "slug"
WHERE "canonical_key" IS NULL;

CREATE INDEX IF NOT EXISTS "topics_canonical_key_idx"
  ON "topics" ("canonical_key");

ALTER TABLE "topic_mentions"
  ADD COLUMN IF NOT EXISTS "canonical_topic_key" varchar(220),
  ADD COLUMN IF NOT EXISTS "matched_alias" varchar(220);

UPDATE "topic_mentions"
SET "canonical_topic_key" = "topic_slug"
WHERE "canonical_topic_key" IS NULL;

CREATE INDEX IF NOT EXISTS "topic_mentions_canonical_topic_key_idx"
  ON "topic_mentions" ("canonical_topic_key");

CREATE INDEX IF NOT EXISTS "topic_mentions_matched_alias_idx"
  ON "topic_mentions" ("matched_alias");
