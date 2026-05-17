import type { ScanMode } from "@/lib/config/scan-keyword-limits";

export function normalizeScanMode(value: unknown): ScanMode {
  return value === "category" || value === "deep" || value === "balanced"
    ? value
    : "balanced";
}

export function scanModeLabel(mode: ScanMode, category?: string | null) {
  if ((mode === "category" || mode === "deep") && category) {
    return `${mode === "deep" ? "Deep" : "Category"} scan: ${category}`;
  }

  return "Balanced AI scan";
}
