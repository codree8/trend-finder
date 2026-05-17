import { getDashboardTrends, normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import type { DashboardWindow } from "@/lib/trends/types";

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function generateHtmlReport(requestedWindow: DashboardWindow = "7d") {
  const window = normalizeDashboardWindow(requestedWindow);
  const data = await getDashboardTrends(window);
  const rows = data.trends
    .map(
      (trend) => `
        <tr>
          <td>${escapeHtml(trend.topic)}</td>
          <td>${escapeHtml(trend.category)}</td>
          <td>${escapeHtml(trend.status)}</td>
          <td>${escapeHtml(trend.trendScore)}</td>
          <td>${escapeHtml(trend.hiddenGemScore)}</td>
          <td>${escapeHtml(trend.contentScore)}</td>
          <td>${escapeHtml(trend.sources.join(" · "))}</td>
        </tr>`,
    )
    .join("");

  const emptyState = data.trends.length
    ? ""
    : `<p class="empty">No current trend snapshots were found for ${escapeHtml(window)}. Run a scan, then open the export again.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Trend Finder Report</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; background: #241616; color: #fff8f5; padding: 40px; }
    h1 { color: #fff8f5; letter-spacing: -0.04em; }
    p { color: #f3e7e2; line-height: 1.6; }
    .meta { color: #dda936; font-size: 13px; text-transform: uppercase; letter-spacing: .16em; }
    .empty { border: 1px solid rgba(221,169,54,.3); border-radius: 18px; padding: 16px; background: rgba(221,169,54,.08); }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid rgba(231,210,203,.18); padding: 12px; text-align: left; vertical-align: top; }
    th { color: #dda936; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
  </style>
</head>
<body>
  <p class="meta">Window: ${escapeHtml(data.window)} · Generated: ${escapeHtml(new Date(data.generatedAt).toLocaleString("en"))}</p>
  <h1>Trend Finder AI Signal Report</h1>
  <p>Report generated from the current local trend snapshots and source signals. No mock trend data is used.</p>
  ${emptyState}
  <table>
    <thead><tr><th>Topic</th><th>Category</th><th>Status</th><th>Trend</th><th>Hidden Gem</th><th>Content</th><th>Sources</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
