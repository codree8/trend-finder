import type {
  TopicQuality,
  TopicQualityClarity,
  TopicQualityGateStatus,
  TopicQualityNoiseRisk,
  TopicQualitySourceTrustLevel,
  TrendLifecycle,
} from "@/lib/trends/types";

type TopicQualitySignal = {
  title: string;
  source: string;
  engagement?: number | null;
  qualityScore?: number | null;
};

type TopicQualityInput = {
  topic: string;
  category: string;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  velocity: number;
  saturation: number;
  sourceDiversity: number;
  mentionCount: number;
  sourceCount: number;
  totalEngagement: number;
  sources: string[];
  lifecycle: TrendLifecycle;
  aliases: string[];
  relatedLabels: string[];
  creatorOpportunityScore: number;
  signals: TopicQualitySignal[];
};

const weakGenericTerms = new Set([
  "ai",
  "llm",
  "llms",
  "agent",
  "agents",
  "tool",
  "tools",
  "app",
  "apps",
  "bot",
  "bots",
  "chatbot",
  "chatbots",
  "automation",
  "workflow",
  "workflows",
  "openai",
  "claude",
  "gpt",
]);

const fillerTerms = new Set([
  "new",
  "best",
  "top",
  "awesome",
  "simple",
  "easy",
  "free",
  "ultimate",
  "complete",
  "guide",
  "demo",
  "example",
  "examples",
  "starter",
  "template",
  "boilerplate",
  "clone",
  "wrapper",
]);

const contentPatternRegexes = [
  /\bhow\s+to\b/i,
  /\bbuild(?:ing)?\b.+\b(app|website|dashboard|agent|bot)\b/i,
  /\btutorial\b/i,
  /\bcourse\b/i,
  /\bguide\b/i,
  /\bstarter\b/i,
  /\btemplate\b/i,
  /\bboilerplate\b/i,
  /\bclone\b/i,
  /\bawesome\b/i,
  /\bexample\b/i,
];

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .trim();
}

function words(value: string) {
  return normalize(value)
    .split(/[\s/_-]+/)
    .filter(Boolean);
}

function uniqueWords(value: string) {
  return Array.from(new Set(words(value)));
}

function sourceBaseScore(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("hacker news")) return 88;
  if (normalized.includes("github")) return 80;
  if (normalized.includes("rss")) return 74;
  if (normalized.includes("reddit")) return 66;
  if (normalized.includes("youtube")) return 64;
  return 58;
}

function average(values: number[], fallback: number) {
  if (values.length === 0) return fallback;
  return clampScore(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function sourceTrustScore(input: TopicQualityInput) {
  const sourceQuality = average(input.sources.map(sourceBaseScore), 44);
  const confirmation = crossSourceConfirmationScore(
    input.sourceCount,
    input.totalEngagement,
  );

  return clampScore(
    sourceQuality * 0.45 + input.sourceDiversity * 0.35 + confirmation * 0.2,
  );
}

function crossSourceConfirmationScore(
  sourceCount: number,
  totalEngagement: number,
) {
  if (sourceCount >= 4) return 94;
  if (sourceCount === 3) return 84;
  if (sourceCount === 2) return 68;
  if (sourceCount === 1 && totalEngagement >= 100000) return 54;
  if (sourceCount === 1 && totalEngagement >= 25000) return 46;
  if (sourceCount === 1) return 34;
  return 12;
}

function signalQualityScore(input: TopicQualityInput) {
  const explicitScores = input.signals
    .map((signal) => signal.qualityScore)
    .filter(
      (score): score is number =>
        typeof score === "number" && Number.isFinite(score),
    );

  if (explicitScores.length > 0) {
    return average(explicitScores, 50);
  }

  const engagementScore =
    input.totalEngagement >= 200000
      ? 82
      : input.totalEngagement >= 50000
        ? 70
        : input.totalEngagement >= 10000
          ? 58
          : input.totalEngagement >= 1000
            ? 48
            : 36;

  return clampScore(
    engagementScore * 0.45 +
      input.velocity * 0.3 +
      input.sourceDiversity * 0.25,
  );
}

function titleSpecificityScore(input: TopicQualityInput) {
  const topicWords = uniqueWords(input.topic);
  const wordCount = topicWords.length;
  const genericWords = topicWords.filter((word) =>
    weakGenericTerms.has(word),
  ).length;
  const fillerWords = topicWords.filter((word) => fillerTerms.has(word)).length;
  const hasTechnicalMarker =
    /\b(rag|eval|evals|inference|embedding|embeddings|vector|vectorized|mcp|gpu|cuda|onnx|llama|qwen|mlx|agentic|browser|voice|multimodal|workflow|fine[-\s]?tuning|retrieval|reasoning|latency|context|local\s+llm|open-source|open source)\b/i.test(
      input.topic,
    );
  const hasNamedEntity = /\b[A-Z][A-Za-z0-9+#.]{2,}\b/.test(
    input.topic.replace(/^AI\b/, ""),
  );
  const aliasSignal = Math.min(10, input.aliases.length * 2);
  const relatedSignal = Math.min(8, input.relatedLabels.length * 2);

  let score = 48;

  if (wordCount >= 2 && wordCount <= 5) score += 18;
  if (wordCount === 1) score -= 14;
  if (wordCount > 7) score -= 12;
  if (hasTechnicalMarker) score += 14;
  if (hasNamedEntity && wordCount >= 2) score += 8;
  score += aliasSignal + relatedSignal;
  score -= genericWords * 12;
  score -= fillerWords * 7;

  return clampScore(score);
}

function isGenericTopic(input: TopicQualityInput) {
  const topicWords = uniqueWords(input.topic);
  if (topicWords.length === 0) return true;

  const genericCount = topicWords.filter((word) =>
    weakGenericTerms.has(word),
  ).length;
  const fillerCount = topicWords.filter((word) => fillerTerms.has(word)).length;
  const mostlyGeneric = genericCount / topicWords.length >= 0.55;
  const veryShortGeneric = topicWords.length <= 2 && genericCount > 0;
  const fillerHeavy = fillerCount >= 2 && input.sourceCount <= 1;

  return mostlyGeneric || veryShortGeneric || fillerHeavy;
}

function contentPatternPenalty(input: TopicQualityInput) {
  const haystack = [input.topic, ...input.signals.map((signal) => signal.title)]
    .join(" \n ")
    .slice(0, 5000);
  const hits = contentPatternRegexes.filter((regex) =>
    regex.test(haystack),
  ).length;
  const singleSourceMultiplier = input.sourceCount <= 1 ? 1.3 : 1;

  return clampScore(Math.min(28, hits * 7 * singleSourceMultiplier));
}

function genericPenalty(input: TopicQualityInput) {
  const topicWords = uniqueWords(input.topic);
  const genericCount = topicWords.filter((word) =>
    weakGenericTerms.has(word),
  ).length;
  const fillerCount = topicWords.filter((word) => fillerTerms.has(word)).length;
  const base = isGenericTopic(input) ? 18 : 0;
  const broadCategoryPenalty = normalize(input.category).includes("general ai")
    ? 7
    : 0;

  return clampScore(
    base + genericCount * 5 + fillerCount * 4 + broadCategoryPenalty,
  );
}

function singleSourcePenalty(input: TopicQualityInput) {
  if (input.sourceCount >= 3) return 0;
  if (input.sourceCount === 2) return input.mentionCount <= 2 ? 5 : 0;
  if (input.sourceCount === 1 && input.mentionCount <= 1) return 22;
  if (input.sourceCount === 1) return 14;
  return 30;
}

function saturationNoisePenalty(input: TopicQualityInput) {
  if (input.saturation >= 78 && input.hiddenGemScore < 62) return 20;
  if (input.saturation >= 68 && input.hiddenGemScore < 55) return 12;
  if (
    input.saturation <= 35 &&
    input.mentionCount <= 1 &&
    input.sourceCount <= 1
  )
    return 8;
  return 0;
}

function stalenessPenalty(input: TopicQualityInput) {
  if (input.lifecycle.status === "Dormant") return 24;
  if (input.lifecycle.status === "Stale") return 20;
  if (input.lifecycle.stalenessRisk === "high") return 18;
  if (input.lifecycle.status === "Cooling") return 10;
  if (input.lifecycle.stalenessRisk === "medium") return 8;
  return 0;
}

function actionabilityScore(input: TopicQualityInput) {
  return clampScore(
    input.contentScore * 0.34 +
      input.creatorOpportunityScore * 0.24 +
      input.hiddenGemScore * 0.18 +
      input.velocity * 0.14 +
      Math.max(0, 100 - input.saturation) * 0.1,
  );
}

function clarityFromScore(score: number): TopicQualityClarity {
  if (score >= 70) return "clear";
  if (score >= 48) return "needs_review";
  return "vague";
}

function trustFromScore(score: number): TopicQualitySourceTrustLevel {
  if (score >= 74) return "strong";
  if (score >= 52) return "mixed";
  return "weak";
}

function noiseRiskFromScore(
  score: number,
  penaltyTotal: number,
): TopicQualityNoiseRisk {
  if (score >= 68 && penaltyTotal <= 28) return "low";
  if (score >= 48 && penaltyTotal <= 50) return "medium";
  return "high";
}

function gateStatusFromScore(
  score: number,
  noiseRisk: TopicQualityNoiseRisk,
  input: TopicQualityInput,
): TopicQualityGateStatus {
  const stronglyConfirmed = input.sourceCount >= 3 && input.trendScore >= 70;

  if (noiseRisk === "high" && score < 52 && !stronglyConfirmed) {
    return "suppress";
  }

  if (score >= 68 || stronglyConfirmed) return "pass";
  return "watch";
}

function buildPositiveSignals(
  input: TopicQualityInput,
  metrics: TopicQuality["metrics"],
) {
  const positives: string[] = [];

  if (metrics.titleSpecificity >= 70) {
    positives.push(
      `Topic label is specific enough at ${metrics.titleSpecificity}/100.`,
    );
  }

  if (input.sourceCount >= 2) {
    positives.push(`${input.sourceCount} sources are confirming the topic.`);
  }

  if (metrics.sourceTrust >= 70) {
    positives.push(`Source trust is healthy at ${metrics.sourceTrust}/100.`);
  }

  if (input.lifecycle.freshnessScore >= 70) {
    positives.push(
      `Freshness is strong at ${input.lifecycle.freshnessScore}/100.`,
    );
  }

  if (metrics.actionability >= 68) {
    positives.push(`Actionability is usable at ${metrics.actionability}/100.`);
  }

  return positives.slice(0, 5);
}

function buildWarnings(
  input: TopicQualityInput,
  metrics: TopicQuality["metrics"],
  genericTopic: boolean,
) {
  const warnings: string[] = [];

  if (genericTopic) {
    warnings.push(
      "Topic label is broad or generic; treat it as a bucket, not a precise trend.",
    );
  }

  if (metrics.contentPatternPenalty >= 14) {
    warnings.push(
      "Detected tutorial/starter/guide patterns that may be content noise rather than trend signal.",
    );
  }

  if (metrics.singleSourcePenalty >= 14) {
    warnings.push(
      "Confirmation is thin because the topic is mostly single-source.",
    );
  }

  if (metrics.saturationNoisePenalty >= 12) {
    warnings.push(
      `Saturation pressure is high at ${input.saturation}/100 without enough hidden-gem strength.`,
    );
  }

  if (metrics.stalenessPenalty >= 12) {
    warnings.push(
      `Lifecycle/staleness pressure is high: ${input.lifecycle.status}, ${input.lifecycle.stalenessRisk} risk.`,
    );
  }

  if (metrics.signalQuality < 45) {
    warnings.push(
      `Underlying signal quality is weak at ${metrics.signalQuality}/100.`,
    );
  }

  return warnings.slice(0, 5);
}

export function buildTopicQuality(input: TopicQualityInput): TopicQuality {
  const titleSpecificity = titleSpecificityScore(input);
  const sourceTrust = sourceTrustScore(input);
  const crossSourceConfirmation = crossSourceConfirmationScore(
    input.sourceCount,
    input.totalEngagement,
  );
  const signalQuality = signalQualityScore(input);
  const actionability = actionabilityScore(input);
  const genericTopic = isGenericTopic(input);
  const metrics: TopicQuality["metrics"] = {
    titleSpecificity,
    sourceTrust,
    crossSourceConfirmation,
    signalQuality,
    actionability,
    freshness: input.lifecycle.freshnessScore,
    genericPenalty: genericPenalty(input),
    contentPatternPenalty: contentPatternPenalty(input),
    singleSourcePenalty: singleSourcePenalty(input),
    saturationNoisePenalty: saturationNoisePenalty(input),
    stalenessPenalty: stalenessPenalty(input),
  };
  const penaltyTotal =
    metrics.genericPenalty +
    metrics.contentPatternPenalty +
    metrics.singleSourcePenalty +
    metrics.saturationNoisePenalty +
    metrics.stalenessPenalty;
  const score = clampScore(
    titleSpecificity * 0.2 +
      sourceTrust * 0.16 +
      crossSourceConfirmation * 0.16 +
      signalQuality * 0.13 +
      actionability * 0.13 +
      input.lifecycle.freshnessScore * 0.1 +
      input.sourceDiversity * 0.07 +
      input.trendScore * 0.05 -
      penaltyTotal * 0.68,
  );
  const noiseRisk = noiseRiskFromScore(score, penaltyTotal);
  const gateStatus = gateStatusFromScore(score, noiseRisk, input);
  const topicClarity = clarityFromScore(titleSpecificity);
  const sourceTrustLevel = trustFromScore(sourceTrust);
  const isActionableTrend =
    gateStatus !== "suppress" &&
    actionability >= 52 &&
    topicClarity !== "vague" &&
    !(genericTopic && input.sourceCount <= 1);
  const positiveSignals = buildPositiveSignals(input, metrics);
  const warnings = buildWarnings(input, metrics, genericTopic);

  const explanation = `${input.topic} gets a ${score}/100 quality score with ${noiseRisk} noise risk. The gate is ${gateStatus} because topic specificity is ${titleSpecificity}/100, source trust is ${sourceTrust}/100 and cross-source confirmation is ${crossSourceConfirmation}/100, while penalties add up to ${penaltyTotal}.`;

  return {
    score,
    gateStatus,
    noiseRisk,
    topicClarity,
    isGenericTopic: genericTopic,
    isActionableTrend,
    sourceTrustLevel,
    explanation,
    metrics,
    positiveSignals,
    warnings,
  };
}
