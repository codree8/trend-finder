import { buildProductExplainerDocument } from "@/lib/demo/product-explainer-document";
import { buildProductExplainerPdf } from "@/lib/demo/product-explainer-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function truthy(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const document = buildProductExplainerDocument();
  const pdf = buildProductExplainerPdf(document);
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
      "X-Explainer-PDF-Pages": String(pdf.pageCount),
    },
  });
}
