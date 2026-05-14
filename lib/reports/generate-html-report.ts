import { trends } from "@/lib/data/mock-trends";

export function generateHtmlReport() {
  const rows = trends
    .map(
      (trend) => `
        <tr>
          <td>${trend.topic}</td>
          <td>${trend.status}</td>
          <td>${trend.trendScore}</td>
          <td>${trend.hiddenGemScore}</td>
          <td>${trend.contentScore}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Trend Finder Report</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; background: #241616; color: #fff8f5; padding: 40px; }
    h1 { color: #fff8f5; }
    p { color: #f3e7e2; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid rgba(231,210,203,.18); padding: 12px; text-align: left; }
    th { color: #dda936; }
  </style>
</head>
<body>
  <h1>Trend Finder AI Signal Report</h1>
  <p>Starter report generated from mock trend data.</p>
  <table>
    <thead><tr><th>Topic</th><th>Status</th><th>Trend</th><th>Hidden Gem</th><th>Content</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
