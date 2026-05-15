import type { SourceSignal } from "@/lib/sources/types";
import { getSignalQualityMeta } from "@/lib/signals/signal-fingerprint";
import {
  describeTopic,
  extractTopicKeywords,
  getSignalSearchText,
  inferCategory,
  type TopicCategory,
} from "@/lib/clustering/normalize-topic";
import {
  getCanonicalTopicIdentity,
  mergeAliases,
  type CanonicalTopicIdentity,
} from "@/lib/clustering/topic-identity";

export type TopicCluster = {
  name: string;
  slug: string;
  canonicalKey: string;
  aliases: string[];
  relatedLabels: string[];
  mergedTopicCount: number;
  category: TopicCategory;
  description: string;
  signals: SourceSignal[];
  sources: string[];
  mentionCount: number;
  totalEngagement: number;
  averageEngagement: number;
  topKeywords: string[];
};

type IdentifiedSignal = SourceSignal & {
  canonicalTopicKey: string;
  canonicalTopicLabel: string;
  matchedTopicAlias: string;
};

type ClusterBucket = {
  identity: CanonicalTopicIdentity;
  signals: IdentifiedSignal[];
  aliases: string[];
  relatedLabels: string[];
  matchedAliases: string[];
};

function getSignalTime(signal: SourceSignal) {
  const candidate = signal.publishedAt;
  if (!candidate) return 0;

  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function compareSignalsByQuality(a: SourceSignal, b: SourceSignal) {
  const qualityDifference =
    getSignalQualityMeta(b).qualityScore - getSignalQualityMeta(a).qualityScore;
  if (qualityDifference !== 0) return qualityDifference;

  const engagementDifference = (b.engagement ?? 0) - (a.engagement ?? 0);
  if (engagementDifference !== 0) return engagementDifference;

  return getSignalTime(b) - getSignalTime(a);
}

function identifySignal(signal: SourceSignal): IdentifiedSignal {
  const identity = getCanonicalTopicIdentity(signal);

  return {
    ...signal,
    canonicalTopicKey: identity.canonicalKey,
    canonicalTopicLabel: identity.label,
    matchedTopicAlias: identity.matchedAlias,
  };
}

function getClusterName(bucket: ClusterBucket) {
  const labelCounts = new Map<string, number>();

  for (const signal of bucket.signals) {
    labelCounts.set(
      signal.canonicalTopicLabel,
      (labelCounts.get(signal.canonicalTopicLabel) ?? 0) + 1,
    );
  }

  return (
    [...labelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    bucket.identity.label
  );
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

function pickCategory(bucket: ClusterBucket): TopicCategory {
  const counts = new Map<TopicCategory, number>();

  for (const signal of bucket.signals) {
    const category =
      getCanonicalTopicIdentity(signal).category ??
      inferCategory(getSignalSearchText(signal));
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    bucket.identity.category ??
    "general-ai"
  );
}

function sourceList(signals: SourceSignal[]) {
  return [...new Set(signals.map((signal) => signal.source))];
}

function createBucket(identity: CanonicalTopicIdentity): ClusterBucket {
  return {
    identity,
    signals: [],
    aliases: [...identity.aliases],
    relatedLabels: [...identity.relatedLabels],
    matchedAliases: [identity.matchedAlias],
  };
}

function mergeBucketIdentity(
  bucket: ClusterBucket,
  identity: CanonicalTopicIdentity,
) {
  bucket.aliases.push(...identity.aliases);
  bucket.relatedLabels.push(...identity.relatedLabels);
  bucket.matchedAliases.push(identity.matchedAlias);

  if (identity.confidence > bucket.identity.confidence) {
    bucket.identity = identity;
  }
}

export function clusterSourceSignals(signals: SourceSignal[]): TopicCluster[] {
  const grouped = new Map<string, ClusterBucket>();

  for (const rawSignal of signals) {
    const identity = getCanonicalTopicIdentity(rawSignal);
    const signal = identifySignal(rawSignal);
    const key = identity.canonicalKey;
    const bucket = grouped.get(key) ?? createBucket(identity);

    bucket.signals.push(signal);
    mergeBucketIdentity(bucket, identity);
    grouped.set(key, bucket);
  }

  return [...grouped.values()]
    .map((bucket) => {
      const name = getClusterName(bucket);
      const slug = bucket.identity.slug;
      const category = pickCategory(bucket);
      const sources = sourceList(bucket.signals);
      const totalEngagement = bucket.signals.reduce(
        (sum, signal) => sum + (signal.engagement ?? 0),
        0,
      );
      const aliases = mergeAliases(
        [name, ...bucket.aliases, ...bucket.matchedAliases].filter(
          (alias) => alias.toLowerCase() !== name.toLowerCase(),
        ),
        18,
      );
      const relatedLabels = mergeAliases(bucket.relatedLabels, 10);

      return {
        name,
        slug,
        canonicalKey: bucket.identity.canonicalKey,
        aliases,
        relatedLabels,
        mergedTopicCount: Math.max(1, aliases.length),
        category,
        description: describeTopic(category, sources),
        signals: bucket.signals.sort(compareSignalsByQuality),
        sources,
        mentionCount: bucket.signals.length,
        totalEngagement,
        averageEngagement: Math.round(
          totalEngagement / Math.max(1, bucket.signals.length),
        ),
        topKeywords: uniqueKeywords(bucket.signals),
      } satisfies TopicCluster;
    })
    .sort((a, b) => {
      const sourceDifference = b.sources.length - a.sources.length;
      if (sourceDifference !== 0) return sourceDifference;
      return b.totalEngagement - a.totalEngagement;
    });
}
