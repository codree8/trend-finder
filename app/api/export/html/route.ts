import { generateHtmlReport } from "@/lib/reports/generate-html-report";

export async function GET() {
  return new Response(generateHtmlReport(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "attachment; filename=trend-finder-report.html",
    },
  });
}
