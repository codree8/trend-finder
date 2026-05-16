import { NextResponse } from "next/server";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { buildDailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import { buildDailyBriefServerPdf } from "@/lib/trends/daily-brief-server-pdf";
import { buildDailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const brief = await getDailyBrief(window);
    const printQa = buildDailyBriefPrintLayoutQa(brief.reportDocument);
    const pdf = buildDailyBriefServerPdf(brief.reportDocument);
    const reliabilityQa = buildDailyBriefServerPdfReliabilityQa({
      document: brief.reportDocument,
      pdf,
      printQa,
    });

    return NextResponse.json(
      {
        ok: true,
        schemaVersion: "daily-brief-server-pdf-health-v1",
        exportType: "daily_intelligence_brief_server_pdf_health",
        generatedAt: new Date().toISOString(),
        window,
        pdf: {
          filename: pdf.filename,
          pageCount: pdf.pageCount,
          byteSize: pdf.bytes.byteLength,
          kilobytes: Math.round((pdf.bytes.byteLength / 1024) * 10) / 10,
        },
        printQa: {
          status: printQa.status,
          statusLabel: printQa.statusLabel,
          score: printQa.score,
          estimatedPages: printQa.metrics.estimatedPages,
        },
        qa: reliabilityQa,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Server-PDF-QA-Status": reliabilityQa.status,
          "X-Server-PDF-QA-Score": String(reliabilityQa.score),
          "X-Server-PDF-Byte-Size": String(pdf.bytes.byteLength),
          "X-Server-PDF-Pages": String(pdf.pageCount),
        },
      },
    );
  } catch (error) {
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to inspect Daily Intelligence Brief PDF health.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
