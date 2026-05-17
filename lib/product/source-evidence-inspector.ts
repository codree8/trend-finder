import { getSourceProfile } from "@/lib/scoring/source-profiles";
import { sourceCategory } from "@/lib/product/source-quality";
import type {
  DashboardTrend,
  SourceQualityCategory,
  TrendDetailSignal,
  TrendScoringTransparency,
  TrendSourceEvidenceGroup,
  TrendSourceEvidenceInspector,
  TrendSourceEvidenceSignal,
  TrendSourceEvidenceVerdict,
} from "@/lib/trends/types";

type BuildTrendSourceEvidenceInspectorInput = {
  trend: DashboardTrend;
  signals: TrendDetailSignal[];
  scoringTransparency?: TrendScoringTransparency;
};

type SignalWithScore = TrendDetailSignal & {
  sourceEvidenceScore: number;
  sourceCategory: SourceQualityCategory;
  impact: TrendSourceEvidenceVerdict;
  impactLabel: string;
  reason: string;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function signalDate(signal: TrendDetailSignal) {
  const value = signal.publishedAt ?? signal.createdAt;
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function signalAgeHours(signal: TrendDetailSignal) {
  const date = signalDate(signal);
  if (!date) return 240;

  return Math.max(0, (Date.now() - date.getTime()) / 36e5);
}

function engagementScore(engagement: number) {
  return clampScore(Math.log10(Math.max(1, engagement) + 10) * 22);
}

function freshnessScore(signal: TrendDetailSignal) {
  const ageHours = signalAgeHours(signal);
  if (ageHours <= 24) return 100;
  if (ageHours <= 72) return 84;
  if (ageHours <= 168) return 62;
  if (ageHours <= 336) return 42;
  return 28;
}

function signalEvidenceScore(signal: TrendDetailSignal) {
  const profile = getSourceProfile(signal.source);
  const explicitQuality =
    typeof signal.qualityScore === "number" && Number.isFinite(signal.qualityScore)
      ? clampScore(signal.qualityScore)
      : null;
  const tagLift =
    (signal.qualityTags?.includes("strong_source") ? 8 : 0) +
    (signal.qualityTags?.includes("cross_source_confirmation") ? 7 : 0) +
    (signal.qualityTags?.includes("fresh") ? 6 : 0) +
    (signal.evidenceTags?.includes("momentum_shift") ? 4 : 0) -
    (signal.qualityTags?.includes("weak_source") ? 10 : 0) -
    (signal.qualityTags?.includes("stale_evidence") ? 8 : 0);

  return clampScore(
    profile.credibility * 0.34 +
      profile.earlySignal * 0.2 +
      (explicitQuality ?? 60) * 0.18 +
      engagementScore(signal.engagement) * 0.12 +
      freshnessScore(signal) * 0.16 +
      tagLift,
  );
}

function impactForSignal(signal: TrendDetailSignal, score: number): TrendSourceEvidenceVerdict {
  if (
    signal.qualityTags?.includes("weak_source") ||
    signal.qualityTags?.includes("stale_evidence") ||
    signal.evidenceTags?.includes("saturation_warning")
  ) {
    return score >= 72 ? "watch" : "caution";
  }

  if (score >= 76) return "supports";
  if (score >= 56) return "watch";
  return "weak";
}

function impactLabel(impact: TrendSourceEvidenceVerdict) {
  if (impact === "supports") return "Supports score";
  if (impact === "watch") return "Useful, watch";
  if (impact === "caution") return "Adds caution";
  return "Weak evidence";
}

function signalReason(signal: TrendDetailSignal, score: number, impact: TrendSourceEvidenceVerdict) {
  if (impact === "supports") {
    return `${signal.source} is strong enough to support this trend because the source profile, freshness and signal quality are aligned.`;
  }

  if (impact === "watch") {
    return `${signal.source} adds usable context, but it is not strong enough on its own to move this trend into an act-now decision.`;
  }

  if (impact === "caution") {
    return `${signal.source} should be read carefully here because the signal has weak, stale or saturation pressure attached.`;
  }

  return `${signal.source} is visible evidence, but the ${score}/100 signal score is too thin to carry the trend by itself.`;
}

function toInspectorSignal(signal: SignalWithScore): TrendSourceEvidenceSignal {
  return {
    title: signal.title,
    source: signal.source,
    url: signal.url,
    engagement: signal.engagement,
    publishedAt: signal.publishedAt,
    createdAt: signal.createdAt,
    qualityScore: signal.qualityScore,
    evidenceTags: signal.evidenceTags ?? [],
    qualityTags: signal.qualityTags ?? [],
    sourceEvidenceScore: signal.sourceEvidenceScore,
    impact: signal.impact,
    impactLabel: signal.impactLabel,
    reason: signal.reason,
  };
}

function average(values: number[], fallback = 0) {
  if (values.length === 0) return fallback;
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function groupVerdict(args: {
  averageSignalScore: number;
  trustScore: number;
  share: number;
  hasCaution: boolean;
}): TrendSourceEvidenceVerdict {
  if (args.hasCaution && args.averageSignalScore < 74) return "caution";
  if (args.averageSignalScore >= 76 && args.trustScore >= 72) return "supports";
  if (args.averageSignalScore >= 56) return "watch";
  if (args.share >= 0.65) return "caution";
  return "weak";
}

function verdictLabel(verdict: TrendSourceEvidenceVerdict) {
  if (verdict === "supports") return "Supports the trend";
  if (verdict === "watch") return "Useful but not decisive";
  if (verdict === "caution") return "Needs caution";
  return "Weak contribution";
}

function roleLabelForCategory(category: SourceQualityCategory) {
  const labels: Record<SourceQualityCategory, string> = {
    code: "Builder validation",
    "builder-community": "Builder discussion",
    editorial: "Narrative context",
    social: "Community demand",
    video: "Creator saturation",
    research: "Research evidence",
    unknown: "Unclassified signal",
  };

  return labels[category];
}

function groupSummary(group: {
  source: string;
  category: SourceQualityCategory;
  signalCount: number;
  averageSignalScore: number;
  verdict: TrendSourceEvidenceVerdict;
  share: number;
}) {
  if (group.verdict === "supports") {
    return `${group.source} is a meaningful contributor: ${group.signalCount} signal${group.signalCount === 1 ? "" : "s"} with ${group.averageSignalScore}/100 average evidence quality.`;
  }

  if (group.verdict === "watch") {
    return `${group.source} adds useful context, but it should be paired with other sources before this trend is promoted hard.`;
  }

  if (group.verdict === "caution") {
    return `${group.source} is carrying ${Math.round(group.share * 100)}% of visible evidence or contains caution tags. Do not over-read it.`;
  }

  return `${group.source} is visible, but the evidence contribution is weak compared with stronger source groups.`;
}

function groupWarnings(args: {
  source: string;
  share: number;
  signals: SignalWithScore[];
  trustScore: number;
  trend: DashboardTrend;
}) {
  const warnings: string[] = [];

  if (args.share >= 0.7 && args.trend.sourceCount > 1) {
    warnings.push(`${args.source} is overrepresented in this trend.`);
  }

  if (args.trustScore < 66) {
    warnings.push(`${args.source} has lower source trust than the rest of the stack.`);
  }

  if (args.signals.some((signal) => signal.qualityTags?.includes("stale_evidence"))) {
    warnings.push("Some evidence from this source is stale.");
  }

  if (args.signals.some((signal) => signal.qualityTags?.includes("weak_source"))) {
    warnings.push("Some signals from this source are marked as weak-source evidence.");
  }

  return warnings;
}

function buildFallbackSignals(trend: DashboardTrend): SignalWithScore[] {
  return trend.topSignals.map((signal) => {
    const normalizedSource = normalizeSource(signal.source);
    const score = signalEvidenceScore({
      ...signal,
      source: normalizedSource,
      externalId: null,
      publishedAt: null,
      createdAt: trend.lastSeenAt,
      weight: 1,
    });
    const base: TrendDetailSignal = {
      ...signal,
      source: normalizedSource,
      externalId: null,
      publishedAt: null,
      createdAt: trend.lastSeenAt,
      weight: 1,
    };
    const impact = impactForSignal(base, score);

    return {
      ...base,
      sourceEvidenceScore: score,
      sourceCategory: sourceCategory(normalizedSource),
      impact,
      impactLabel: impactLabel(impact),
      reason: signalReason(base, score, impact),
    };
  });
}

function buildSignalRows(
  trend: DashboardTrend,
  signals: TrendDetailSignal[],
): SignalWithScore[] {
  const usableSignals = signals.length > 0 ? signals : buildFallbackSignals(trend);

  return usableSignals
    .map((signal) => {
      const normalizedSource = normalizeSource(signal.source);
      const normalizedSignal = { ...signal, source: normalizedSource };
      const score = signalEvidenceScore(normalizedSignal);
      const impact = impactForSignal(normalizedSignal, score);

      return {
        ...normalizedSignal,
        sourceEvidenceScore: score,
        sourceCategory: sourceCategory(normalizedSource),
        impact,
        impactLabel: impactLabel(impact),
        reason: signalReason(normalizedSignal, score, impact),
      } satisfies SignalWithScore;
    })
    .sort((a, b) => b.sourceEvidenceScore - a.sourceEvidenceScore || b.engagement - a.engagement);
}

function buildSourceGroups(
  trend: DashboardTrend,
  signals: SignalWithScore[],
): TrendSourceEvidenceGroup[] {
  const bySource = new Map<string, SignalWithScore[]>();

  for (const signal of signals) {
    const source = normalizeSource(signal.source);
    bySource.set(source, [...(bySource.get(source) ?? []), signal]);
  }

  const totalSignals = Math.max(1, signals.length);

  return Array.from(bySource.entries())
    .map(([source, sourceSignals]) => {
      const profile = getSourceProfile(source);
      const category = sourceCategory(source);
      const share = sourceSignals.length / totalSignals;
      const averageSignalScore = average(
        sourceSignals.map((signal) => signal.sourceEvidenceScore),
        profile.credibility,
      );
      const contributionScore = clampScore(
        averageSignalScore * 0.54 + profile.credibility * 0.28 + Math.min(100, share * 160) * 0.18,
      );
      const verdict = groupVerdict({
        averageSignalScore,
        trustScore: profile.credibility,
        share,
        hasCaution: sourceSignals.some(
          (signal) => signal.impact === "caution" || signal.impact === "weak",
        ),
      });
      const summaryInput = {
        source,
        category,
        signalCount: sourceSignals.length,
        averageSignalScore,
        verdict,
        share,
      };

      return {
        source,
        category,
        roleLabel: roleLabelForCategory(category),
        signalCount: sourceSignals.length,
        share: clampScore(share * 100),
        trustScore: clampScore(profile.credibility),
        averageSignalScore,
        contributionScore,
        verdict,
        verdictLabel: verdictLabel(verdict),
        summary: groupSummary(summaryInput),
        warnings: groupWarnings({
          source,
          share,
          signals: sourceSignals,
          trustScore: profile.credibility,
          trend,
        }),
        signals: sourceSignals.slice(0, 5).map(toInspectorSignal),
      } satisfies TrendSourceEvidenceGroup;
    })
    .sort((a, b) => b.contributionScore - a.contributionScore || b.signalCount - a.signalCount);
}

function strongestWeakest(groups: TrendSourceEvidenceGroup[]) {
  const strongest = groups[0]?.source ?? null;
  const weakest = groups.slice().sort((a, b) => a.contributionScore - b.contributionScore)[0]?.source ?? null;

  return { strongest, weakest };
}

function buildAdoptionEvidence(trend: DashboardTrend, groups: TrendSourceEvidenceGroup[]) {
  const builderSources = groups.filter(
    (group) => group.category === "code" || group.category === "builder-community",
  );
  const score = clampScore(
    trend.velocity * 0.32 +
      trend.sourceQuality.crossSourceConfirmationScore * 0.3 +
      average(builderSources.map((group) => group.contributionScore), 45) * 0.38,
  );

  if (score >= 76) {
    return `Adoption evidence is strong enough to inspect now: builder/community sources are contributing ${score}/100.`;
  }

  if (score >= 56) {
    return `Adoption evidence is usable but not decisive yet. Treat it as watch-worthy until another independent source confirms it.`;
  }

  return `Adoption evidence is thin. This may be interesting, but the market/builder proof is not strong yet.`;
}

function buildResearchEvidence(trend: DashboardTrend, groups: TrendSourceEvidenceGroup[]) {
  const researchGroup = groups.find((group) => group.category === "research");

  if (!researchGroup || trend.researchSignal.researchSignalCount === 0) {
    return "No dedicated research source is carrying this trend yet.";
  }

  if (trend.researchSignal.confidenceImpact === "boost") {
    return `Research evidence supports the trend, especially because it is paired with non-research confirmation. ${trend.researchSignal.caveat}`;
  }

  if (trend.researchSignal.confidenceImpact === "caution") {
    return `Research evidence exists, but it is not adoption proof by itself. ${trend.researchSignal.caveat}`;
  }

  return `Research evidence is present and useful as context, but it should stay a caveat-aware input rather than the whole conclusion.`;
}

function buildCreatorEvidence(trend: DashboardTrend, groups: TrendSourceEvidenceGroup[]) {
  const creatorSources = groups.filter((group) => group.category === "video" || group.category === "social");
  const creatorScore = clampScore(
    trend.creatorOpportunity.score * 0.42 +
      trend.contentScore * 0.24 +
      average(creatorSources.map((group) => group.contributionScore), 45) * 0.2 +
      (100 - trend.saturation) * 0.14,
  );

  if (creatorScore >= 76) {
    return `Creator evidence is strong: there is enough signal and still enough room to frame a useful angle.`;
  }

  if (creatorScore >= 56) {
    return `Creator evidence is decent, but the angle needs to be specific. Generic commentary will probably blend into the feed.`;
  }

  return `Creator evidence is weak for now. Keep it as research input unless a sharper hook appears.`;
}

function buildWarnings(trend: DashboardTrend, groups: TrendSourceEvidenceGroup[]) {
  const warnings = [
    trend.sourceQuality.singleSourceRisk !== "low" ? "Single-source risk is still present." : "",
    trend.sourceQuality.overrepresentedSourceWarning ?? "",
    trend.sourceQuality.weakSourceWarning ?? "",
    trend.researchSignal.confidenceImpact === "caution" ? trend.researchSignal.caveat : "",
    groups.some((group) => group.verdict === "caution")
      ? "At least one source group should be read as caution, not proof."
      : "",
  ].filter(Boolean);

  return Array.from(new Set(warnings)).slice(0, 5);
}

export function buildTrendSourceEvidenceInspector({
  trend,
  signals,
  scoringTransparency,
}: BuildTrendSourceEvidenceInspectorInput): TrendSourceEvidenceInspector {
  const signalRows = buildSignalRows(trend, signals);
  const groups = buildSourceGroups(trend, signalRows);
  const { strongest, weakest } = strongestWeakest(groups);
  const overallScore = clampScore(
    trend.sourceQuality.sourceTrustScore * 0.24 +
      trend.sourceQuality.crossSourceConfirmationScore * 0.28 +
      trend.sourceQuality.sourceDiversityScore * 0.16 +
      average(groups.map((group) => group.contributionScore), 50) * 0.22 +
      trend.topicQuality.score * 0.1,
  );
  const verdict: TrendSourceEvidenceVerdict =
    trend.sourceQuality.singleSourceRisk === "high" || overallScore < 45
      ? "weak"
      : buildWarnings(trend, groups).length >= 3 || overallScore < 58
        ? "caution"
        : overallScore >= 76 && trend.sourceQuality.confirmedSourceCount >= 2
          ? "supports"
          : "watch";
  const warningList = buildWarnings(trend, groups);
  const confidenceDriver = scoringTransparency?.confidence
    ? `${scoringTransparency.confidence.toLowerCase()} ranking confidence`
    : `${trend.productIntelligence.sourceConfidence}/100 source confidence`;

  const summary =
    verdict === "supports"
      ? `The evidence stack supports this trend: ${strongest ?? "the strongest source group"} is leading and cross-source confirmation is usable.`
      : verdict === "watch"
        ? `The evidence stack is usable, but it still needs more confirmation before being treated as a clean act-now trend.`
        : verdict === "caution"
          ? `The evidence stack has meaningful caveats. Inspect source concentration, stale signals or research-only pressure before acting.`
          : `The evidence stack is too thin to carry this trend without more signals.`;

  return {
    overallScore,
    verdict,
    verdictLabel: verdictLabel(verdict),
    summary,
    sourceCount: trend.sourceCount,
    signalCount: signalRows.length,
    strongestSource: strongest,
    weakestSource: weakest,
    confidenceDriver,
    crossSourceSummary: trend.sourceQuality.summary,
    adoptionEvidence: buildAdoptionEvidence(trend, groups),
    researchEvidence: buildResearchEvidence(trend, groups),
    creatorEvidence: buildCreatorEvidence(trend, groups),
    warnings: warningList,
    groups,
  };
}
