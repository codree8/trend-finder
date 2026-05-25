CREATE TABLE IF NOT EXISTS "cron_job_locks" (
  "lock_key" varchar(120) PRIMARY KEY NOT NULL,
  "owner" varchar(220) NOT NULL,
  "locked_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "metadata" jsonb,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cron_job_locks_expires_at_idx"
  ON "cron_job_locks" ("expires_at");
