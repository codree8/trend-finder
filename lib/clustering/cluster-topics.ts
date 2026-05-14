import type { SourceSignal } from "@/lib/sources/types";
import {
  describeTopic,
  extractTopicKeywords,
  fallbackTopicName,
  getSignalSearchText,
  inferCategory,
  inferKnownTopic,
  slugifyTopic,
  type TopicCategory,
} from "@/lib/clustering/normalize-topic";

export type TopicCluster = {
  name: string;
  slug: string;
  category: TopicCategory;
  description: string;
  signals: SourceSignal[];
  sources: string[];
  mentionCount: number;
  totalEngagement: number;
  averageEngagement: number;
  topKeywords: string[];
};

function getClusterKey(signal: SourceSignal) {
  const known = inferKnownTopic(signal);
  if (known) return slugifyTopic(known.label);

  const keywords = extractTopicKeywords(signal, 3);
  if (keywords.length === 0) return "general-ai-signal";

  return slugifyTopic(keywords.join(" "));
}

function getClusterName(signals: SourceSignal[]) {
  const known = signals.map(inferKnownTopic).find(Boolean);
  if (known) return known.label;

  const shortestUsefulTitle = signals
    .map((signal) => signal.title.trim())
    .filter((title) => title.length > 0 && title.length < 90)
    .sort((a, b) => a.length - b.length)[0];

  if (shortestUsefulTitle) return shortestUsefulTitle;
  return fallbackTopicName(signals[0]);
}

function uniqueKeywords(signals: SourceSignal[]) {
  const counts = new Map<string, number>();

  for (const signal of signals) {
    for (const keyword of extractTopicKeywords(signal, 8)) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([keyword]) => keyword);
}

function pickCategory(signals: SourceSignal[]): TopicCategory {
  const counts = new Map<TopicCategory, number>();

  for (const signal of signals) {
    const known = inferKnownTopic(signal);
    const category =
      known?.category ?? inferCategory(getSignalSearchText(signal));
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general-ai"
  );
}

export function clusterSourceSignals(signals: SourceSignal[]): TopicCluster[] {
  const grouped = new Map<string, SourceSignal[]>();

  for (const signal of signals) {
    const key = getClusterKey(signal);
    const current = grouped.get(key) ?? [];
    current.push(signal);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((clusterSignals) => {
      const name = getClusterName(clusterSignals);
      const slug = slugifyTopic(name);
      const category = pickCategory(clusterSignals);
      const sources = [
        ...new Set(clusterSignals.map((signal) => signal.source)),
      ];
      const totalEngagement = clusterSignals.reduce(
        (sum, signal) => sum + (signal.engagement ?? 0),
        0,
      );

      return {
        name,
        slug,
        category,
        description: describeTopic(category, sources),
        signals: clusterSignals.sort(
          (a, b) => (b.engagement ?? 0) - (a.engagement ?? 0),
        ),
        sources,
        mentionCount: clusterSignals.length,
        totalEngagement,
        averageEngagement: Math.round(
          totalEngagement / Math.max(1, clusterSignals.length),
        ),
        topKeywords: uniqueKeywords(clusterSignals),
      } satisfies TopicCluster;
    })
    .sort((a, b) => {
      const sourceDifference = b.sources.length - a.sources.length;
      if (sourceDifference !== 0) return sourceDifference;
      return b.totalEngagement - a.totalEngagement;
    });
}
