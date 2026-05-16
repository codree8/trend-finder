import { NextResponse } from "next/server";
import { buildAutomationConfigContract } from "@/lib/trends/automation-config";
import { buildAutomationDryRunGuardrails } from "@/lib/trends/automation-dry-run-guardrails";
import { buildAutomationDryRunManifest } from "@/lib/trends/automation-dry-run-manifest";
import { buildAutomationPreLiveChecklist } from "@/lib/trends/automation-pre-live-checklist";
import { buildAutomationPreviewConsole } from "@/lib/trends/automation-preview-console";
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
    const guardrails = buildAutomationDryRunGuardrails({ manifest, readiness });
    const preview = buildAutomationPreviewConsole({
      manifest,
      guardrails,
      readiness,
      serverPdfQa,
    });
    const config = buildAutomationConfigContract();
    const checklist = buildAutomationPreLiveChecklist({
      config,
      manifest,
      guardrails,
      preview,
      readiness,
      serverPdfQa,
    });

    return NextResponse.json(
      {
        ok: true,
        schemaVersion: "daily-brief-automation-pre-live-checklist-endpoint-v1",
        automationType: "daily_brief_automation_pre_live_checklist",
        generatedAt: new Date().toISOString(),
        window,
        checklist,
        sourceChecks: {
          canGoLive: checklist.goNoGo.canGoLive,
          checklistStatus: checklist.checklistStatus,
          liveReadinessStatus: checklist.liveReadinessStatus,
          overallScore: checklist.overallScore,
          hardBlockers: checklist.hardBlockers.length,
          criticalMissingItems: checklist.criticalMissingItems.length,
          automationEnabled: config.automationEnabled,
          liveEmailEnabled: config.liveEmailEnabled,
          cronEnabled: config.cronEnabled,
          recipients: config.recipients,
          noEmailSent: manifest.integrity.noEmailSent,
          noCronCreated: manifest.integrity.noCronCreated,
          noDatabaseWrite: manifest.integrity.noDatabaseWrite,
          simulatedSendRisk: guardrails.simulatedSendRisk.level,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Pre-Live-Checklist-Status": checklist.checklistStatus,
          "X-Live-Readiness-Status": checklist.liveReadinessStatus,
          "X-Can-Go-Live": "false",
          "X-Automation-Enabled": "false",
          "X-Live-Email-Enabled": "false",
          "X-Cron-Enabled": "false",
          "X-Recipients-Count": "0",
          "X-No-Email-Sent": "true",
          "X-No-Cron-Created": "true",
          "X-No-Database-Write": "true",
        },
      },
    );
  } catch (error) {
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to generate Daily Brief automation pre-live checklist.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
