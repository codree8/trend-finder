import { reasonLabel } from "@/lib/scoring/suppression-reasons";
import {
  visibilityDecisionLabel,
  visibilityStatusLabel,
} from "@/lib/scoring/visibility-labels";
import type {
  DashboardTrend,
  TrendVisibility,
  TrendVisibilityDecision,
  TrendVisibilityReasonCode,
  TrendVisibilityStatus,
  TrendVisibilitySummary,
} from "@/lib/trends/types";

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pushUnique<T>(target: T[], value: T) {
  if (!target.includes(value)) target.push(value);
}

function hasUsableEvidence(trend: DashboardTrend) {
  return (
    trend.sourceCount > 0 &&
    trend.mentionCount > 0 &&
    trend.topSignals.length > 0
  );
}

function isStaleOrDormant(trend: DashboardTrend) {
  return (
    trend.lifecycle.status === "Stale" ||
    trend.lifecycle.status === "Dormant" ||
    trend.signalAging.status === "stale"
  );
}

function hasEarlyHiddenGemException(trend: DashboardTrend) {
  return (
    trend.trendScore >= 30 &&
    trend.trendScore <= 52 &&
    trend.hiddenGemScore >= 65 &&
    trend.topicQuality.score >= 42 &&
    trend.topicQuality.noiseRisk !== "high" &&
    trend.sourceCount >= 1 &&
    trend.mentionCount >= 1 &&
    trend.saturation <= 72 &&
    !isStaleOrDormant(trend) &&
    trend.actionConsistency.status !== "blocked"
  );
}

function computeVisibilityScore(trend: DashboardTrend) {
  const researchLift =
    trend.researchSignal.confidenceImpact === "boost"
      ? Math.min(8, trend.researchSignal.score * 0.08)
      : trend.researchSignal.confidenceImpact === "caution"
        ? -Math.min(10, trend.researchSignal.researchOnlyPenalty * 0.35)
        : Math.min(3, trend.researchSignal.score * 0.03);
  const consistencyPenalty =
    trend.actionConsistency.status === "blocked"
      ? 16
      : trend.actionConsistency.status === "review"
        ? 6
        : 0;
  const validationPenalty =
    trend.trendValidation.decision === "ignore"
      ? 18
      : trend.trendValidation.decision === "avoid"
        ? 12
        : trend.trendValidation.decision === "research"
          ? 4
          : 0;
  const noisePenalty =
    trend.topicQuality.noiseRisk === "high"
      ? 22
      : trend.topicQuality.noiseRisk === "medium"
        ? 7
        : 0;
  const gatePenalty =
    trend.topicQuality.gateStatus === "suppress"
      ? 18
      : trend.topicQuality.gateStatus === "watch"
        ? 6
        : 0;
  const stalePenalty = isStaleOrDormant(trend)
    ? 20
    : trend.signalAging.status === "cooling"
      ? 8
      : 0;
  const saturationPenalty =
    trend.saturation >= 86 && trend.hiddenGemScore < 70
      ? 14
      : trend.saturation >= 76 && trend.hiddenGemScore < 65
        ? 7
        : 0;
  const weakEvidencePenalty =
    trend.sourceCount <= 0 || trend.mentionCount <= 0
      ? 28
      : trend.sourceCount === 1 && trend.mentionCount <= 1
        ? 10
        : trend.sourceCount === 1
          ? 5
          : 0;

  return clampScore(
    trend.trendScore * 0.26 +
      trend.hiddenGemScore * 0.14 +
      trend.contentScore * 0.08 +
      trend.topicQuality.score * 0.18 +
      trend.sourceQuality.crossSourceConfirmationScore * 0.12 +
      trend.sourceQuality.sourceTrustScore * 0.08 +
      trend.signalAging.overallFreshnessScore * 0.08 +
      trend.trendValidation.validationScore * 0.12 +
      researchLift -
      consistencyPenalty -
      validationPenalty -
      noisePenalty -
      gatePenalty -
      stalePenalty -
      saturationPenalty -
      weakEvidencePenalty,
  );
}

function collectReasonCodes(
  trend: DashboardTrend,
  visibilityScore: number,
  hiddenGemException: boolean,
) {
  const reasons: TrendVisibilityReasonCode[] = [];

  if (!hasUsableEvidence(trend)) pushUnique(reasons, "no_usable_evidence");
  if (trend.topicQuality.gateStatus === "suppress") {
    pushUnique(reasons, "quality_gate_suppressed");
  }
  if (trend.topicQuality.noiseRisk === "high")
    pushUnique(reasons, "high_noise_risk");
  if (trend.topicQuality.score < 35) pushUnique(reasons, "weak_topic_quality");
  if (trend.sourceCount <= 1 && trend.mentionCount <= 1) {
    pushUnique(reasons, "weak_source_coverage");
  }
  if (
    trend.topicQuality.isGenericTopic ||
    trend.topicQuality.topicClarity === "vague"
  ) {
    pushUnique(reasons, "generic_or_vague_topic");
  }
  if (isStaleOrDormant(trend)) pushUnique(reasons, "stale_or_dormant");
  if (trend.saturation >= 86 && trend.hiddenGemScore < 70) {
    pushUnique(reasons, "too_saturated");
  }
  if (trend.actionConsistency.status === "blocked") {
    pushUnique(reasons, "evidence_action_blocked");
  }
  if (trend.trendValidation.decision === "ignore") {
    pushUnique(reasons, "validation_ignored");
  }
  if (visibilityScore < 35) pushUnique(reasons, "low_composite_score");
  if (trend.researchSignal.evidenceLevel === "research_only") {
    pushUnique(reasons, "research_only_signal");
  }
  if (hiddenGemException) pushUnique(reasons, "early_hidden_gem_exception");

  return reasons;
}

function statusFromScore(args: {
  trend: DashboardTrend;
  visibilityScore: number;
  hiddenGemException: boolean;
  reasons: TrendVisibilityReasonCode[];
}): TrendVisibilityStatus {
  const { trend, visibilityScore, hiddenGemException, reasons } = args;

  if (reasons.includes("no_usable_evidence")) return "rejected";

  const hardRejected =
    (trend.trendScore < 20 &&
      trend.hiddenGemScore < 60 &&
      trend.contentScore < 45) ||
    (trend.topicQuality.score < 20 && !hiddenGemException) ||
    (reasons.includes("validation_ignored") &&
      reasons.includes("stale_or_dormant"));

  if (hardRejected) return "rejected";

  if (hiddenGemException) return "research_only";

  const shouldSuppress =
    reasons.includes("quality_gate_suppressed") ||
    reasons.includes("high_noise_risk") ||
    reasons.includes("evidence_action_blocked") ||
    (reasons.includes("stale_or_dormant") && visibilityScore < 50) ||
    (reasons.includes("too_saturated") && visibilityScore < 58) ||
    visibilityScore < 35;

  if (shouldSuppress) return "suppressed";

  if (
    visibilityScore < 50 ||
    trend.trendValidation.decision === "research" ||
    trend.researchSignal.evidenceLevel === "research_only" ||
    trend.researchSignal.evidenceLevel === "overweighted"
  ) {
    return "research_only";
  }

  if (visibilityScore < 65) return "watch";
  if (visibilityScore < 80) return "strong";
  return "priority";
}

function decisionForStatus(
  status: TrendVisibilityStatus,
): TrendVisibilityDecision {
  if (status === "priority" || status === "strong") return "act";
  if (status === "watch") return "watch";
  if (status === "research_only") return "research";
  return "hide";
}

function recommendedAction(
  status: TrendVisibilityStatus,
  trend: DashboardTrend,
) {
  if (status === "priority") {
    return "Use it as a priority trend after checking the evidence drawer.";
  }
  if (status === "strong") {
    return "Act on this if the angle matches your current product, creator or research goal.";
  }
  if (status === "watch") {
    return "Save it or monitor the next scan before turning it into an action.";
  }
  if (status === "research_only") {
    return trend.hiddenGemScore >= 65
      ? "Treat it as early but promising; validate before positioning it as adoption proof."
      : "Use it for research only until stronger source confirmation appears.";
  }
  if (status === "suppressed") {
    return "Hide it from the product radar for now; revisit only if future scans improve the evidence.";
  }
  return "Reject it from the product radar unless a future scan brings usable evidence.";
}

export function buildTrendVisibility(trend: DashboardTrend): TrendVisibility {
  const visibilityScore = computeVisibilityScore(trend);
  const hiddenGemException = hasEarlyHiddenGemException(trend);
  const reasonCodes = collectReasonCodes(
    trend,
    visibilityScore,
    hiddenGemException,
  );
  const status = statusFromScore({
    trend,
    visibilityScore,
    hiddenGemException,
    reasons: reasonCodes,
  });
  const decision = decisionForStatus(status);
  const isProductVisible =
    status === "priority" ||
    status === "strong" ||
    status === "watch" ||
    status === "research_only";

  const positiveReason: TrendVisibilityReasonCode =
    status === "priority"
      ? "priority_signal"
      : status === "strong"
        ? "strong_composite_signal"
        : status === "watch"
          ? "watchable_signal"
          : status === "research_only"
            ? hiddenGemException
              ? "early_hidden_gem_exception"
              : "research_only_signal"
            : "low_composite_score";

  if (isProductVisible) pushUnique(reasonCodes, positiveReason);

  const reasons = reasonCodes.map(reasonLabel);
  const primaryReason = reasons[0] ?? reasonLabel(positiveReason);
  const warnings = reasons.filter((reason) =>
    [
      reasonLabel("quality_gate_suppressed"),
      reasonLabel("high_noise_risk"),
      reasonLabel("weak_source_coverage"),
      reasonLabel("stale_or_dormant"),
      reasonLabel("evidence_action_blocked"),
      reasonLabel("too_saturated"),
      reasonLabel("low_composite_score"),
    ].includes(reason),
  );

  return {
    status,
    statusLabel: visibilityStatusLabel(status),
    decision,
    decisionLabel: visibilityDecisionLabel(decision),
    visibilityScore,
    isProductVisible,
    isSuppressed: status === "suppressed" || status === "rejected",
    hiddenGemException,
    primaryReason,
    reasons,
    reasonCodes,
    warnings: warnings.slice(0, 5),
    recommendedAction: recommendedAction(status, trend),
  };
}

export function isProductVisibleTrend(trend: DashboardTrend) {
  return trend.visibility.isProductVisible;
}

export function buildTrendVisibilitySummary(
  trends: DashboardTrend[],
): TrendVisibilitySummary {
  const byStatus = trends.reduce<Record<TrendVisibilityStatus, number>>(
    (acc, trend) => {
      acc[trend.visibility.status] += 1;
      return acc;
    },
    {
      priority: 0,
      strong: 0,
      watch: 0,
      research_only: 0,
      suppressed: 0,
      rejected: 0,
    },
  );
  const reasonCounts = new Map<string, number>();

  for (const trend of trends) {
    if (!trend.visibility.isSuppressed) continue;
    for (const reason of trend.visibility.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  const topSuppressionReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
    .slice(0, 8);
  const productVisible =
    byStatus.priority +
    byStatus.strong +
    byStatus.watch +
    byStatus.research_only;
  const hiddenFromProduct = byStatus.suppressed + byStatus.rejected;

  return {
    totalEvaluated: trends.length,
    productVisible,
    hiddenFromProduct,
    byStatus,
    suppressed: byStatus.suppressed,
    rejected: byStatus.rejected,
    researchOnly: byStatus.research_only,
    topSuppressionReasons,
  };
}
