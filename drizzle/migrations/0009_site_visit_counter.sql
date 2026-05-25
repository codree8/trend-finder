CREATE TABLE IF NOT EXISTS "site_counters" (
  "counter_key" varchar(120) PRIMARY KEY NOT NULL,
  "total_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
