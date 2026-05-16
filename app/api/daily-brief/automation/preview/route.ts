import { NextResponse } from "next/server";
import { buildAutomationDryRunGuardrails } from "@/lib/trends/automation-dry-run-guardrails";
import { buildAutomationDryRunManifest } from "@/lib/trends/automation-dry-run-manifest";
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

    return NextResponse.json(
      {
        ok: true,
        schemaVersion: "daily-brief-automation-preview-endpoint-v1",
        automationType: "daily_brief_automation_preview_console",
        generatedAt: new Date().toISOString(),
        window,
        preview,
        sourceChecks: {
          dryRun: manifest.dryRun,
          automationMode: preview.automationMode,
          noEmailSent: manifest.integrity.noEmailSent,
          noCronCreated: manifest.integrity.noCronCreated,
          noDatabaseWrite: manifest.integrity.noDatabaseWrite,
          recipients: manifest.recipientPlan.recipients,
          liveEmailEnabled: manifest.recipientPlan.liveEmailEnabled,
          scheduledJobCreated: manifest.triggerPlan.scheduledJobCreated,
          cronEnabled: manifest.triggerPlan.cronEnabled,
          previewStatus: preview.previewStatus,
          guardrailStatus: guardrails.guardrailStatus,
          exportReadinessStatus: readiness.status,
          simulatedSendRisk: guardrails.simulatedSendRisk.level,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Automation-Preview-Status": preview.previewStatus,
          "X-Automation-Mode": preview.automationMode,
          "X-Automation-Dry-Run": "true",
          "X-No-Email-Sent": "true",
          "X-No-Cron-Created": "true",
          "X-No-Database-Write": "true",
          "X-Simulated-Send-Risk": guardrails.simulatedSendRisk.level,
          "X-Safety-Score": String(guardrails.safetyScore),
        },
      },
    );
  } catch (error) {
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to generate Daily Brief automation preview console.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
