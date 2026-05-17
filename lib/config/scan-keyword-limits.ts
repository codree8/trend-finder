export type ScanMode = "balanced" | "category" | "deep";

export type ScanSourceKind =
  | "GitHub"
  | "Hacker News"
  | "RSS"
  | "YouTube"
  | "arXiv"
  | "default";

export type ScanKeywordLimitProfile = {
  coreKeywords: number;
  perCategoryKeywords: number;
  maxKeywords: number;
  perSourceKeywordCaps: Record<ScanSourceKind, number>;
};

export const scanKeywordLimitProfiles = {
  balanced: {
    coreKeywords: 10,
    perCategoryKeywords: 4,
    maxKeywords: 80,
    perSourceKeywordCaps: {
      GitHub: 18,
      "Hacker News": 18,
      RSS: 80,
      YouTube: 8,
      arXiv: 12,
      default: 18,
    },
  },
  category: {
    coreKeywords: 8,
    perCategoryKeywords: 24,
    maxKeywords: 42,
    perSourceKeywordCaps: {
      GitHub: 16,
      "Hacker News": 16,
      RSS: 42,
      YouTube: 7,
      arXiv: 10,
      default: 16,
    },
  },
  deep: {
    coreKeywords: 10,
    perCategoryKeywords: 40,
    maxKeywords: 70,
    perSourceKeywordCaps: {
      GitHub: 24,
      "Hacker News": 24,
      RSS: 70,
      YouTube: 8,
      arXiv: 12,
      default: 24,
    },
  },
} as const satisfies Record<ScanMode, ScanKeywordLimitProfile>;

export function getScanKeywordLimitProfile(mode: ScanMode) {
  return scanKeywordLimitProfiles[mode];
}

export function getKeywordCapForSource(mode: ScanMode, source: string): number {
  const profile = getScanKeywordLimitProfile(mode);
  return (
    profile.perSourceKeywordCaps[source as ScanSourceKind] ??
    profile.perSourceKeywordCaps.default
  );
}
