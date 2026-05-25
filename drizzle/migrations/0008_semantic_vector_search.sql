CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "semantic_search_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_key" varchar(360) NOT NULL UNIQUE,
  "kind" varchar(32) NOT NULL,
  "window" varchar(16) NOT NULL,
  "topic_slug" varchar(220) NOT NULL,
  "topic_name" varchar(220) NOT NULL,
  "category" varchar(80) NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "badge" varchar(120) NOT NULL,
  "metadata" text NOT NULL,
  "search_text" text NOT NULL,
  "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce("search_text", ''))) STORED,
  "embedding" vector(384) NOT NULL,
  "trend_score" integer DEFAULT 0 NOT NULL,
  "hidden_gem_score" integer DEFAULT 0 NOT NULL,
  "source_count" integer DEFAULT 0 NOT NULL,
  "matched_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_hash" varchar(64) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "semantic_search_documents_window_idx"
  ON "semantic_search_documents" ("window");

CREATE INDEX IF NOT EXISTS "semantic_search_documents_kind_idx"
  ON "semantic_search_documents" ("kind");

CREATE INDEX IF NOT EXISTS "semantic_search_documents_topic_slug_idx"
  ON "semantic_search_documents" ("topic_slug");

CREATE INDEX IF NOT EXISTS "semantic_search_documents_search_vector_idx"
  ON "semantic_search_documents" USING gin ("search_vector");

CREATE TABLE IF NOT EXISTS "semantic_search_index_state" (
  "window" varchar(16) PRIMARY KEY NOT NULL,
  "source_hash" varchar(64) NOT NULL,
  "document_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
