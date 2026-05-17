import type {
  DashboardTopSignal,
  ResearchEvidenceLevel,
  ResearchSignalCalibration,
  SourceQualitySummary,
  TrendLifecycleStatus,
} from "@/lib/trends/types";

type BuildResearchSignalCalibrationInput = {
  topic: string;
  category: string;
  sources: string[];
  topSignals: DashboardTopSignal[];
  sourceQuality: SourceQualitySummary;
  hiddenGemScore: number;
  saturation: number;
  mentionCount: number;
  sourceCount: number;
  lifecycleStatus: TrendLifecycleStatus;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isResearchSource(source: string) {
  const normalized = source.trim().toLowerCase();
  return (
    normalized.includes("arxiv") ||
    normalized.includes("paper") ||
    normalized.includes("research") ||
    normalized.includes("preprint")
  );
}

function researchCategoryHint(value: string) {
  return /research|benchmark|evaluation|paper|dataset|model/i.test(value);
}

function sourceLabel(count: number) {
  if (count <= 0) return "no non-research sources";
  if (count === 1) return "one non-research source";
  return `${count} non-research sources`;
}

function levelFor(args: {
  arxivSignalCount: number;
  nonResearchSourceCount: number;
  researchSourceShare: number;
  researchSignalScore: number;
}): ResearchEvidenceLevel {
  if (args.arxivSignalCount === 0) return "none";

  if (args.nonResearchSourceCount === 0) return "research_only";

  if (args.researchSourceShare >= 0.72 && args.nonResearchSourceCount <= 1) {
    return "overweighted";
  }

  if (args.researchSignalScore >= 70 && args.nonResearchSourceCount >= 2) {
    return "research_backed";
  }

  return "early_research";
}

function confidenceImpactFor(level: ResearchEvidenceLevel) {
  if (level === "research_backed") return "boost" as const;
  if (level === "research_only" || level === "overweighted") {
    return "caution" as const;
  }
  return "neutral" as const;
}

function buildSummary(args: {
  topic: string;
  level: ResearchEvidenceLevel;
  arxivSignalCount: number;
  nonResearchSourceCount: number;
  researchSignalScore: number;
}) {
  if (args.level === "none") {
    return "No research-source signal is attached yet.";
  }

  if (args.level === "research_backed") {
    return `${args.topic} has research support and ${sourceLabel(args.nonResearchSourceCount)} confirming it outside arXiv.`;
  }

  if (args.level === "research_only") {
    return `${args.topic} is currently research-only: useful for validation, not enough for a product or content decision by itself.`;
  }

  if (args.level === "overweighted") {
    return `${args.topic} has visible research evidence, but arXiv is carrying too much of the signal mix.`;
  }

  return `${args.topic} has early research evidence, but needs more external confirmation before it should move up aggressively.`;
}

function buildRecommendedUse(level: ResearchEvidenceLevel) {
  if (level === "research_backed") {
    return "Use as supporting evidence in Research Memo, hidden-gem reasoning and deeper product research.";
  }

  if (level === "research_only") {
    return "Keep as a watch/research item. Do not promote to Act Now without builder, market or community confirmation.";
  }

  if (level === "overweighted") {
    return "Keep the research caveat visible and wait for non-research sources before raising priority.";
  }

  if (level === "early_research") {
    return "Use as a weak positive signal for discovery, not as proof of adoption.";
  }

  return "No research adjustment should be applied.";
}

export function buildResearchSignalCalibration(
  input: BuildResearchSignalCalibrationInput,
): ResearchSignalCalibration {
  const researchContributions = input.sourceQuality.contribution.filter(
    (item) => item.category === "research" || isResearchSource(item.source),
  );
  const arxivContribution = researchContributions.find((item) =>
    item.source.toLowerCase().includes("arxiv"),
  );
  const arxivSignalCount = researchContributions.reduce(
    (sum, item) => sum + item.signalCount,
    0,
  );
  const totalVisibleSignals = input.sourceQuality.contribution.reduce(
    (sum, item) => sum + item.signalCount,
    0,
  );
  const nonResearchSourceCount = input.sourceQuality.contribution.filter(
    (item) => item.category !== "research" && !isResearchSource(item.source),
  ).length;
  const researchSourceShare = totalVisibleSignals > 0
    ? arxivSignalCount / totalVisibleSignals
    : 0;
  const researchTrustScore = researchContributions.length > 0
    ? clampScore(
        researchContributions.reduce((sum, item) => sum + item.trustScore, 0) /
          researchContributions.length,
      )
    : 0;
  const topicalResearchHint = researchCategoryHint(input.category) ||
    researchCategoryHint(input.topic) ||
    input.topSignals.some((signal) => researchCategoryHint(signal.title));
  const crossSourceLift = nonResearchSourceCount >= 2
    ? 18
    : nonResearchSourceCount === 1
      ? 9
      : 0;
  const hiddenGemLift = input.hiddenGemScore >= 68 && input.saturation <= 65 ? 8 : 0;
  const categoryFit = topicalResearchHint ? 8 : 0;
  const researchOnlyPenalty = arxivSignalCount > 0 && nonResearchSourceCount === 0
    ? 22
    : arxivSignalCount > 0 && researchSourceShare >= 0.72 && nonResearchSourceCount <= 1
      ? 12
      : 0;
  const stalePenalty =
    input.lifecycleStatus === "Stale" || input.lifecycleStatus === "Dormant"
      ? 14
      : input.lifecycleStatus === "Cooling"
        ? 6
        : 0;
  const researchSignalDensity = clampScore(arxivSignalCount * 24);
  const researchSignalScore = arxivSignalCount === 0
    ? 0
    : clampScore(
        researchTrustScore * 0.34 +
          researchSignalDensity * 0.16 +
          input.sourceQuality.sourceFreshnessScore * 0.14 +
          input.sourceQuality.crossSourceConfirmationScore * 0.16 +
          input.hiddenGemScore * 0.08 +
          crossSourceLift +
          hiddenGemLift +
          categoryFit -
          researchOnlyPenalty -
          stalePenalty,
      );
  const evidenceLevel = levelFor({
    arxivSignalCount,
    nonResearchSourceCount,
    researchSourceShare,
    researchSignalScore,
  });
  const confidenceImpact = confidenceImpactFor(evidenceLevel);
  const drivers: string[] = [];
  const warnings: string[] = [];

  if (arxivSignalCount > 0) {
    drivers.push(`${arxivSignalCount} research signal${arxivSignalCount === 1 ? "" : "s"} found.`);
  }
  if (researchTrustScore >= 80) {
    drivers.push(`Research source trust is ${researchTrustScore}/100.`);
  }
  if (nonResearchSourceCount >= 2) {
    drivers.push(`Confirmed outside research by ${sourceLabel(nonResearchSourceCount)}.`);
  }
  if (hiddenGemLift > 0) {
    drivers.push("Research evidence supports the hidden-gem profile.");
  }
  if (categoryFit > 0) {
    drivers.push("Topic/category fit makes research evidence more relevant.");
  }
  if (arxivContribution) {
    drivers.push(`arXiv contributes ${Math.round(arxivContribution.share * 100)}% of visible evidence.`);
  }

  if (researchOnlyPenalty > 0) {
    warnings.push("Research evidence is too isolated to justify an Act Now decision.");
  }
  if (researchSourceShare >= 0.72 && nonResearchSourceCount <= 1) {
    warnings.push("arXiv is overrepresented; wait for builder, market or community confirmation.");
  }
  if (input.mentionCount <= 2 && arxivSignalCount > 0) {
    warnings.push("Mention count is still thin, so keep the claim cautious.");
  }
  if (stalePenalty > 0) {
    warnings.push(`Lifecycle is ${input.lifecycleStatus}; research evidence should not revive a stale topic by itself.`);
  }

  return {
    score: researchSignalScore,
    evidenceLevel,
    confidenceImpact,
    researchSignalCount: arxivSignalCount,
    arxivSignalCount,
    researchSourceShare: clampScore(researchSourceShare * 100),
    nonResearchSourceCount,
    crossSourceLift,
    hiddenGemLift,
    researchOnlyPenalty,
    summary: buildSummary({
      topic: input.topic,
      level: evidenceLevel,
      arxivSignalCount,
      nonResearchSourceCount,
      researchSignalScore,
    }),
    caveat:
      confidenceImpact === "caution"
        ? "Treat this as early evidence, not adoption proof."
        : confidenceImpact === "boost"
          ? "Research signal is useful because it is not alone."
          : "Research signal has limited ranking impact for now.",
    recommendedUse: buildRecommendedUse(evidenceLevel),
    drivers: drivers.slice(0, 6),
    warnings: warnings.slice(0, 6),
  };
}
