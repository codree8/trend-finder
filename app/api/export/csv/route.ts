import { trends } from "@/lib/data/mock-trends";

export async function GET() {
  const header = "topic,status,trendScore,hiddenGemScore,contentScore,saturation";
  const rows = trends.map((trend) =>
    [trend.topic, trend.status, trend.trendScore, trend.hiddenGemScore, trend.contentScore, trend.saturation]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );

  return new Response([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=trend-finder-export.csv",
    },
  });
}
