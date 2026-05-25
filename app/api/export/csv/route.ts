import { getDashboardTrends, normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import { buildApiErrorBody } from "@/lib/security/api-error";

function neutralizeSpreadsheetFormula(value: string) {
  const trimmed = value.trimStart();
  if (/^[=+\-@]/.test(trimmed)) return `'${value}`;
  return value;
}

function csvCell(value: string | number | null | undefined) {
  const safeValue = neutralizeSpreadsheetFormula(String(value ?? ""));
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const window = normalizeDashboardWindow(searchParams.get("window"));
    const data = await getDashboardTrends(window);
    const header = [
      "topic",
      "category",
      "status",
      "trendScore",
      "hiddenGemScore",
      "contentScore",
      "saturation",
      "sources",
      "lastSeenAt",
    ];
    const rows = data.trends.map((trend) =>
      [
        trend.topic,
        trend.category,
        trend.status,
        trend.trendScore,
        trend.hiddenGemScore,
        trend.contentScore,
        trend.saturation,
        trend.sources.join(" | "),
        trend.lastSeenAt,
      ]
        .map(csvCell)
        .join(","),
    );

    return new Response([header.join(","), ...rows].join("\n"), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=trend-finder-${window}-export.csv`,
      },
    });
  } catch (error) {
    return Response.json(
      buildApiErrorBody("CSV export could not be generated from current trend data.", error),
      { status: 500 },
    );
  }
}
