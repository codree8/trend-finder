import { NextResponse } from "next/server";
import { buildAutomationConfigContract } from "@/lib/trends/automation-config";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const config = buildAutomationConfigContract();

    return NextResponse.json(
      {
        ok: true,
        schemaVersion: "daily-brief-automation-config-endpoint-v1",
        automationType: "daily_brief_automation_config_contract",
        generatedAt: new Date().toISOString(),
        config,
        sourceChecks: {
          safetyMode: config.safetyMode,
          automationEnabled: config.automationEnabled,
          liveEmailEnabled: config.liveEmailEnabled,
          cronEnabled: config.cronEnabled,
          manualApprovalRequired: config.manualApprovalRequired,
          manualSendOnly: config.manualSendOnly,
          recipients: config.recipients,
          recipientsCount: config.recipients.length,
          blockedCapabilities: config.blockedCapabilities.map(
            (item) => item.id,
          ),
          allowedWindows: config.allowedWindows,
          allowedChannels: config.allowedChannels.map((item) => item.id),
          criticalIntegrityFailures: config.configIntegrityChecks.filter(
            (item) => item.critical && !item.passed,
          ).length,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Automation-Config-Safety-Mode": config.safetyMode,
          "X-Automation-Enabled": "false",
          "X-Live-Email-Enabled": "false",
          "X-Cron-Enabled": "false",
          "X-Manual-Approval-Required": "true",
          "X-Manual-Send-Only": "true",
          "X-Recipients-Count": "0",
        },
      },
    );
  } catch (error) {
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to generate Daily Brief automation config contract.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
