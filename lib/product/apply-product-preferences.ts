import type { ProductPreferences, SourceWeightPreferences } from "@/lib/preferences/product-preferences";
import type { DashboardTrend } from "@/lib/trends/types";

function normalizedText(value: string) {
  return value.toLowerCase().trim();
}

function trendSearchText(trend: DashboardTrend) {
  return [
    trend.topic,
    trend.category,
    trend.summary,
    trend.whyNow,
    trend.contentHook,
    ...trend.aliases,
    ...trend.relatedLabels,
    ...trend.sources,
  ]
    .join(" ")
    .toLowerCase();
}

function sourceKey(source: string): keyof SourceWeightPreferences | null {
  const normalized = normalizedText(source).replace(/[\s_-]+/g, "-");
  if (normalized.includes("github")) return "github";
  if (normalized.includes("hacker") || normalized === "hn") return "hackerNews";
  if (normalized.includes("rss") || normalized.includes("blog")) return "rss";
  if (normalized.includes("reddit")) return "reddit";
  if (normalized.includes("youtube")) return "youtube";
  if (normalized.includes("arxiv")) return "arxiv";
  return null;
}

export function sourceWeightMultiplier(
  sources: string[],
  weights: SourceWeightPreferences,
) {
  const matchedWeights = sources
    .map(sourceKey)
    .filter((key): key is keyof SourceWeightPreferences => key !== null)
    .map((key) => weights[key]);

  if (matchedWeights.length === 0) return 1;
  return matchedWeights.reduce((sum, value) => sum + value, 0) / matchedWeights.length;
}

export function productPreferenceScore(
  trend: DashboardTrend,
  preferences: ProductPreferences,
) {
  const profile = preferences.interestProfile;
  const text = trendSearchText(trend);
  const includeKeywords = profile.includeKeywords.map(normalizedText).filter(Boolean);
  const excludeKeywords = profile.excludeKeywords.map(normalizedText).filter(Boolean);
  const blocked = excludeKeywords.some((keyword) => text.includes(keyword));

  if (blocked || trend.trendScore < profile.minimumTrendScore) return -1;

  const categoryBoost = profile.preferredCategories.includes(trend.category) ? 10 : 0;
  const keywordBoost = includeKeywords.reduce(
    (score, keyword) => score + (text.includes(keyword) ? 8 : 0),
    0,
  );
  const hiddenGemBoost =
    profile.prioritizeHiddenGems && trend.status === "Hidden Gem" ? 8 : 0;
  const sourceMultiplier = sourceWeightMultiplier(trend.sources, preferences.sourceWeights);

  return Math.round(
    (trend.trendScore + categoryBoost + keywordBoost + hiddenGemBoost) * sourceMultiplier,
  );
}

export function applyProductTrendPreferences<T extends DashboardTrend>(
  trends: T[],
  preferences: ProductPreferences,
) {
  return trends
    .map((trend) => ({ trend, score: productPreferenceScore(trend, preferences) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || b.trend.trendScore - a.trend.trendScore)
    .map((item) => item.trend);
}
