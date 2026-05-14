import { NextResponse } from "next/server";
import { trends } from "@/lib/data/mock-trends";

export async function GET() {
  return NextResponse.json({ generatedAt: new Date().toISOString(), trends });
}
