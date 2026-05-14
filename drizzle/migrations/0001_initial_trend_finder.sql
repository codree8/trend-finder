CREATE TABLE IF NOT EXISTS "sources" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(80) NOT NULL UNIQUE,
  "type" varchar(40) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "raw_signals" (
  "id" serial PRIMARY KEY NOT NULL,
  "source" varchar(80) NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "author" varchar(160),
  "published_at" timestamp,
  "engagement" integer DEFAULT 0,
  "raw_payload" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "raw_signals_source_external_id_idx" ON "raw_signals" ("source", "external_id");

CREATE TABLE IF NOT EXISTS "topics" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(180) NOT NULL,
  "slug" varchar(220) NOT NULL UNIQUE,
  "category" varchar(80) NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "trend_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "topic_id" integer NOT NULL,
  "window" varchar(16) NOT NULL,
  "trend_score" integer NOT NULL,
  "hidden_gem_score" integer NOT NULL,
  "content_score" integer NOT NULL,
  "velocity_score" integer NOT NULL,
  "saturation_score" integer NOT NULL,
  "source_diversity_score" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scan_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "status" varchar(32) NOT NULL,
  "summary" text,
  "raw_payload" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(180) NOT NULL,
  "html" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
