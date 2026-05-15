import type {
  CreatorAudienceFit,
  CreatorContentRisk,
  CreatorOpportunity,
  CreatorOpportunityLevel,
  CreatorRecommendedFormat,
  CreatorRecommendedTiming,
  TrendLifecycle,
  TrendLifecycleStatus,
} from "@/lib/trends/types";

type CreatorOpportunityInput = {
  topic: string;
  category: string;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  velocity: number;
  saturation: number;
  creatorGap: number;
  sourceDiversity: number;
  mentionCount: number;
  sourceCount: number;
  totalEngagement: number;
  sources: string[];
  lifecycle: TrendLifecycle;
  aliases: string[];
  relatedLabels: string[];
};

const technicalCategories = new Set([
  "agents",
  "coding",
  "open source",
  "open-source",
  "local llm",
  "local-llm",
  "automation",
  "security",
  "robotics",
  "general ai",
  "general-ai",
]);

const visualCreatorCategories = new Set([
  "video",
  "image",
  "audio",
  "marketing",
  "education",
]);

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeCategory(category: string) {
  return category.toLowerCase().replace(/[_-]+/g, " ").trim();
}

function lifecycleFitScore(status: TrendLifecycleStatus) {
  switch (status) {
    case "Accelerating":
      return 95;
    case "Emerging":
      return 88;
    case "Peaking":
      return 62;
    case "Cooling":
      return 42;
    case "Stale":
      return 24;
    case "Dormant":
      return 16;
  }
}

function stalenessPenalty(risk: TrendLifecycle["stalenessRisk"]) {
  if (risk === "high") return 22;
  if (risk === "medium") return 9;
  return 0;
}

function sourceCountSignal(sourceCount: number) {
  if (sourceCount >= 4) return 92;
  if (sourceCount === 3) return 82;
  if (sourceCount === 2) return 68;
  if (sourceCount === 1) return 42;
  return 18;
}

function sourceQualityScore(sources: string[]) {
  if (sources.length === 0) return 20;

  const scoreBySource = sources.map((source) => {
    const normalized = source.toLowerCase();
    if (normalized.includes("hacker news")) return 86;
    if (normalized.includes("github")) return 82;
    if (normalized.includes("rss")) return 74;
    return 64;
  });

  return clampScore(
    scoreBySource.reduce((sum, score) => sum + score, 0) / scoreBySource.length,
  );
}

function credibilityScore(input: CreatorOpportunityInput) {
  return clampScore(
    input.sourceDiversity * 0.4 +
      sourceCountSignal(input.sourceCount) * 0.36 +
      sourceQualityScore(input.sources) * 0.24,
  );
}

function crossSourceConfirmation(input: CreatorOpportunityInput) {
  if (input.sourceCount >= 3) return 90;
  if (input.sourceCount === 2) return 72;
  if (input.sourceCount === 1 && input.totalEngagement >= 50000) return 55;
  if (input.sourceCount === 1) return 38;
  return 14;
}

function topicClarityScore(input: CreatorOpportunityInput) {
  const topicWords = input.topic.split(/\s+/).filter(Boolean).length;
  const genericPenalty = /\b(ai|llm|agent|tool|app)\b/i.test(input.topic)
    ? 8
    : 0;
  const lengthBonus = topicWords >= 2 && topicWords <= 5 ? 10 : 0;
  const aliasBonus = Math.min(10, input.aliases.length * 2);
  const relatedBonus = Math.min(8, input.relatedLabels.length * 2);

  return clampScore(
    62 + lengthBonus + aliasBonus + relatedBonus - genericPenalty,
  );
}

function saturationPenalty(saturation: number) {
  if (saturation >= 82) return 24;
  if (saturation >= 72) return 16;
  if (saturation >= 62) return 7;
  return 0;
}

function opportunityLevel(score: number): CreatorOpportunityLevel {
  if (score >= 75) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function recommendedTiming(
  input: CreatorOpportunityInput,
  score: number,
): CreatorRecommendedTiming {
  const lifecycle = input.lifecycle.status;

  if (
    input.saturation >= 78 ||
    input.lifecycle.stalenessRisk === "high" ||
    lifecycle === "Stale" ||
    lifecycle === "Dormant" ||
    (lifecycle === "Cooling" && input.velocity < 55)
  ) {
    return "Too late";
  }

  if (
    input.sourceCount <= 1 &&
    input.mentionCount <= 2 &&
    input.contentScore < 74 &&
    input.hiddenGemScore < 72
  ) {
    return "Too early";
  }

  if (
    score >= 74 &&
    input.lifecycle.freshnessScore >= 62 &&
    input.saturation <= 66 &&
    (lifecycle === "Emerging" || lifecycle === "Accelerating")
  ) {
    return "Act now";
  }

  return "Watch";
}

function recommendedFormat(
  input: CreatorOpportunityInput,
): CreatorRecommendedFormat {
  const category = normalizeCategory(input.category);
  const topic = input.topic.toLowerCase();

  if (category.includes("coding") || topic.includes("workflow")) {
    return input.contentScore >= 76 ? "Tutorial" : "Practical explainer";
  }

  if (category.includes("research") || category.includes("security")) {
    return input.sourceCount >= 3 ? "Deep dive" : "Short analysis";
  }

  if (category.includes("local llm") || topic.includes("llm")) {
    return input.saturation <= 55 ? "Comparison" : "Deep dive";
  }

  if (category.includes("business") || category.includes("startup")) {
    return input.hiddenGemScore >= 70 ? "Founder insight" : "LinkedIn post";
  }

  if (visualCreatorCategories.has(category)) {
    return input.creatorGap >= 55 ? "Carousel" : "Short analysis";
  }

  if (input.contentScore >= 84) return "Practical explainer";
  if (input.sourceDiversity >= 70) return "Comparison";
  return "Short analysis";
}

function audienceFit(input: CreatorOpportunityInput): CreatorAudienceFit[] {
  const category = normalizeCategory(input.category);
  const fits = new Set<CreatorAudienceFit>();

  if (technicalCategories.has(category) || input.sources.includes("GitHub")) {
    fits.add("builders");
  }

  if (
    category.includes("business") ||
    category.includes("startup") ||
    category.includes("agents") ||
    category.includes("automation")
  ) {
    fits.add("founders");
    fits.add("product teams");
  }

  if (
    category.includes("marketing") ||
    category.includes("video") ||
    category.includes("image") ||
    category.includes("audio") ||
    input.contentScore >= 76
  ) {
    fits.add("creators");
    fits.add("marketers");
  }

  if (
    category.includes("research") ||
    category.includes("local llm") ||
    category.includes("security") ||
    input.sourceDiversity >= 72
  ) {
    fits.add("researchers");
  }

  if (fits.size === 0) {
    fits.add("creators");
    fits.add("product teams");
  }

  return Array.from(fits).slice(0, 4);
}

function contentRisk(input: CreatorOpportunityInput): CreatorContentRisk {
  if (
    input.saturation >= 78 ||
    input.lifecycle.stalenessRisk === "high" ||
    input.sourceCount === 0 ||
    input.lifecycle.status === "Dormant"
  ) {
    return "high";
  }

  if (
    input.saturation >= 64 ||
    input.sourceCount === 1 ||
    input.lifecycle.stalenessRisk === "medium" ||
    input.contentScore < 58
  ) {
    return "medium";
  }

  return "low";
}

function buildBestAngle(
  input: CreatorOpportunityInput,
  timing: CreatorRecommendedTiming,
  format: CreatorRecommendedFormat,
) {
  const topic = input.topic;

  if (timing === "Too late") {
    return `${topic}: avoid generic coverage and use a ${format.toLowerCase()} focused on what changed after saturation hit ${input.saturation}/100.`;
  }

  if (timing === "Too early") {
    return `${topic}: frame it as a watchlist signal, not a conclusion - ${input.sourceCount} source${
      input.sourceCount === 1 ? "" : "s"
    } and ${input.mentionCount} mention${input.mentionCount === 1 ? "" : "s"} need confirmation.`;
  }

  if (input.hiddenGemScore >= 72 && input.saturation <= 58) {
    return `${topic}: explain the early practical use case before mainstream coverage catches up - ${input.hiddenGemScore}/100 hidden-gem score, ${input.saturation}/100 saturation.`;
  }

  if (input.sourceCount >= 3) {
    return `${topic}: connect the dots across ${input.sourceCount} sources and show why the signal is becoming useful now, not just loud.`;
  }

  if (input.contentScore >= 78) {
    return `${topic}: turn the signal into a concrete ${format.toLowerCase()} while the content gap is still open.`;
  }

  return `${topic}: keep the angle narrow, evidence-led and tied to the current ${input.lifecycle.status.toLowerCase()} lifecycle phase.`;
}

function buildDrivers(
  input: CreatorOpportunityInput,
  sourceCredibility: number,
) {
  const drivers: string[] = [];

  if (input.lifecycle.freshnessScore >= 70) {
    drivers.push(
      `Freshness is strong at ${input.lifecycle.freshnessScore}/100.`,
    );
  }

  if (input.hiddenGemScore >= 72) {
    drivers.push(`Hidden-gem score is high at ${input.hiddenGemScore}/100.`);
  }

  if (input.saturation <= 58) {
    drivers.push(`Saturation is still manageable at ${input.saturation}/100.`);
  }

  if (input.contentScore >= 76) {
    drivers.push(
      `Content angle potential is usable at ${input.contentScore}/100.`,
    );
  }

  if (sourceCredibility >= 70) {
    drivers.push(`Source credibility is healthy at ${sourceCredibility}/100.`);
  }

  if (input.sourceCount >= 2) {
    drivers.push(`${input.sourceCount} sources are confirming the topic.`);
  }

  return drivers.slice(0, 5);
}

function buildWarnings(input: CreatorOpportunityInput) {
  const warnings: string[] = [];

  if (input.saturation >= 72) {
    warnings.push(`Saturation pressure is high at ${input.saturation}/100.`);
  }

  if (input.sourceCount <= 1) {
    warnings.push("Only one source is visible, so confirmation is thin.");
  }

  if (input.lifecycle.stalenessRisk !== "low") {
    warnings.push(`Staleness risk is ${input.lifecycle.stalenessRisk}.`);
  }

  if (input.contentScore < 58) {
    warnings.push(`Content score is weak at ${input.contentScore}/100.`);
  }

  return warnings.slice(0, 4);
}

export function buildCreatorOpportunity(
  input: CreatorOpportunityInput,
): CreatorOpportunity {
  const sourceCredibility = credibilityScore(input);
  const crossSource = crossSourceConfirmation(input);
  const topicClarity = topicClarityScore(input);
  const lifecycleFit = lifecycleFitScore(input.lifecycle.status);
  const lowSaturationScore = clampScore(100 - input.saturation);
  const penalty =
    saturationPenalty(input.saturation) +
    stalenessPenalty(input.lifecycle.stalenessRisk) +
    (input.sourceCount === 0 ? 12 : 0);

  const score = clampScore(
    input.lifecycle.freshnessScore * 0.16 +
      input.hiddenGemScore * 0.16 +
      input.creatorGap * 0.13 +
      lowSaturationScore * 0.1 +
      input.contentScore * 0.15 +
      sourceCredibility * 0.11 +
      lifecycleFit * 0.1 +
      crossSource * 0.05 +
      topicClarity * 0.04 -
      penalty,
  );
  const level = opportunityLevel(score);
  const timing = recommendedTiming(input, score);
  const format = recommendedFormat(input);
  const risk = contentRisk(input);
  const bestAngle = buildBestAngle(input, timing, format);
  const drivers = buildDrivers(input, sourceCredibility);
  const warnings = buildWarnings(input);

  const explanation = `${input.topic} is a ${level.toLowerCase()} creator opportunity because the model sees ${input.lifecycle.freshnessScore}/100 freshness, ${input.hiddenGemScore}/100 hidden-gem strength, ${input.contentScore}/100 content potential and ${input.saturation}/100 saturation. Timing is ${timing.toLowerCase()} because the lifecycle is ${input.lifecycle.status.toLowerCase()} with ${input.sourceCount} confirming source${
    input.sourceCount === 1 ? "" : "s"
  }.`;

  return {
    score,
    level,
    recommendedTiming: timing,
    recommendedFormat: format,
    bestAngle,
    audienceFit: audienceFit(input),
    contentRisk: risk,
    explanation,
    metrics: {
      freshness: input.lifecycle.freshnessScore,
      hiddenGem: input.hiddenGemScore,
      creatorGap: input.creatorGap,
      lowSaturation: lowSaturationScore,
      sourceCredibility,
      lifecycleFit,
      crossSourceConfirmation: crossSource,
      topicClarity,
      contentAnglePotential: input.contentScore,
      stalenessPenalty: stalenessPenalty(input.lifecycle.stalenessRisk),
    },
    drivers,
    warnings,
  };
}
