import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export type CronLock = {
  lockKey: string;
  owner: string;
  acquiredAt: string;
  expiresAt: string;
};

function createOwnerId(lockKey: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${lockKey}-${Date.now()}-${random}`;
}

function toJsonb(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

export async function acquireCronLock(args: {
  lockKey: string;
  ttlSeconds: number;
  metadata?: Record<string, unknown>;
}): Promise<CronLock | null> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured. Cron locks require database persistence.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + args.ttlSeconds * 1000);
  const owner = createOwnerId(args.lockKey);
  const metadata = toJsonb({
    ...args.metadata,
    ttlSeconds: args.ttlSeconds,
    acquiredBy: "trend-finder-cron",
  });

  const result = await db.execute<{
    lock_key: string;
    owner: string;
    locked_at: Date;
    expires_at: Date;
  }>(sql`
    INSERT INTO cron_job_locks (
      lock_key,
      owner,
      locked_at,
      expires_at,
      metadata,
      updated_at
    )
    VALUES (
      ${args.lockKey},
      ${owner},
      ${now},
      ${expiresAt},
      ${metadata}::jsonb,
      ${now}
    )
    ON CONFLICT (lock_key) DO UPDATE SET
      owner = EXCLUDED.owner,
      locked_at = EXCLUDED.locked_at,
      expires_at = EXCLUDED.expires_at,
      metadata = EXCLUDED.metadata,
      updated_at = EXCLUDED.updated_at
    WHERE cron_job_locks.expires_at < ${now}
    RETURNING lock_key, owner, locked_at, expires_at
  `);

  const row = result.rows[0];
  if (!row) return null;

  return {
    lockKey: row.lock_key,
    owner: row.owner,
    acquiredAt: new Date(row.locked_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export async function releaseCronLock(lock: CronLock) {
  const db = getDb();
  if (!db) return;

  await db.execute(sql`
    UPDATE cron_job_locks
    SET expires_at = ${new Date()}, updated_at = ${new Date()}
    WHERE lock_key = ${lock.lockKey} AND owner = ${lock.owner}
  `);
}
