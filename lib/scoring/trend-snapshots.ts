import type { TopicCluster } from "@/lib/clustering/cluster-topics";
import type { SourceSignal } from "@/lib/sources/types";
import { calculateContentScore } from "@/lib/scoring/content-score";
import { calculateHiddenGemScore } from "@/lib/scoring/hidden-gem-score";
import { calculateTrendScore } from "@/lib/scoring/trend-score";
import {
  clampScore,
  exponentialDecay,
  normalizeLog,
  safeDivide,
  shannonEffectiveCount,
  weightedAverage,
} from "@/lib/scoring/score-utils";
import {
  averageSourceProfile,
  getSourceProfile,
} from "@/lib/scoring/source-profiles";

export type TrendWindow = "24h" | "7d" | "30d";

export type TopicSnapshot = {
  topicSlug: string;
  window: TrendWindow;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  velocityScore: number;
  saturationScore: number;
  sourceDiversityScore: number;
  mentionCount: number;
  sourceCount: number;
  totalEngagement: number;
  topSignals: Array<{
    title: string;
    source: string;
    url: string;
    engagement: number;
  }>;
};

export type ClusterWithSnapshots = TopicCluster & {
  snapshots: TopicSnapshot[];
  current: TopicSnapshot;
};

export const scoringCalibrationVersion = "trend-finder-scoring-v2";

const windows: Array<{
  key: TrendWindow;
  days: number;
  velocityMultiplier: number;
  mentionSoftCap: number;
}> = [
  { key: "24h", days: 1, velocityMultiplier: 1.35, mentionSoftCap: 8 },
  { key: "7d", days: 7, velocityMultiplier: 1, mentionSoftCap: 18 },
  { key: "30d", days: 30, velocityMultiplier: 0.72, mentionSoftCap: 34 },
];

const mainstreamTerms = [
  "chatgpt",
  "openai",
  "gemini",
  "claude",
  "midjourney",
  "sora",
  "copilot",
  "stable diffusion",
  "ai agents",
];

const highNoveltyTerms = [
  "browser",
  "local",
  "on-device",
  "open weights",
  "open-weight",
  "agent framework",
  "workflow",
  "reasoning",
  "eval",
  "benchmark",
];

function getPayloadDate(signal: SourceSignal, key: string) {
  const payload = signal.rawPayload;
  if (!payload || typeof payload !== "object") return null;

  const value = (payload as Record<string, unknown>)[key];
  if (typeof value !== "string") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function signalDate(signal: SourceSignal) {
  const observedAt = getPayloadDate(signal, "observedAt");
  if (observedAt) return observedAt;

  const pushedAt = getPayloadDate(signal, "pushedAt");
  if (pushedAt) return pushedAt;

  if (!signal.publishedAt) return new Date();
  const date = new Date(signal.publishedAt);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function ageInDays(signal: SourceSignal, now: Date) {
  const ageMs = now.getTime() - signalDate(signal).getTime();
  return Math.max(0, ageMs / (1000 * 60 * 60 * 24));
}

function isInsideWindow(signal: SourceSignal, now: Date, days: number) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return signalDate(signal) >= cutoff;
}

function getTopicText(cluster: TopicCluster) {
  return `${cluster.name} ${cluster.description} ${cluster.topKeywords.join(" ")}`.toLowerCase();
}

function countMatchingTerms(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term)).length;
}

function usefulnessByCategory(category: TopicCluster["category"]) {
  const categoryScores: Record<TopicCluster["category"], number> = {
    agents: 88,
    coding: 92,
    video: 82,
    image: 76,
    audio: 72,
    "open-source": 90,
    "local-llm": 88,
    automation: 91,
    research: 74,
    business: 84,
    education: 74,
    security: 86,
    robotics: 78,
    "general-ai": 62,
  };

  return categoryScores[category];
}

function curiosityByCategory(
  category: TopicCluster["category"],
  cluster: TopicCluster,
) {
  const base: Record<TopicCluster["category"], number> = {
    agents: 90,
    coding: 78,
    video: 91,
    image: 80,
    audio: 78,
    "open-source": 82,
    "local-llm": 84,
    automation: 81,
    research: 74,
    business: 80,
    education: 68,
    security: 87,
    robotics: 92,
    "general-ai": 60,
  };

  const noveltyTermBoost = countMatchingTerms(
    getTopicText(cluster),
    highNoveltyTerms,
  );

  return clampScore(base[category] + noveltyTermBoost * 4);
}

function scoreSignalClarity(cluster: TopicCluster, signals: SourceSignal[]) {
  const usefulTitleCount = signals.filter((signal) => {
    const title = signal.title.trim();
    return title.length >= 28 && title.length <= 120;
  }).length;
  const keywordDensity = Math.min(8, cluster.topKeywords.length) * 5;

  return clampScore(
    48 +
      safeDivide(usefulTitleCount, Math.max(1, signals.length)) * 32 +
      keywordDensity,
  );
}

function getSourceCounts(signals: SourceSignal[]) {
  const counts = new Map<string, number>();

  for (const signal of signals) {
    counts.set(signal.source, (counts.get(signal.source) ?? 0) + 1);
  }

  return counts;
}

function scoreSourceDiversity(signals: SourceSignal[]) {
  const counts = getSourceCounts(signals);
  const effectiveSourceCount = shannonEffectiveCount([...counts.values()]);
  const sourceCount = counts.size;

  return clampScore(
    safeDivide(effectiveSourceCount - 1, 4) * 72 +
      Math.min(24, sourceCount * 6),
  );
}

function scoreSampleConfidence(
  mentionCount: number,
  sourceDiversityScore: number,
  totalEngagement: number,
) {
  return clampScore(
    normalizeLog(mentionCount, 10) * 0.54 +
      sourceDiversityScore * 0.22 +
      normalizeLog(totalEngagement, 700) * 0.24,
  );
}

function scoreVelocity(
  signals: SourceSignal[],
  now: Date,
  days: number,
  velocityMultiplier: number,
  mentionSoftCap: number,
) {
  if (signals.length === 0) return 0;

  const halfLifeDays = Math.max(0.75, days / 2.4);
  const weightedMentionCount = signals.reduce((sum, signal) => {
    return sum + exponentialDecay(ageInDays(signal, now), halfLifeDays);
  }, 0);
  const weightedEngagement = signals.reduce((sum, signal) => {
    const profile = getSourceProfile(signal.source);
    const recencyWeight = exponentialDecay(
      ageInDays(signal, now),
      halfLifeDays,
    );
    const engagement = signal.engagement ?? 0;

    return (
      sum +
      normalizeLog(engagement, profile.engagementSoftCap) *
        recencyWeight *
        (profile.credibility / 100)
    );
  }, 0);
  const newestSignalAge = Math.min(
    ...signals.map((signal) => ageInDays(signal, now)),
  );

  const mentionMomentum = normalizeLog(
    weightedMentionCount * velocityMultiplier,
    mentionSoftCap,
  );
  const engagementMomentum = clampScore(weightedEngagement / signals.length);
  const freshness = clampScore(
    100 - safeDivide(newestSignalAge, Math.max(1, days)) * 65,
  );

  return clampScore(
    mentionMomentum * 0.58 + engagementMomentum * 0.3 + freshness * 0.12,
  );
}

function scoreEngagementQuality(
  signals: SourceSignal[],
  totalEngagement: number,
) {
  if (signals.length === 0) return 0;

  const weightedSignalScores = signals.map((signal) => {
    const profile = getSourceProfile(signal.source);

    return {
      value:
        normalizeLog(signal.engagement ?? 0, profile.engagementSoftCap) * 0.86 +
        profile.credibility * 0.14,
      weight: 1,
    };
  });
  const averageQuality = weightedAverage(weightedSignalScores, 0);
  const totalEngagementScore = normalizeLog(totalEngagement, 1200);

  return clampScore(averageQuality * 0.76 + totalEngagementScore * 0.24);
}

function scoreNovelty(
  cluster: TopicCluster,
  signals: SourceSignal[],
  now: Date,
) {
  const topicText = getTopicText(cluster);
  const mainstreamMatches = countMatchingTerms(topicText, mainstreamTerms);
  const noveltyMatches = countMatchingTerms(topicText, highNoveltyTerms);
  const sourceProfile = averageSourceProfile(
    signals.map((signal) => ({ source: signal.source, weight: 1 })),
  );
  const averageAge = weightedAverage(
    signals.map((signal) => ({ value: ageInDays(signal, now), weight: 1 })),
    14,
  );
  const categoryBoost: Record<TopicCluster["category"], number> = {
    agents: 6,
    coding: 2,
    video: 3,
    image: 0,
    audio: 1,
    "open-source": 7,
    "local-llm": 8,
    automation: 4,
    research: 5,
    business: 1,
    education: 0,
    security: 5,
    robotics: 7,
    "general-ai": -5,
  };

  return clampScore(
    58 +
      sourceProfile.earlySignal * 0.18 +
      noveltyMatches * 5 +
      categoryBoost[cluster.category] -
      mainstreamMatches * 12 -
      normalizeLog(cluster.mentionCount, 45) * 0.16 -
      normalizeLog(averageAge, 30) * 0.12,
  );
}

function estimateSaturation(cluster: TopicCluster, signals: SourceSignal[]) {
  if (signals.length === 0) return 0;

  const topicText = getTopicText(cluster);
  const mainstreamMatches = countMatchingTerms(topicText, mainstreamTerms);
  const sourceCounts = getSourceCounts(signals);
  const sourceProfile = averageSourceProfile(
    signals.map((signal) => ({ source: signal.source, weight: 1 })),
  );
  const mentionDensity = normalizeLog(signals.length, 20);
  const sourceDiffusion = normalizeLog(sourceCounts.size, 5);
  const githubDominance = safeDivide(
    sourceCounts.get("GitHub") ?? 0,
    signals.length,
  );

  return clampScore(
    16 +
      sourceProfile.saturation * 0.34 +
      mainstreamMatches * 12 +
      mentionDensity * 0.2 +
      sourceDiffusion * 0.18 -
      githubDominance * 10,
  );
}

function scoreTopSignal(signal: SourceSignal, now: Date) {
  const profile = getSourceProfile(signal.source);
  const engagement = normalizeLog(
    signal.engagement ?? 0,
    profile.engagementSoftCap,
  );
  const recency = clampScore(100 - ageInDays(signal, now) * 8);

  return engagement * 0.48 + profile.credibility * 0.32 + recency * 0.2;
}

function buildSnapshot(
  cluster: TopicCluster,
  now: Date,
  window: TrendWindow,
  days: number,
  velocityMultiplier: number,
  mentionSoftCap: number,
): TopicSnapshot {
  const signals = cluster.signals.filter((signal) =>
    isInsideWindow(signal, now, days),
  );
  const sourceCount = new Set(signals.map((signal) => signal.source)).size;
  const mentionCount = signals.length;
  const totalEngagement = signals.reduce(
    (sum, signal) => sum + (signal.engagement ?? 0),
    0,
  );

  const sourceDiversityScore = scoreSourceDiversity(signals);
  const velocityScore = scoreVelocity(
    signals,
    now,
    days,
    velocityMultiplier,
    mentionSoftCap,
  );
  const engagementQuality = scoreEngagementQuality(signals, totalEngagement);
  const sourceProfile = averageSourceProfile(
    signals.map((signal) => ({ source: signal.source, weight: 1 })),
  );
  const novelty = scoreNovelty(cluster, signals, now);
  const saturationScore = estimateSaturation(cluster, signals);
  const creatorGap = clampScore(
    100 - saturationScore + sourceProfile.earlySignal * 0.12 - sourceCount * 2,
  );
  const sampleConfidence = scoreSampleConfidence(
    mentionCount,
    sourceDiversityScore,
    totalEngagement,
  );
  const signalClarity = scoreSignalClarity(cluster, signals);

  const trendScore = calculateTrendScore({
    velocity: velocityScore,
    sourceDiversity: sourceDiversityScore,
    engagementQuality,
    novelty,
    sourceCredibility: sourceProfile.credibility,
    sampleConfidence,
  });
  const hiddenGemScore = calculateHiddenGemScore({
    growth: velocityScore,
    mainstreamSaturation: saturationScore,
    creatorGap,
    novelty,
    sourceCredibility: sourceProfile.credibility,
    sampleConfidence,
  });
  const contentScore = calculateContentScore({
    usefulness: usefulnessByCategory(cluster.category),
    curiosity: curiosityByCategory(cluster.category, cluster),
    lowCompetition: creatorGap,
    signalClarity,
    engagementQuality,
    sampleConfidence,
  });

  return {
    topicSlug: cluster.slug,
    window,
    trendScore: clampScore(trendScore),
    hiddenGemScore: clampScore(hiddenGemScore),
    contentScore: clampScore(contentScore),
    velocityScore,
    saturationScore,
    sourceDiversityScore,
    mentionCount,
    sourceCount,
    totalEngagement,
    topSignals: [...signals]
      .sort((a, b) => scoreTopSignal(b, now) - scoreTopSignal(a, now))
      .slice(0, 5)
      .map((signal) => ({
        title: signal.title,
        source: signal.source,
        url: signal.url,
        engagement: signal.engagement ?? 0,
      })),
  };
}

export function addTrendSnapshots(
  clusters: TopicCluster[],
  now = new Date(),
): ClusterWithSnapshots[] {
  return clusters
    .map((cluster) => {
      const snapshots = windows.map(
        ({ key, days, velocityMultiplier, mentionSoftCap }) =>
          buildSnapshot(
            cluster,
            now,
            key,
            days,
            velocityMultiplier,
            mentionSoftCap,
          ),
      );
      const current =
        snapshots.find((snapshot) => snapshot.window === "7d") ?? snapshots[0];

      return {
        ...cluster,
        snapshots,
        current,
      } satisfies ClusterWithSnapshots;
    })
    .filter((cluster) =>
      cluster.snapshots.some((snapshot) => snapshot.mentionCount > 0),
    )
    .sort((a, b) => b.current.trendScore - a.current.trendScore);
}
