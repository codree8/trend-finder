import { getSourceProfile } from "@/lib/scoring/source-profiles";
import type { DashboardTopSignal } from "@/lib/trends/types";

export type SourceQualityCategory =
  | "code"
  | "builder-community"
  | "editorial"
  | "social"
  | "video"
  | "research"
  | "unknown";

export type SourceQualityContribution = {
  source: string;
  category: SourceQualityCategory;
  signalCount: number;
  share: number;
  trustScore: number;
  connectorReliability: number;
  warning: string | null;
};

export type SourceQualitySummary = {
  sourceTrustScore: number;
  sourceFreshnessScore: number;
  sourceDiversityScore: number;
  connectorReliabilityScore: number;
  crossSourceConfirmationScore: number;
  duplicateSourcePressure: number;
  singleSourceRisk: "low" | "medium" | "high";
  overrepresentedSourceWarning: string | null;
  weakSourceWarning: string | null;
  primarySourceCategory: SourceQualityCategory;
  confirmedSourceCount: number;
  contribution: SourceQualityContribution[];
  summary: string;
};

type BuildSourceQualityInput = {
  sources: string[];
  topSignals?: DashboardTopSignal[];
  mentionCount?: number;
  sourceCount?: number;
  freshnessScore?: number;
};

const connectorReliabilityByCategory: Record<SourceQualityCategory, number> = {
  code: 88,
  "builder-community": 82,
  editorial: 78,
  social: 68,
  video: 62,
  research: 86,
  unknown: 58,
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weightedAverage<T>(items: T[], score: (item: T) => number, weight: (item: T) => number, fallback = 0) {
  const usable = items
    .map((item) => ({ score: score(item), weight: weight(item) }))
    .filter((item) => Number.isFinite(item.score) && Number.isFinite(item.weight) && item.weight > 0);
  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0);
  if (usable.length === 0 || totalWeight <= 0) return fallback;
  return usable.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
}

function normalizeSource(source: string) {
  const normalized = source.trim().toLowerCase().replace(/[\s_]+/g, "-");

  if (normalized.includes("github")) return "GitHub";
  if (normalized.includes("hacker") || normalized === "hn") return "Hacker News";
  if (normalized.includes("reddit")) return "Reddit";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized.includes("arxiv")) return "arXiv";
  if (normalized.includes("rss") || normalized.includes("blog")) return "RSS / Blogs";
  return source.trim() || "Unknown";
}

export function sourceCategory(source: string): SourceQualityCategory {
  const normalized = source.trim().toLowerCase();

  if (normalized.includes("github")) return "code";
  if (normalized.includes("hacker") || normalized === "hn") return "builder-community";
  if (normalized.includes("reddit")) return "social";
  if (normalized.includes("youtube")) return "video";
  if (normalized.includes("arxiv")) return "research";
  if (normalized.includes("rss") || normalized.includes("blog")) return "editorial";
  return "unknown";
}

function sourceLabelList(sources: string[]) {
  if (sources.length === 0) return "no confirmed source labels";
  if (sources.length === 1) return sources[0];
  if (sources.length === 2) return `${sources[0]} and ${sources[1]}`;
  return `${sources[0]}, ${sources[1]} and ${sources[2]}`;
}

function buildCounts(input: BuildSourceQualityInput) {
  const counts = new Map<string, number>();

  for (const source of input.sources) {
    const label = normalizeSource(source);
    counts.set(label, Math.max(1, counts.get(label) ?? 0));
  }

  for (const signal of input.topSignals ?? []) {
    const label = normalizeSource(signal.source);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  if (counts.size === 0) counts.set("Unknown", 1);
  return counts;
}

export function buildSourceQualitySummary(
  input: BuildSourceQualityInput,
): SourceQualitySummary {
  const counts = buildCounts(input);
  const totalSignalsFromCounts = Array.from(counts.values()).reduce(
    (sum, value) => sum + value,
    0,
  );
  const expectedSourceCount = Math.max(
    input.sourceCount ?? 0,
    input.sources.length,
    counts.size,
  );
  const contribution = Array.from(counts.entries())
    .map(([source, signalCount]) => {
      const category = sourceCategory(source);
      const profile = getSourceProfile(source);
      const share = signalCount / Math.max(1, totalSignalsFromCounts);
      const trustScore = clampScore(profile.credibility);
      const connectorReliability = connectorReliabilityByCategory[category];
      const warning =
        trustScore < 64
          ? "Weak source trust"
          : share >= 0.72 && counts.size > 1
            ? "Overrepresented in this trend"
            : null;

      return {
        source,
        category,
        signalCount,
        share,
        trustScore,
        connectorReliability,
        warning,
      } satisfies SourceQualityContribution;
    })
    .sort((a, b) => b.signalCount - a.signalCount || b.trustScore - a.trustScore);

  const sourceTrustScore = clampScore(
    weightedAverage(contribution, (item) => item.trustScore, (item) => Math.max(0.35, item.share), 58),
  );
  const connectorReliabilityScore = clampScore(
    weightedAverage(contribution, (item) => item.connectorReliability, (item) => Math.max(0.35, item.share), 58),
  );
  const sourceDiversityScore = clampScore(
    Math.min(100, expectedSourceCount * 24 + Math.max(0, counts.size - 1) * 8),
  );
  const crossSourceConfirmationScore = clampScore(
    counts.size <= 1
      ? Math.min(42, (input.mentionCount ?? 0) * 8)
      : Math.min(100, counts.size * 26 + (input.mentionCount ?? 0) * 3),
  );
  const largestShare = Math.max(...contribution.map((item) => item.share));
  const duplicateSourcePressure = clampScore(
    largestShare * 100 - Math.max(0, counts.size - 1) * 10,
  );
  const singleSourceRisk =
    counts.size <= 1 && (input.mentionCount ?? 0) <= 3
      ? "high"
      : counts.size <= 1
        ? "medium"
        : "low";
  const overrepresented = contribution.find(
    (item) => item.share >= 0.72 && contribution.length > 1,
  );
  const weak = contribution.find((item) => item.trustScore < 64);
  const primary = contribution[0];
  const sourceFreshnessScore = clampScore(
    input.freshnessScore ?? Math.min(100, 48 + (input.mentionCount ?? 0) * 6),
  );
  const confirmedSources = contribution.map((item) => item.source);

  const summary =
    singleSourceRisk === "high"
      ? `Needs more confirmation: most evidence is coming from ${sourceLabelList(confirmedSources)}.`
      : crossSourceConfirmationScore >= 72
        ? `Source confidence is healthy across ${sourceLabelList(confirmedSources)}.`
        : `Source confidence is usable, but still needs broader confirmation beyond ${sourceLabelList(confirmedSources)}.`;

  return {
    sourceTrustScore,
    sourceFreshnessScore,
    sourceDiversityScore,
    connectorReliabilityScore,
    crossSourceConfirmationScore,
    duplicateSourcePressure,
    singleSourceRisk,
    overrepresentedSourceWarning: overrepresented
      ? `${overrepresented.source} is carrying ${Math.round(overrepresented.share * 100)}% of visible evidence.`
      : null,
    weakSourceWarning: weak
      ? `${weak.source} has weaker source trust than the rest of the stack.`
      : null,
    primarySourceCategory: primary?.category ?? "unknown",
    confirmedSourceCount: counts.size,
    contribution,
    summary,
  };
}
