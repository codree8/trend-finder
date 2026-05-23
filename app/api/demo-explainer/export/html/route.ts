import { buildProductExplainerDocument } from "@/lib/demo/product-explainer-document";
import {
  buildProductExplainerHtmlExport,
  buildProductExplainerHtmlFilename,
} from "@/lib/demo/product-explainer-html";

export const dynamic = "force-dynamic";

function shouldDownload(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const document = buildProductExplainerDocument();
  const html = buildProductExplainerHtmlExport(document);
  const dispositionType = shouldDownload(searchParams.get("download"))
    ? "attachment"
    : "inline";

  return new Response(html, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `${dispositionType}; filename="${buildProductExplainerHtmlFilename()}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
