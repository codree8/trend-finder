import { NextResponse } from "next/server";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { buildDailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import { buildDailyBriefServerPdf } from "@/lib/trends/daily-brief-server-pdf";
import { buildDailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import { buildExportSystemReadiness } from "@/lib/trends/export-system-readiness";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import { buildReportsExportFlowQa } from "@/lib/trends/reports-export-flow-qa";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const brief = await getDailyBrief(window);
    const exportQa = buildReportsExportFlowQa(brief.reportDocument);
    const printQa = buildDailyBriefPrintLayoutQa(brief.reportDocument);
    const pdf = buildDailyBriefServerPdf(brief.reportDocument);
    const serverPdfQa = buildDailyBriefServerPdfReliabilityQa({
      document: brief.reportDocument,
      pdf,
      printQa,
    });
    const readiness = buildExportSystemReadiness({
      document: brief.reportDocument,
      exportQa,
      printQa,
      serverPdfQa,
    });

    return NextResponse.json(
      {
        ok: true,
        schemaVersion: "daily-brief-export-readiness-endpoint-v1",
        exportType: "daily_intelligence_brief_export_readiness",
        generatedAt: new Date().toISOString(),
        window,
        readiness,
        sourceChecks: {
          exportFlowStatus: exportQa.status,
          printLayoutStatus: printQa.status,
          serverPdfStatus: serverPdfQa.status,
          reportDocumentSchema: brief.reportDocument.schemaVersion,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Export-System-Readiness": readiness.status,
          "X-Export-System-Readiness-Score": String(readiness.score),
          "X-Automation-Readiness": readiness.automationStatus,
          "X-Critical-Blockers": String(readiness.metrics.criticalBlockers),
        },
      },
    );
  } catch (error) {
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to inspect Daily Brief export readiness.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
