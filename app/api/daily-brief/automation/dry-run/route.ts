import { NextResponse } from "next/server";
import { buildAutomationDryRunManifest } from "@/lib/trends/automation-dry-run-manifest";
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
    const manifest = buildAutomationDryRunManifest({
      brief,
      document: brief.reportDocument,
      exportQa,
      printQa,
      serverPdfQa,
      readiness,
    });

    return NextResponse.json(
      {
        ok: true,
        schemaVersion: "daily-brief-automation-dry-run-endpoint-v1",
        automationType: "daily_brief_automation_dry_run",
        generatedAt: new Date().toISOString(),
        window,
        manifest,
        sourceChecks: {
          dryRun: manifest.dryRun,
          noEmailSent: manifest.integrity.noEmailSent,
          noCronCreated: manifest.integrity.noCronCreated,
          noDatabaseWrite: manifest.integrity.noDatabaseWrite,
          exportReadinessStatus: readiness.status,
          automationReadiness: readiness.automationStatus,
          serverPdfStatus: serverPdfQa.status,
          reportDocumentSchema: brief.reportDocument.schemaVersion,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Automation-Dry-Run": "true",
          "X-Automation-Dry-Run-Status": manifest.status,
          "X-Automation-Dry-Run-Outcome": manifest.simulatedOutcome,
          "X-Automation-Dry-Run-Blockers": String(manifest.metrics.blockers),
          "X-No-Email-Sent": "true",
          "X-No-Cron-Created": "true",
        },
      },
    );
  } catch (error) {
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to generate Daily Brief automation dry-run manifest.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
