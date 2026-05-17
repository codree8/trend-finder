import type { DailyBriefReportDocument, DashboardWindow } from "@/lib/trends/types";

export const reportHistoryStorageKey = "trend-finder-report-history-v1";
export const reportHistoryChangedEvent = "trend-finder-report-history-changed";

export type SavedReportHistoryItem = {
  id: string;
  title: string;
  window: DashboardWindow;
  template: string;
  generatedAt: string;
  savedAt: string;
  readinessLabel: string;
  summary: string;
  markdown: string;
  sectionCount: number;
  blockCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseItem(value: unknown): SavedReportHistoryItem | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  const title = typeof value.title === "string" ? value.title : null;
  const generatedAt = typeof value.generatedAt === "string" ? value.generatedAt : null;
  const savedAt = typeof value.savedAt === "string" ? value.savedAt : null;
  const markdown = typeof value.markdown === "string" ? value.markdown : null;
  if (!id || !title || !generatedAt || !savedAt || !markdown) return null;

  return {
    id,
    title,
    window: value.window === "24h" || value.window === "30d" ? value.window : "7d",
    template: typeof value.template === "string" ? value.template : "executive",
    generatedAt,
    savedAt,
    readinessLabel:
      typeof value.readinessLabel === "string" ? value.readinessLabel : "Saved",
    summary: typeof value.summary === "string" ? value.summary : "Saved report snapshot.",
    markdown,
    sectionCount: typeof value.sectionCount === "number" ? value.sectionCount : 0,
    blockCount: typeof value.blockCount === "number" ? value.blockCount : 0,
  };
}

export function readReportHistory(): SavedReportHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(reportHistoryStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseItem).filter((item): item is SavedReportHistoryItem => item !== null);
  } catch {
    return [];
  }
}

export function writeReportHistory(items: SavedReportHistoryItem[]) {
  const safeItems = items.slice(0, 20);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(reportHistoryStorageKey, JSON.stringify(safeItems));
    window.dispatchEvent(new CustomEvent(reportHistoryChangedEvent, { detail: safeItems }));
  }
  return safeItems;
}

export function saveReportSnapshot(
  document: DailyBriefReportDocument,
  template: string,
  readinessLabel: string,
) {
  const item: SavedReportHistoryItem = {
    id: `${Date.now()}-${document.window}`,
    title: document.title,
    window: document.window,
    template,
    generatedAt: document.generatedAt,
    savedAt: new Date().toISOString(),
    readinessLabel,
    summary: document.quickCopy.summary,
    markdown: document.quickCopy.markdown,
    sectionCount: document.integrity.sectionCount,
    blockCount: document.integrity.blockCount,
  };

  return writeReportHistory([item, ...readReportHistory()]);
}

export function deleteSavedReport(id: string) {
  return writeReportHistory(readReportHistory().filter((item) => item.id !== id));
}
