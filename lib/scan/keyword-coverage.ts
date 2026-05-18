import { aiCategories, type AiCategory } from "@/lib/config/ai-categories";
import { buildScanKeywords } from "@/lib/config/build-scan-keywords";
import { categoryKeywordPacks } from "@/lib/config/category-keyword-packs";
import {
  getKeywordCapForSource,
  getScanKeywordLimitProfile,
  type ScanMode,
  type ScanSourceKind,
} from "@/lib/config/scan-keyword-limits";

export type KeywordCoverageStatus = "Ready" | "Review" | "Thin coverage";

export type KeywordCoverageRow = {
  category: AiCategory;
  keywordCount: number;
  balancedSampleCount: number;
  categoryScanCount: number;
  deepScanCount: number;
  deepScanAvailable: boolean;
  coverageStatus: KeywordCoverageStatus;
  note: string;
};

export type SourceKeywordCapRow = {
  source: ScanSourceKind;
  balanced: number;
  category: number;
  deep: number;
};

export type KeywordCoverageSummary = {
  totalCategories: number;
  readyCategories: number;
  reviewCategories: number;
  thinCategories: number;
  totalKeywords: number;
  averageKeywordsPerCategory: number;
  rows: KeywordCoverageRow[];
  sourceCaps: SourceKeywordCapRow[];
  modes: Array<{
    mode: ScanMode;
    maxKeywords: number;
    coreKeywords: number;
    perCategoryKeywords: number;
  }>;
};

function statusForKeywordCount(count: number): KeywordCoverageStatus {
  if (count >= 24) return "Ready";
  if (count >= 16) return "Review";
  return "Thin coverage";
}

function noteForStatus(status: KeywordCoverageStatus, category: AiCategory) {
  if (status === "Ready") {
    return `${category} has enough keyword depth for balanced and category scans.`;
  }
  if (status === "Review") {
    return `${category} is usable, but the pack should be expanded after real scan results.`;
  }
  return `${category} needs more focused keywords before relying on deep scans.`;
}

export function getKeywordCoverageSummary(): KeywordCoverageSummary {
  const balancedProfile = getScanKeywordLimitProfile("balanced");
  const categoryProfile = getScanKeywordLimitProfile("category");
  const deepProfile = getScanKeywordLimitProfile("deep");
  const rows = aiCategories.map((category) => {
    const pack = categoryKeywordPacks[category];
    const keywordCount = pack.keywords.length;
    const coverageStatus = statusForKeywordCount(keywordCount);

    return {
      category,
      keywordCount,
      balancedSampleCount: Math.min(
        keywordCount,
        balancedProfile.perCategoryKeywords,
      ),
      categoryScanCount: Math.min(
        keywordCount,
        categoryProfile.perCategoryKeywords,
      ),
      deepScanCount: Math.min(keywordCount, deepProfile.perCategoryKeywords),
      deepScanAvailable: keywordCount >= 16,
      coverageStatus,
      note: noteForStatus(coverageStatus, category),
    } satisfies KeywordCoverageRow;
  });
  const totalKeywords = rows.reduce((sum, row) => sum + row.keywordCount, 0);
  const readyCategories = rows.filter(
    (row) => row.coverageStatus === "Ready",
  ).length;
  const reviewCategories = rows.filter(
    (row) => row.coverageStatus === "Review",
  ).length;
  const thinCategories = rows.filter(
    (row) => row.coverageStatus === "Thin coverage",
  ).length;
  const sources: ScanSourceKind[] = [
    "GitHub",
    "Hacker News",
    "RSS",
    "YouTube",
    "arXiv",
    "default",
  ];

  return {
    totalCategories: rows.length,
    readyCategories,
    reviewCategories,
    thinCategories,
    totalKeywords,
    averageKeywordsPerCategory: Math.round(totalKeywords / rows.length),
    rows,
    sourceCaps: sources.map((source) => ({
      source,
      balanced: getKeywordCapForSource("balanced", source),
      category: getKeywordCapForSource("category", source),
      deep: getKeywordCapForSource("deep", source),
    })),
    modes: (["balanced", "category", "deep"] as const).map((mode) => {
      const profile = getScanKeywordLimitProfile(mode);
      return {
        mode,
        maxKeywords: profile.maxKeywords,
        coreKeywords: profile.coreKeywords,
        perCategoryKeywords: profile.perCategoryKeywords,
      };
    }),
  };
}

export function getKeywordCoveragePreview(mode: ScanMode, category?: AiCategory) {
  return buildScanKeywords({ mode, category });
}
