import { NextResponse } from "next/server";
import { getDailyBrief } from "@/lib/trends/daily-brief";
import { parseReportTemplateId } from "@/lib/preferences/product-preferences";
import { buildTemplateReportDocument } from "@/lib/reports/report-templates";
import { buildDailyBriefPrintLayoutQa } from "@/lib/trends/daily-brief-print-layout-qa";
import { buildDailyBriefServerPdf } from "@/lib/trends/daily-brief-server-pdf";
import { buildDailyBriefServerPdfReliabilityQa } from "@/lib/trends/daily-brief-server-pdf-qa";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { DailyBriefErrorResponse } from "@/lib/trends/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function truthy(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const template = parseReportTemplateId(searchParams.get("template"));
    const brief = await getDailyBrief(window);
    const document = buildTemplateReportDocument(brief.reportDocument, template);
    const printQa = buildDailyBriefPrintLayoutQa(document);
    const pdf = buildDailyBriefServerPdf(document, { template });
    const pdfReliabilityQa = buildDailyBriefServerPdfReliabilityQa({
      document,
      pdf,
      printQa,
    });
    const dispositionType = truthy(searchParams.get("inline"))
      ? "inline"
      : "attachment";

    const body = pdf.bytes.buffer.slice(
      pdf.bytes.byteOffset,
      pdf.bytes.byteOffset + pdf.bytes.byteLength,
    ) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${pdf.filename}"`,
        "Content-Length": String(pdf.bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
        "X-Server-PDF-Export": "daily-brief-server-pdf-v1",
        "X-Server-PDF-Pages": String(pdf.pageCount),
        "X-Server-PDF-Byte-Size": String(pdf.bytes.byteLength),
        "X-Server-PDF-QA-Status": pdfReliabilityQa.status,
        "X-Server-PDF-QA-Score": String(pdfReliabilityQa.score),
        "X-Server-PDF-Health": `/api/daily-brief/export/pdf/health?window=${window}&template=${template}`,
        "X-Print-Layout-Status": printQa.status,
        "X-Print-Layout-Score": String(printQa.score),
        "X-Estimated-Print-Pages": String(printQa.metrics.estimatedPages),
      },
    });
  } catch (error) {
    const body: DailyBriefErrorResponse = {
      ok: false,
      message: "Failed to export Daily Intelligence Brief PDF.",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return NextResponse.json(body, { status: 500 });
  }
}
