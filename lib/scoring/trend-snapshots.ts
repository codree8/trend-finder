import type { TopicCluster } from "@/lib/clustering/cluster-topics";
import type { SourceSignal } from "@/lib/sources/types";
import { calculateContentScore } from "@/lib/scoring/content-score";
import { calculateHiddenGemScore } from "@/lib/scoring/hidden-gem-score";
import { calculateTrendScore } from "@/lib/scoring/trend-score";

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

const windows: Array<{
  key: TrendWindow;
  days: number;
  velocityMultiplier: number;
}> = [
  { key: "24h", days: 1, velocityMultiplier: 1.35 },
  { key: "7d", days: 7, velocityMultiplier: 1 },
  { key: "30d", days: 30, velocityMultiplier: 0.72 },
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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

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

function isInsideWindow(signal: SourceSignal, now: Date, days: number) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return signalDate(signal) >= cutoff;
}

function estimateSaturation(cluster: TopicCluster, signals: SourceSignal[]) {
  const text = `${cluster.name} ${cluster.topKeywords.join(" ")}`.toLowerCase();
  const mainstreamPenalty = mainstreamTerms.some((term) => text.includes(term))
    ? 28
    : 0;
  const youtubePenalty = signals.some((signal) =>
    signal.source.toLowerCase().includes("youtube"),
  )
    ? 20
    : 0;
  const highMentionPenalty = Math.min(25, signals.length * 3);
  const lowDiversityRelief = cluster.sources.length <= 2 ? -8 : 0;

  return clampScore(
    18 +
      mainstreamPenalty +
      youtubePenalty +
      highMentionPenalty +
      lowDiversityRelief,
  );
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
    research: 72,
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
    research: 72,
    business: 80,
    education: 68,
    security: 87,
    robotics: 92,
    "general-ai": 60,
  };

  const keywordBoost = cluster.topKeywords.some((keyword) =>
    ["agent", "browser", "local", "open", "workflow", "reasoning"].includes(
      keyword,
    ),
  )
    ? 8
    : 0;

  return clampScore(base[category] + keywordBoost);
}

function buildSnapshot(
  cluster: TopicCluster,
  now: Date,
  window: TrendWindow,
  days: number,
  velocityMultiplier: number,
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
  const averageEngagement = totalEngagement / Math.max(1, mentionCount);

  const sourceDiversityScore = clampScore((sourceCount / 5) * 100);
  const velocityScore = clampScore(
    mentionCount * 12 * velocityMultiplier +
      Math.log10(totalEngagement + 10) * 18,
  );
  const engagementQuality = clampScore(
    Math.log10(averageEngagement + 10) * 28 + sourceCount * 8,
  );
  const novelty = clampScore(100 - Math.min(85, cluster.mentionCount * 4));
  const saturationScore = estimateSaturation(cluster, signals);
  const creatorGap = clampScore(
    100 - saturationScore + (sourceCount <= 2 ? 8 : 0),
  );

  const trendScore = calculateTrendScore({
    velocity: velocityScore,
    sourceDiversity: sourceDiversityScore,
    engagementQuality,
    novelty,
  });
  const hiddenGemScore = calculateHiddenGemScore({
    growth: velocityScore,
    mainstreamSaturation: saturationScore,
    creatorGap,
  });
  const contentScore = calculateContentScore({
    usefulness: usefulnessByCategory(cluster.category),
    curiosity: curiosityByCategory(cluster.category, cluster),
    lowCompetition: creatorGap,
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
    topSignals: signals.slice(0, 5).map((signal) => ({
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
      const snapshots = windows.map(({ key, days, velocityMultiplier }) =>
        buildSnapshot(cluster, now, key, days, velocityMultiplier),
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
