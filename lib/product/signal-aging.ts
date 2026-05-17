import { getSourceProfile } from "@/lib/scoring/source-profiles";
import type {
  SignalAgingBand,
  SignalAgingSourceContribution,
  TrendSignalAging,
} from "@/lib/trends/types";

type AgingSignal = {
  source: string;
  publishedAt?: string | null;
  createdAt?: string | null;
  engagement?: number | null;
  qualityScore?: number | null;
};

type BuildSignalAgingInput = {
  signals: AgingSignal[];
  snapshotCreatedAt: string | Date;
  trendScore: number;
  velocity: number;
  sourceCount: number;
  mentionCount: number;
  now?: Date;
};

const sourceHalfLifeHours: Record<string, number> = {
  github: 168,
  "hacker-news": 72,
  hn: 72,
  rss: 120,
  blog: 120,
  reddit: 96,
  youtube: 240,
  arxiv: 504,
  unknown: 120,
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeSource(source: string) {
  const normalized = source.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (normalized.includes("github")) return "github";
  if (normalized.includes("hacker") || normalized === "hn") return "hacker-news";
  if (normalized.includes("reddit")) return "reddit";
  if (normalized.includes("youtube")) return "youtube";
  if (normalized.includes("arxiv")) return "arxiv";
  if (normalized.includes("rss") || normalized.includes("blog")) return "rss";
  return normalized || "unknown";
}

function formatSource(source: string) {
  const normalized = normalizeSource(source);
  if (normalized === "github") return "GitHub";
  if (normalized === "hacker-news") return "Hacker News";
  if (normalized === "rss") return "RSS / Blogs";
  if (normalized === "reddit") return "Reddit";
  if (normalized === "youtube") return "YouTube";
  if (normalized === "arxiv") return "arXiv";
  return source || "Unknown";
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function signalDate(signal: AgingSignal) {
  return toDate(signal.publishedAt ?? signal.createdAt);
}

function ageHours(value: Date | string | null | undefined, now: Date) {
  const date = toDate(value);
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - date.getTime()) / 36e5);
}

function average(values: number[], fallback = 0) {
  const usable = values.filter(Number.isFinite);
  if (usable.length === 0) return fallback;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function median(values: number[], fallback = 0) {
  const usable = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (usable.length === 0) return fallback;
  const midpoint = Math.floor(usable.length / 2);
  return usable.length % 2 === 0
    ? (usable[midpoint - 1] + usable[midpoint]) / 2
    : usable[midpoint];
}

function halfLifeForSource(source: string) {
  return sourceHalfLifeHours[normalizeSource(source)] ?? sourceHalfLifeHours.unknown;
}

function freshnessFromAge(source: string, age: number) {
  const halfLife = halfLifeForSource(source);
  const decayFactor = Math.pow(0.5, age / halfLife);
  const profile = getSourceProfile(source);
  const credibilityFloor = Math.max(8, profile.credibility * 0.08);
  return clampScore(credibilityFloor + decayFactor * (100 - credibilityFloor));
}

function bandFromAge(source: string, age: number): SignalAgingBand {
  const halfLife = halfLifeForSource(source);
  if (age <= halfLife * 0.28) return "fresh";
  if (age <= halfLife * 0.9) return "active";
  if (age <= halfLife * 1.8) return "cooling";
  return "stale";
}

function statusLabel(status: TrendSignalAging["status"]) {
  const labels: Record<TrendSignalAging["status"], string> = {
    fresh: "Fresh signal",
    active: "Active signal",
    cooling: "Cooling signal",
    stale: "Stale evidence",
    resurfacing: "Resurfacing signal",
  };

  return labels[status];
}

function sourceSummary(source: string, band: SignalAgingBand, latestAge: number) {
  const ageText = latestAge <= 24 ? `${Math.round(latestAge)}h` : `${Math.round(latestAge / 24)}d`;

  if (band === "fresh") return `${formatSource(source)} is fresh; latest usable signal is ${ageText} old.`;
  if (band === "active") return `${formatSource(source)} is still active; latest signal is ${ageText} old.`;
  if (band === "cooling") return `${formatSource(source)} is cooling; do not over-weight older evidence.`;
  return `${formatSource(source)} is stale for this source type; require fresh confirmation before acting.`;
}

function buildSourceContributions(
  signals: Array<AgingSignal & { ageHours: number; freshnessScore: number; band: SignalAgingBand }>,
): SignalAgingSourceContribution[] {
  const grouped = new Map<string, Array<AgingSignal & { ageHours: number; freshnessScore: number; band: SignalAgingBand }>>();

  for (const signal of signals) {
    const key = formatSource(signal.source);
    grouped.set(key, [...(grouped.get(key) ?? []), signal]);
  }

  return Array.from(grouped.entries())
    .map(([source, items]) => {
      const ages = items.map((item) => item.ageHours);
      const latestSignalAgeHours = Math.round(Math.min(...ages));
      const averageSignalAgeHours = Math.round(average(ages));
      const freshnessScore = clampScore(average(items.map((item) => item.freshnessScore), 0));
      const staleCount = items.filter((item) => item.band === "stale").length;
      const coolingCount = items.filter((item) => item.band === "cooling").length;
      const freshOrActiveCount = items.filter((item) => item.band === "fresh" || item.band === "active").length;
      const sourceBand = bandFromAge(source, latestSignalAgeHours);
      const decayFactor = Math.max(0.05, freshnessScore / 100);
      const oldSourcePressure = clampScore(((staleCount * 18 + coolingCount * 8) / Math.max(1, items.length)) * 3.2);
      const contributionScore = clampScore(
        freshnessScore * 0.52 +
          Math.min(100, freshOrActiveCount * 28) * 0.22 +
          getSourceProfile(source).credibility * 0.18 -
          oldSourcePressure * 0.28,
      );

      return {
        source,
        signalCount: items.length,
        latestSignalAgeHours,
        averageSignalAgeHours,
        halfLifeHours: halfLifeForSource(source),
        freshnessScore,
        decayFactor: Math.round(decayFactor * 100) / 100,
        contributionScore,
        band: sourceBand,
        oldSourcePressure,
        summary: sourceSummary(source, sourceBand, latestSignalAgeHours),
      } satisfies SignalAgingSourceContribution;
    })
    .sort((a, b) => b.contributionScore - a.contributionScore || a.latestSignalAgeHours - b.latestSignalAgeHours);
}

export function buildSignalAgingProfile({
  signals,
  snapshotCreatedAt,
  trendScore,
  velocity,
  sourceCount,
  mentionCount,
  now = new Date(),
}: BuildSignalAgingInput): TrendSignalAging {
  const fallbackAge = ageHours(snapshotCreatedAt, now);
  const usableSignals = signals.length
    ? signals.map((signal) => {
        const date = signalDate(signal);
        const age = date ? ageHours(date, now) : fallbackAge;
        const freshnessScore = freshnessFromAge(signal.source, age);
        const band = bandFromAge(signal.source, age);

        return { ...signal, ageHours: age, freshnessScore, band };
      })
    : [
        {
          source: "Unknown",
          ageHours: fallbackAge,
          freshnessScore: freshnessFromAge("Unknown", fallbackAge),
          band: bandFromAge("Unknown", fallbackAge),
        },
      ];

  const ages = usableSignals.map((signal) => signal.ageHours);
  const latestSignalAgeHours = Math.round(Math.min(...ages));
  const medianSignalAgeHours = Math.round(median(ages, fallbackAge));
  const oldestSignalAgeHours = Math.round(Math.max(...ages));
  const sourceContributions = buildSourceContributions(usableSignals);
  const freshSignalCount = usableSignals.filter((signal) => signal.band === "fresh").length;
  const activeSignalCount = usableSignals.filter((signal) => signal.band === "active").length;
  const coolingSignalCount = usableSignals.filter((signal) => signal.band === "cooling").length;
  const staleSignalCount = usableSignals.filter((signal) => signal.band === "stale").length;
  const freshOrActiveCount = freshSignalCount + activeSignalCount;
  const overallFreshnessScore = clampScore(
    average(sourceContributions.map((source) => source.freshnessScore), 0) * 0.52 +
      Math.min(100, freshOrActiveCount * 18) * 0.2 +
      Math.min(100, sourceCount * 24) * 0.14 +
      velocity * 0.14,
  );
  const oldSourcePressure = clampScore(
    average(sourceContributions.map((source) => source.oldSourcePressure), 0) +
      Math.max(0, staleSignalCount - freshOrActiveCount) * 8,
  );
  const recentConfirmationScore = clampScore(
    Math.min(100, freshOrActiveCount * 22) * 0.44 +
      Math.min(100, sourceContributions.filter((source) => source.band === "fresh" || source.band === "active").length * 34) * 0.34 +
      Math.min(100, mentionCount * 7) * 0.12 +
      velocity * 0.1,
  );
  const decayPenalty = clampScore(
    oldSourcePressure * 0.56 +
      (overallFreshnessScore < 48 ? 18 : overallFreshnessScore < 62 ? 8 : 0) +
      (latestSignalAgeHours > 336 ? 18 : latestSignalAgeHours > 168 ? 10 : 0),
  );
  const freshnessBoost = clampScore(
    overallFreshnessScore >= 76 && recentConfirmationScore >= 62
      ? 10 + Math.min(12, (overallFreshnessScore - 75) * 0.28)
      : overallFreshnessScore >= 68
        ? 5
        : 0,
  );
  const resurfacingSignalCount = sourceContributions.filter(
    (source) => source.band === "fresh" && staleSignalCount > freshOrActiveCount && trendScore >= 45,
  ).length;
  const status: TrendSignalAging["status"] =
    resurfacingSignalCount > 0 && overallFreshnessScore >= 58
      ? "resurfacing"
      : overallFreshnessScore >= 78 && latestSignalAgeHours <= 48
        ? "fresh"
        : overallFreshnessScore >= 62
          ? "active"
          : overallFreshnessScore >= 42
            ? "cooling"
            : "stale";
  const warnings = [
    staleSignalCount > freshOrActiveCount ? "Older evidence outweighs fresh confirmation." : "",
    oldSourcePressure >= 45 ? "Old-source pressure is high; require a new scan before promoting." : "",
    recentConfirmationScore < 42 ? "Recent cross-source confirmation is weak." : "",
    status === "resurfacing" ? "The topic may be returning; treat this as renewed watch evidence before an Act call." : "",
  ].filter(Boolean);
  const summary =
    status === "fresh"
      ? `Fresh evidence is supporting this trend. Latest signal is ${latestSignalAgeHours <= 24 ? `${latestSignalAgeHours}h` : `${Math.round(latestSignalAgeHours / 24)}d`} old.`
      : status === "active"
        ? `Signals are still active, but watch whether the next scan confirms momentum.`
        : status === "resurfacing"
          ? `Fresh evidence appeared after older pressure. Treat this as resurfacing, not automatic validation.`
          : status === "cooling"
            ? `Signals are cooling. This needs fresher confirmation before it deserves action priority.`
            : `Evidence is stale for the current window. Do not let old signals carry the decision.`;
  const recommendedAction =
    status === "fresh"
      ? "Use the evidence now, but still check source quality before acting."
      : status === "active"
        ? "Keep it on the radar and confirm the next scan."
        : status === "resurfacing"
          ? "Watch the renewed signal and validate it across another source."
          : status === "cooling"
            ? "Downgrade from action to watch unless new evidence appears."
            : "Do not prioritize until a fresh signal appears.";

  return {
    status,
    statusLabel: statusLabel(status),
    overallFreshnessScore,
    decayPenalty,
    freshnessBoost,
    latestSignalAgeHours: Number.isFinite(latestSignalAgeHours) ? latestSignalAgeHours : null,
    medianSignalAgeHours: Number.isFinite(medianSignalAgeHours) ? medianSignalAgeHours : null,
    oldestSignalAgeHours: Number.isFinite(oldestSignalAgeHours) ? oldestSignalAgeHours : null,
    freshSignalCount,
    activeSignalCount,
    coolingSignalCount,
    staleSignalCount,
    resurfacingSignalCount,
    recentConfirmationScore,
    oldSourcePressure,
    sourceContributions,
    summary,
    warnings,
    recommendedAction,
  };
}
