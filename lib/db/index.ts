import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type TrendFinderDb = NonNullable<ReturnType<typeof getDb>>;
