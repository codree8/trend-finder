import { NextResponse } from "next/server";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { parseReportTemplateId } from "@/lib/preferences/product-preferences";
import { buildTemplateReportDocument } from "@/lib/reports/report-templates";
import { buildResearchMemoExportQa } from "@/lib/reports/research-memo-qa";
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
    const template = parseReportTemplateId(searchParams.get("template"));
    const brief = await getDailyBrief(window);
    const document = buildTemplateReportDocument(brief.reportDocument, template);
    const exportQa = buildReportsExportFlowQa(document);
    const printQa = buildDailyBriefPrintLayoutQa(document);
    const pdf = buildDailyBriefServerPdf(document, { template });
    const serverPdfQa = buildDailyBriefServerPdfReliabilityQa({
      document,
      pdf,
      printQa,
    });
    const researchMemoQa = buildResearchMemoExportQa(document, template);
    const readiness = buildExportSystemReadiness({
      document,
      exportQa,
      printQa,
      serverPdfQa,
      researchMemoQa,
    });

    return NextResponse.json(
      {
        ok: true,
        schemaVersion: "daily-brief-export-readiness-endpoint-v1",
        exportType: "daily_intelligence_brief_export_readiness",
        generatedAt: new Date().toISOString(),
        window,
        template,
        readiness,
        researchMemoQa,
        sourceChecks: {
          exportFlowStatus: exportQa.status,
          printLayoutStatus: printQa.status,
          serverPdfStatus: serverPdfQa.status,
          reportDocumentSchema: document.schemaVersion,
          researchMemoQaStatus: researchMemoQa.status,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Export-System-Readiness": readiness.status,
          "X-Export-System-Readiness-Score": String(readiness.score),
          "X-Local-Boundary": String(readiness.localBoundaryScore),
          "X-Research-Memo-QA": researchMemoQa.status,
          "X-Research-Memo-QA-Score": String(researchMemoQa.score),
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
