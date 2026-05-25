import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { siteCounters } from "@/lib/db/schema";
import { buildApiErrorBody } from "@/lib/security/api-error";

const LANDING_VISITS_COUNTER_KEY = "landing_page_sessions";

function jsonResponse(total: number) {
  return NextResponse.json(
    { ok: true, total },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

async function readTotal() {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [row] = await db
    .select({ total: siteCounters.totalCount })
    .from(siteCounters)
    .where(sql`${siteCounters.counterKey} = ${LANDING_VISITS_COUNTER_KEY}`)
    .limit(1);

  return row?.total ?? 0;
}

async function incrementTotal() {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [row] = await db
    .insert(siteCounters)
    .values({
      counterKey: LANDING_VISITS_COUNTER_KEY,
      totalCount: 1,
    })
    .onConflictDoUpdate({
      target: siteCounters.counterKey,
      set: {
        totalCount: sql`${siteCounters.totalCount} + 1`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ total: siteCounters.totalCount });

  return row?.total ?? 0;
}

export async function GET() {
  try {
    return jsonResponse(await readTotal());
  } catch (error) {
    return NextResponse.json(buildApiErrorBody("Unable to read visit counter.", error), { status: 500 });
  }
}

export async function POST() {
  try {
    return jsonResponse(await incrementTotal());
  } catch (error) {
    return NextResponse.json(buildApiErrorBody("Unable to update visit counter.", error), { status: 500 });
  }
}
