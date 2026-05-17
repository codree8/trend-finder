import { aiCategories, isAiCategory, type AiCategory } from "@/lib/config/ai-categories";
import { categoryKeywordPacks } from "@/lib/config/category-keyword-packs";
import { coreAiKeywords } from "@/lib/config/scan-keywords";
import {
  getKeywordCapForSource,
  getScanKeywordLimitProfile,
  type ScanMode,
} from "@/lib/config/scan-keyword-limits";

export type BuildScanKeywordsOptions = {
  mode?: ScanMode;
  category?: AiCategory | string | null;
  rotationSeed?: number | string | Date;
  source?: string;
  extraKeywords?: readonly string[];
};

export type ScanKeywordBuildResult = {
  mode: ScanMode;
  category: AiCategory | null;
  keywords: string[];
  sourceKeywords: string[];
  keywordCount: number;
  sourceKeywordCount: number;
  categoryCoverage: Array<{
    category: AiCategory;
    selectedKeywords: number;
    totalKeywords: number;
  }>;
  sourceKeywordCap: number;
};

function normalizeKeyword(keyword: string): string {
  return keyword.replace(/\s+/g, " ").trim();
}

function dedupeKeywords(keywords: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const keyword of keywords) {
    const normalized = normalizeKeyword(keyword);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(normalized);
  }

  return unique;
}

function seedToNumber(seed: number | string | Date | undefined): number {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return Math.abs(Math.floor(seed));
  }

  const raw =
    seed instanceof Date
      ? seed.toISOString().slice(0, 10)
      : typeof seed === "string"
        ? seed
        : new Date().toISOString().slice(0, 10);

  return Array.from(raw).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function rotateKeywords(
  keywords: readonly string[],
  count: number,
  seed: number | string | Date | undefined,
): string[] {
  if (count <= 0 || keywords.length === 0) return [];
  if (keywords.length <= count) return [...keywords];

  const start = seedToNumber(seed) % keywords.length;
  const rotated = [...keywords.slice(start), ...keywords.slice(0, start)];
  return rotated.slice(0, count);
}

function getValidCategory(category: BuildScanKeywordsOptions["category"]): AiCategory | null {
  return typeof category === "string" && isAiCategory(category) ? category : null;
}

function buildBalancedKeywords(args: {
  rotationSeed: BuildScanKeywordsOptions["rotationSeed"];
  perCategoryKeywords: number;
}) {
  const categoryCoverage: ScanKeywordBuildResult["categoryCoverage"] = [];
  const categoryKeywords = aiCategories.flatMap((category, index) => {
    const pack = categoryKeywordPacks[category];
    const selected = rotateKeywords(
      pack.keywords,
      args.perCategoryKeywords,
      `${seedToNumber(args.rotationSeed)}:${index}`,
    );

    categoryCoverage.push({
      category,
      selectedKeywords: selected.length,
      totalKeywords: pack.keywords.length,
    });

    return selected;
  });

  return { categoryKeywords, categoryCoverage };
}

function buildCategoryKeywords(args: {
  category: AiCategory;
  mode: ScanMode;
  rotationSeed: BuildScanKeywordsOptions["rotationSeed"];
  perCategoryKeywords: number;
}) {
  const pack = categoryKeywordPacks[args.category];
  const selected =
    args.mode === "deep"
      ? rotateKeywords(pack.keywords, args.perCategoryKeywords, args.rotationSeed)
      : rotateKeywords(pack.keywords, args.perCategoryKeywords, args.rotationSeed);

  return {
    categoryKeywords: selected,
    categoryCoverage: [
      {
        category: args.category,
        selectedKeywords: selected.length,
        totalKeywords: pack.keywords.length,
      },
    ],
  };
}

export function buildScanKeywords(
  options: BuildScanKeywordsOptions = {},
): ScanKeywordBuildResult {
  const requestedMode = options.mode ?? "balanced";
  const category = getValidCategory(options.category);
  const mode: ScanMode =
    requestedMode === "balanced" || category ? requestedMode : "balanced";
  const profile = getScanKeywordLimitProfile(mode);
  const coreKeywords = coreAiKeywords.slice(0, profile.coreKeywords);

  const categorySelection =
    mode === "balanced" || !category
      ? buildBalancedKeywords({
          rotationSeed: options.rotationSeed,
          perCategoryKeywords: profile.perCategoryKeywords,
        })
      : buildCategoryKeywords({
          category,
          mode,
          rotationSeed: options.rotationSeed,
          perCategoryKeywords: profile.perCategoryKeywords,
        });

  const keywords = dedupeKeywords([
    ...coreKeywords,
    ...categorySelection.categoryKeywords,
    ...(options.extraKeywords ?? []),
  ]).slice(0, profile.maxKeywords);
  const sourceKeywordCap = getKeywordCapForSource(mode, options.source ?? "default");
  const sourceKeywords = keywords.slice(0, sourceKeywordCap);

  return {
    mode,
    category,
    keywords,
    sourceKeywords,
    keywordCount: keywords.length,
    sourceKeywordCount: sourceKeywords.length,
    categoryCoverage: categorySelection.categoryCoverage,
    sourceKeywordCap,
  };
}

export function buildSourceKeywords(
  options: BuildScanKeywordsOptions = {},
): string[] {
  return buildScanKeywords(options).sourceKeywords;
}
