import { generateHtmlReport } from "@/lib/reports/generate-html-report";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const html = await generateHtmlReport(window);

    return new Response(html, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename=trend-finder-${window}-report.html`,
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: "HTML export could not be generated from current trend data.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
