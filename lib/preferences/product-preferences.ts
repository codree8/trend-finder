import type { DashboardWindow } from "@/lib/trends/types";

export const workspaceStorageKey = "trend-finder-workspace-view";
export const productPreferencesStorageKey = "trend-finder-product-preferences-v1";
export const productPreferencesChangedEvent = "trend-finder-product-preferences-changed";

export type WorkspaceView = "product" | "admin";
export type ProductLens = "creator-startup";
export type DefaultExportFormat = "pdf" | "html" | "json" | "markdown";
export type BriefTone = "executive" | "creator" | "research";
export type ProductExperienceMode = "standard" | "demo" | "pitch";

export type DashboardSectionPreferences = {
  charts: boolean;
  sourceBreakdown: boolean;
  trendTimeline: boolean;
  hiddenGems: boolean;
  creatorMode: boolean;
  signals: boolean;
  scanHealth: boolean;
  watchlist: boolean;
  actionQueue: boolean;
};

export type ReportSectionPreferences = {
  executiveSummary: boolean;
  priorityActions: boolean;
  watchlistMovement: boolean;
  hiddenGems: boolean;
  creatorOpportunities: boolean;
  topicsToAvoid: boolean;
  recommendedFocus: boolean;
};

export type ProductPreferences = {
  schemaVersion: 1;
  defaultWorkspace: WorkspaceView;
  defaultLens: ProductLens;
  defaultBriefWindow: DashboardWindow;
  defaultExport: DefaultExportFormat;
  briefTone: BriefTone;
  experienceMode: ProductExperienceMode;
  dashboardSections: DashboardSectionPreferences;
  reportSections: ReportSectionPreferences;
  onboardingDismissed: boolean;
};

const dashboardWindows = ["24h", "7d", "30d"] as const;
const workspaceViews = ["product", "admin"] as const;
const defaultExports = ["pdf", "html", "json", "markdown"] as const;
const briefTones = ["executive", "creator", "research"] as const;
const experienceModes = ["standard", "demo", "pitch"] as const;

export const defaultProductPreferences: ProductPreferences = {
  schemaVersion: 1,
  defaultWorkspace: "product",
  defaultLens: "creator-startup",
  defaultBriefWindow: "7d",
  defaultExport: "pdf",
  briefTone: "executive",
  experienceMode: "standard",
  dashboardSections: {
    charts: true,
    sourceBreakdown: true,
    trendTimeline: true,
    hiddenGems: true,
    creatorMode: true,
    signals: true,
    scanHealth: true,
    watchlist: true,
    actionQueue: true,
  },
  reportSections: {
    executiveSummary: true,
    priorityActions: true,
    watchlistMovement: true,
    hiddenGems: true,
    creatorOpportunities: true,
    topicsToAvoid: true,
    recommendedFocus: true,
  },
  onboardingDismissed: false,
};

export const pitchProductPreferences: ProductPreferences = {
  ...defaultProductPreferences,
  defaultBriefWindow: "7d",
  defaultExport: "pdf",
  briefTone: "executive",
  experienceMode: "pitch",
  dashboardSections: {
    ...defaultProductPreferences.dashboardSections,
    scanHealth: false,
  },
};

export const demoProductPreferences: ProductPreferences = {
  ...defaultProductPreferences,
  defaultBriefWindow: "7d",
  defaultExport: "pdf",
  briefTone: "creator",
  experienceMode: "demo",
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && values.includes(value as T[number]) ? value : fallback;
}

export function parseDashboardWindow(
  value: string | null | undefined,
  fallback: DashboardWindow = defaultProductPreferences.defaultBriefWindow,
): DashboardWindow {
  return oneOf(value, dashboardWindows, fallback) as DashboardWindow;
}

export function parseWorkspaceView(
  value: string | null | undefined,
  fallback: WorkspaceView = defaultProductPreferences.defaultWorkspace,
): WorkspaceView {
  return oneOf(value, workspaceViews, fallback) as WorkspaceView;
}

export function mergeProductPreferences(value: unknown): ProductPreferences {
  if (!isRecord(value)) return defaultProductPreferences;

  const dashboardSections = isRecord(value.dashboardSections)
    ? value.dashboardSections
    : {};
  const reportSections = isRecord(value.reportSections) ? value.reportSections : {};

  return {
    schemaVersion: 1,
    defaultWorkspace: parseWorkspaceView(
      typeof value.defaultWorkspace === "string" ? value.defaultWorkspace : null,
    ),
    defaultLens: "creator-startup",
    defaultBriefWindow: parseDashboardWindow(
      typeof value.defaultBriefWindow === "string" ? value.defaultBriefWindow : null,
    ),
    defaultExport: oneOf(
      value.defaultExport,
      defaultExports,
      defaultProductPreferences.defaultExport,
    ) as DefaultExportFormat,
    briefTone: oneOf(
      value.briefTone,
      briefTones,
      defaultProductPreferences.briefTone,
    ) as BriefTone,
    experienceMode: oneOf(
      value.experienceMode,
      experienceModes,
      defaultProductPreferences.experienceMode,
    ) as ProductExperienceMode,
    dashboardSections: {
      ...defaultProductPreferences.dashboardSections,
      ...booleanRecordPatch(
        dashboardSections,
        defaultProductPreferences.dashboardSections,
      ),
    },
    reportSections: {
      ...defaultProductPreferences.reportSections,
      ...booleanRecordPatch(reportSections, defaultProductPreferences.reportSections),
    },
    onboardingDismissed:
      typeof value.onboardingDismissed === "boolean"
        ? value.onboardingDismissed
        : defaultProductPreferences.onboardingDismissed,
  };
}

function booleanRecordPatch<T extends Record<string, boolean>>(
  source: UnknownRecord,
  defaults: T,
): Partial<T> {
  return Object.keys(defaults).reduce<Partial<T>>((patch, key) => {
    const typedKey = key as keyof T;
    const nextValue = source[key];
    if (typeof nextValue === "boolean") {
      patch[typedKey] = nextValue as T[keyof T];
    }
    return patch;
  }, {});
}

export function readProductPreferences(): ProductPreferences {
  if (typeof window === "undefined") return defaultProductPreferences;

  try {
    const raw = window.localStorage.getItem(productPreferencesStorageKey);
    if (!raw) return defaultProductPreferences;
    return mergeProductPreferences(JSON.parse(raw));
  } catch {
    return defaultProductPreferences;
  }
}

export function writeProductPreferences(
  nextPreferences: ProductPreferences,
): ProductPreferences {
  const normalized = mergeProductPreferences(nextPreferences);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      productPreferencesStorageKey,
      JSON.stringify(normalized),
    );
    window.localStorage.setItem(workspaceStorageKey, normalized.defaultWorkspace);
    window.dispatchEvent(
      new CustomEvent<ProductPreferences>(productPreferencesChangedEvent, {
        detail: normalized,
      }),
    );
  }

  return normalized;
}

export function updateProductPreferences(
  updater:
    | Partial<ProductPreferences>
    | ((current: ProductPreferences) => ProductPreferences),
): ProductPreferences {
  const current = readProductPreferences();
  const next =
    typeof updater === "function"
      ? updater(current)
      : mergeProductPreferences({ ...current, ...updater });

  return writeProductPreferences(next);
}

export function readPreferredWorkspaceView(pathname?: string): WorkspaceView {
  if (pathname?.startsWith("/admin")) return "admin";
  if (typeof window === "undefined") return defaultProductPreferences.defaultWorkspace;

  const storedWorkspace = parseWorkspaceView(
    window.localStorage.getItem(workspaceStorageKey),
    readProductPreferences().defaultWorkspace,
  );

  return storedWorkspace;
}

export function writePreferredWorkspaceView(nextView: WorkspaceView) {
  if (typeof window === "undefined") return;

  const normalizedView = parseWorkspaceView(nextView);
  window.localStorage.setItem(workspaceStorageKey, normalizedView);
  updateProductPreferences((current) => ({
    ...current,
    defaultWorkspace: normalizedView,
  }));
}

export function markOnboardingDismissed() {
  return updateProductPreferences((current) => ({
    ...current,
    onboardingDismissed: true,
  }));
}

export function resetProductPreferences() {
  return writeProductPreferences(defaultProductPreferences);
}
