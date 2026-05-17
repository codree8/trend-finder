import type { ProductPreferences } from "@/lib/preferences/product-preferences";
import { productPreferenceScore, sourceWeightMultiplier } from "@/lib/product/apply-product-preferences";
import type { DashboardTrend } from "@/lib/trends/types";

export type ProductTrendClassification = "Act" | "Watch" | "Avoid";

export type ProductTrendIntelligence = {
  signalStrength: number;
  evidenceQuality: number;
  sourceConfidence: number;
  classification: ProductTrendClassification;
  classificationLabel: string;
  whyNow: string;
  whyItMatters: string;
  creatorAngle: string;
  startupAngle: string;
  noiseRisk: string;
  saturationRisk: string;
  recommendedNextAction: string;
  evidenceQualitySummary: string;
  sourceContributionSummary: string;
  researchSummary: string;
  researchCaveat: string;
};

export type TrendCalibrationBreakdown = {
  rawScore: number;
  adjustedScore: number;
  delta: number;
  sourceContribution: number;
  freshnessContribution: number;
  lifecycleContribution: number;
  qualityGateContribution: number;
  creatorOpportunityContribution: number;
  sourceDiversityContribution: number;
  researchSignalContribution: number;
  researchOnlyPenalty: number;
  weakEvidencePenalty: number;
  noiseRiskPenalty: number;
  mainstreamSaturationPenalty: number;
  hiddenGemBoost: number;
  explanation: string;
  movementExplanation: string;
  recommendedCalibrationAction: string;
  positiveDrivers: string[];
  negativePressure: string[];
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sentenceList(items: string[]) {
  const usable = items.filter(Boolean).slice(0, 3);
  if (usable.length === 0) return "No strong driver detected.";
  return usable.join(" ");
}

export function buildProductTrendIntelligence(
  trend: DashboardTrend,
): ProductTrendIntelligence {
  const signalStrength = clampScore(
    trend.trendScore * 0.5 + trend.velocity * 0.22 + trend.lifecycle.freshnessScore * 0.28,
  );
  const researchEvidenceLift =
    trend.researchSignal.confidenceImpact === "boost"
      ? trend.researchSignal.score * 0.08
      : trend.researchSignal.confidenceImpact === "caution"
        ? -trend.researchSignal.researchOnlyPenalty * 0.45
        : trend.researchSignal.score * 0.03;
  const evidenceQuality = clampScore(
    trend.topicQuality.score * 0.52 +
      trend.sourceQuality.sourceTrustScore * 0.19 +
      trend.sourceQuality.crossSourceConfirmationScore * 0.23 +
      researchEvidenceLift,
  );
  const sourceConfidence = clampScore(
    trend.sourceQuality.sourceTrustScore * 0.36 +
      trend.sourceQuality.connectorReliabilityScore * 0.2 +
      trend.sourceQuality.crossSourceConfirmationScore * 0.24 +
      trend.sourceQuality.sourceDiversityScore * 0.14 +
      (trend.researchSignal.confidenceImpact === "boost" ? 6 : 0) -
      (trend.researchSignal.confidenceImpact === "caution" ? 6 : 0),
  );
  const shouldAvoid =
    trend.topicQuality.gateStatus === "suppress" ||
    trend.topicQuality.noiseRisk === "high" ||
    trend.lifecycle.status === "Stale" ||
    trend.lifecycle.status === "Dormant" ||
    (trend.saturation >= 86 && trend.hiddenGemScore < 65) ||
    (trend.researchSignal.evidenceLevel === "research_only" && trend.sourceQuality.confirmedSourceCount <= 1) ||
    evidenceQuality < 42;
  const shouldAct =
    !shouldAvoid &&
    signalStrength >= 72 &&
    evidenceQuality >= 64 &&
    sourceConfidence >= 58 &&
    trend.creatorOpportunity.contentRisk !== "high";
  const classification: ProductTrendClassification = shouldAvoid
    ? "Avoid"
    : shouldAct
      ? "Act"
      : "Watch";
  const classificationLabel =
    classification === "Act"
      ? "Strong enough to act on"
      : classification === "Watch"
        ? evidenceQuality >= 56
          ? "Early but promising"
          : "Needs more confirmation"
        : "Too noisy for now";
  const noiseRisk =
    trend.topicQuality.noiseRisk === "low"
      ? "Low noise risk"
      : trend.topicQuality.noiseRisk === "medium"
        ? "Some noise risk"
        : "High noise risk";
  const saturationRisk =
    trend.saturation >= 82
      ? "High saturation risk"
      : trend.saturation >= 62
        ? "Moderate saturation risk"
        : "Low saturation risk";

  return {
    signalStrength,
    evidenceQuality,
    sourceConfidence,
    classification,
    classificationLabel,
    whyNow: trend.whyNow,
    whyItMatters:
      classification === "Act"
        ? trend.researchSignal.confidenceImpact === "boost"
          ? `${trend.topic} has enough freshness, evidence, source confidence and research support to turn into a concrete move.`
          : `${trend.topic} has enough freshness, evidence and source confidence to turn into a concrete move.`
        : classification === "Watch"
          ? `${trend.topic} has useful early movement, but the safer play is to confirm evidence before spending serious attention.`
          : `${trend.topic} is not clean enough for today's focus. The risk is higher than the opportunity.`,
    creatorAngle:
      trend.creatorOpportunity.contentRisk === "high"
        ? "Creator angle exists, but it needs a sharper evidence-backed hook first."
        : trend.creatorOpportunity.bestAngle,
    startupAngle:
      trend.researchSignal.evidenceLevel === "research_backed"
        ? `Good research-backed startup angle: validate which workflow pain could turn ${trend.topic.toLowerCase()} from paper signal into applied demand.`
        : trend.researchSignal.evidenceLevel === "research_only"
          ? `Research-only angle: useful for exploration, but validate adoption before treating ${trend.topic.toLowerCase()} as a startup opportunity.`
          : trend.saturation <= 68 && trend.sourceQuality.crossSourceConfirmationScore >= 58
            ? `Good startup research angle: inspect who is adopting ${trend.topic.toLowerCase()} and what workflow pain it reveals.`
            : `Startup angle is watch-only: validate demand and source diversity before framing ${trend.topic.toLowerCase()} as an opportunity.`,
    noiseRisk,
    saturationRisk,
    recommendedNextAction:
      classification === "Act"
        ? "Open the evidence, pick one angle, then turn it into a content or product-research action today."
        : classification === "Watch"
          ? "Save it, monitor the next scan, and wait for broader confirmation before acting."
          : "Skip it for now unless new evidence appears from stronger or more diverse sources.",
    evidenceQualitySummary:
      evidenceQuality >= 70
        ? "Evidence quality is strong enough for a focused move."
        : evidenceQuality >= 52
          ? "Evidence quality is usable, but not bulletproof."
          : "Evidence quality is thin; do not over-interpret it.",
    sourceContributionSummary: trend.sourceQuality.summary,
    researchSummary: trend.researchSignal.summary,
    researchCaveat: trend.researchSignal.caveat,
  };
}

export function buildTrendCalibrationBreakdown(
  trend: DashboardTrend,
  preferences: ProductPreferences,
): TrendCalibrationBreakdown {
  const preferenceScore = productPreferenceScore(trend, preferences);
  const adjustedScore = Math.max(0, preferenceScore);
  const delta = preferenceScore < 0 ? -trend.trendScore : adjustedScore - trend.trendScore;
  const sourceMultiplier = sourceWeightMultiplier(trend.sources, preferences.sourceWeights);
  const sourceContribution = clampScore((sourceMultiplier - 1) * 100 + 50);
  const freshnessContribution = clampScore(trend.lifecycle.freshnessScore * 0.18);
  const lifecycleContribution = clampScore(
    trend.lifecycle.status === "Accelerating"
      ? 18
      : trend.lifecycle.status === "Emerging"
        ? 14
        : trend.lifecycle.status === "Cooling"
          ? 6
          : trend.lifecycle.status === "Stale" || trend.lifecycle.status === "Dormant"
            ? 0
            : 10,
  );
  const qualityGateContribution = clampScore(trend.topicQuality.score * 0.18);
  const creatorOpportunityContribution = clampScore(trend.creatorOpportunity.score * 0.16);
  const sourceDiversityContribution = clampScore(trend.sourceQuality.sourceDiversityScore * 0.1);
  const researchSignalContribution =
    trend.researchSignal.confidenceImpact === "boost"
      ? clampScore(trend.researchSignal.score * 0.12)
      : trend.researchSignal.evidenceLevel === "early_research"
        ? clampScore(trend.researchSignal.score * 0.06)
        : 0;
  const researchOnlyPenalty =
    trend.researchSignal.confidenceImpact === "caution"
      ? Math.max(6, trend.researchSignal.researchOnlyPenalty)
      : 0;
  const weakEvidencePenalty =
    trend.mentionCount <= 2 || trend.sourceQuality.singleSourceRisk !== "low" ? 10 : 0;
  const noiseRiskPenalty =
    trend.topicQuality.noiseRisk === "high"
      ? 18
      : trend.topicQuality.noiseRisk === "medium"
        ? 8
        : 0;
  const mainstreamSaturationPenalty =
    trend.saturation >= 82 ? 16 : trend.saturation >= 70 ? 8 : 0;
  const hiddenGemBoost =
    preferences.interestProfile.prioritizeHiddenGems &&
    (trend.status === "Hidden Gem" || trend.hiddenGemScore >= 72)
      ? 8
      : 0;
  const positiveDrivers = [
    trend.lifecycle.freshnessScore >= 72 ? "Fresh signals are pushing it up." : "",
    trend.creatorOpportunity.score >= 72 ? "Creator opportunity is strong." : "",
    trend.sourceQuality.crossSourceConfirmationScore >= 70 ? "Cross-source confirmation is healthy." : "",
    hiddenGemBoost > 0 ? "Hidden-gem preference boosts the rank." : "",
    researchSignalContribution > 0 ? "Research signal supports the rank without becoming the whole story." : "",
  ].filter(Boolean);
  const negativePressure = [
    weakEvidencePenalty > 0 ? "Evidence is thin or single-source." : "",
    noiseRiskPenalty > 0 ? "Noise risk is reducing confidence." : "",
    mainstreamSaturationPenalty > 0 ? "Saturation is pulling it down." : "",
    researchOnlyPenalty > 0 ? "Research-only evidence prevents over-promotion." : "",
    preferenceScore < 0 ? "Current preference filters hide this trend." : "",
  ].filter(Boolean);
  const movementExplanation =
    delta > 5
      ? `${trend.topic} moves up because local preferences reward its source mix, freshness or hidden-gem profile.`
      : delta < -5
        ? `${trend.topic} moves down because local preferences, weak evidence or saturation pressure reduce its product fit.`
        : `${trend.topic} stays close to its stored rank; calibration is not materially changing it.`;
  const recommendedCalibrationAction =
    negativePressure.length > positiveDrivers.length
      ? "Review before promoting. Do not change backend scoring from this single trend."
      : positiveDrivers.length >= 3
        ? "Keep this calibration and inspect similar trends for repeatability."
        : "Watch one more scan before making this a stronger preset rule.";

  return {
    rawScore: trend.trendScore,
    adjustedScore,
    delta,
    sourceContribution,
    freshnessContribution,
    lifecycleContribution,
    qualityGateContribution,
    creatorOpportunityContribution,
    sourceDiversityContribution,
    researchSignalContribution,
    researchOnlyPenalty,
    weakEvidencePenalty,
    noiseRiskPenalty,
    mainstreamSaturationPenalty,
    hiddenGemBoost,
    explanation: sentenceList([...positiveDrivers, ...negativePressure]),
    movementExplanation,
    recommendedCalibrationAction,
    positiveDrivers,
    negativePressure,
  };
}
