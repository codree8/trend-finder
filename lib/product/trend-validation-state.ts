import type {
  DashboardTrend,
  TrendValidationDecision,
  TrendValidationState,
  TrendValidationStatus,
} from "@/lib/trends/types";

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pushUnique(target: string[], value: string) {
  if (value && !target.includes(value)) target.push(value);
}

function statusLabel(status: TrendValidationStatus) {
  const labels: Record<TrendValidationStatus, string> = {
    validated: "Validated",
    emerging: "Emerging",
    watchlist_candidate: "Watchlist candidate",
    needs_confirmation: "Needs confirmation",
    cooling_down: "Cooling down",
    likely_noise: "Likely noise",
    too_stale: "Too stale",
    too_saturated: "Too saturated",
    research_only: "Research-only",
  };

  return labels[status];
}

function decisionLabel(decision: TrendValidationDecision) {
  const labels: Record<TrendValidationDecision, string> = {
    act: "Act",
    watch: "Watch",
    research: "Research",
    avoid: "Avoid",
    ignore: "Ignore for now",
  };

  return labels[decision];
}

function confidenceLabel(score: number): TrendValidationState["confidence"] {
  if (score >= 78) return "high";
  if (score >= 56) return "medium";
  return "low";
}

export function buildTrendValidationState(trend: DashboardTrend): TrendValidationState {
  const positiveSignals: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const qaFlags: string[] = [];

  if (trend.sourceQuality.crossSourceConfirmationScore >= 68) {
    pushUnique(positiveSignals, "Cross-source confirmation is healthy.");
  }
  if (trend.topicQuality.gateStatus === "pass" && trend.topicQuality.noiseRisk === "low") {
    pushUnique(positiveSignals, "Quality gate is clean.");
  }
  if (trend.signalAging.status === "fresh" || trend.signalAging.status === "active") {
    pushUnique(positiveSignals, trend.signalAging.summary);
  }
  if (trend.researchSignal.evidenceLevel === "research_backed") {
    pushUnique(positiveSignals, "Research evidence is backed by non-research sources.");
  }
  if (trend.hiddenGemScore >= 72 && trend.saturation <= 62) {
    pushUnique(positiveSignals, "Hidden-gem profile has room before saturation.");
  }

  if (trend.topicQuality.gateStatus === "suppress") {
    pushUnique(blockers, "Quality gate suppresses this topic.");
    pushUnique(qaFlags, "quality_suppressed");
  }
  if (trend.topicQuality.noiseRisk === "high") {
    pushUnique(blockers, "Noise risk is high.");
    pushUnique(qaFlags, "high_noise");
  }
  if (trend.signalAging.status === "stale") {
    pushUnique(blockers, "Evidence is stale for the current window.");
    pushUnique(qaFlags, "stale_evidence");
  }
  if (trend.signalAging.status === "cooling") {
    pushUnique(warnings, "Signals are cooling; avoid aggressive action language.");
    pushUnique(qaFlags, "cooling_signal");
  }
  if (trend.signalAging.status === "resurfacing") {
    pushUnique(warnings, "Resurfacing signal needs another source before promotion.");
    pushUnique(qaFlags, "resurfacing_requires_confirmation");
  }
  if (trend.sourceQuality.singleSourceRisk !== "low") {
    pushUnique(warnings, "Source confirmation is thin.");
    pushUnique(qaFlags, "single_source_pressure");
  }
  if (trend.researchSignal.evidenceLevel === "research_only") {
    pushUnique(warnings, "Research-only evidence is useful for exploration, not adoption proof.");
    pushUnique(qaFlags, "research_only");
  }
  if (trend.researchSignal.evidenceLevel === "overweighted") {
    pushUnique(warnings, "Research source is overrepresented.");
    pushUnique(qaFlags, "research_overweighted");
  }
  if (trend.saturation >= 86) {
    pushUnique(blockers, "Saturation is too high for a clean early-opportunity call.");
    pushUnique(qaFlags, "too_saturated");
  } else if (trend.saturation >= 72) {
    pushUnique(warnings, "Saturation is rising; angle must be specific.");
    pushUnique(qaFlags, "saturation_pressure");
  }
  if (trend.mentionCount <= 1) {
    pushUnique(warnings, "Mention count is thin.");
    pushUnique(qaFlags, "thin_mentions");
  }

  const validationScore = clampScore(
    trend.trendScore * 0.18 +
      trend.topicQuality.score * 0.22 +
      trend.sourceQuality.crossSourceConfirmationScore * 0.18 +
      trend.signalAging.overallFreshnessScore * 0.2 +
      trend.creatorOpportunity.score * 0.1 +
      trend.sourceQuality.sourceTrustScore * 0.08 +
      (trend.researchSignal.confidenceImpact === "boost" ? 6 : 0) -
      trend.signalAging.decayPenalty * 0.38 -
      (trend.researchSignal.confidenceImpact === "caution" ? 8 : 0) -
      (trend.topicQuality.noiseRisk === "high" ? 16 : trend.topicQuality.noiseRisk === "medium" ? 6 : 0),
  );

  let status: TrendValidationStatus;
  let decision: TrendValidationDecision;

  if (trend.topicQuality.noiseRisk === "high" || trend.topicQuality.gateStatus === "suppress") {
    status = "likely_noise";
    decision = validationScore >= 58 ? "avoid" : "ignore";
  } else if (trend.signalAging.status === "stale") {
    status = "too_stale";
    decision = "ignore";
  } else if (trend.saturation >= 86 && trend.hiddenGemScore < 70) {
    status = "too_saturated";
    decision = "avoid";
  } else if (trend.researchSignal.evidenceLevel === "research_only" || trend.researchSignal.evidenceLevel === "overweighted") {
    status = "research_only";
    decision = "research";
  } else if (trend.signalAging.status === "cooling") {
    status = "cooling_down";
    decision = validationScore >= 60 ? "watch" : "avoid";
  } else if (validationScore >= 78 && blockers.length === 0 && warnings.length <= 2) {
    status = "validated";
    decision = "act";
  } else if (validationScore >= 66) {
    status = "emerging";
    decision = "watch";
  } else if (trend.hiddenGemScore >= 68 || trend.creatorOpportunity.score >= 70) {
    status = "watchlist_candidate";
    decision = "watch";
  } else {
    status = "needs_confirmation";
    decision = "watch";
  }

  const primaryReason = blockers[0] ?? positiveSignals[0] ?? warnings[0] ?? "No decisive validation driver yet.";
  const summary =
    decision === "act"
      ? `${trend.topic} is validated enough for action: evidence is fresh, quality is clean and confirmation is broad enough.`
      : decision === "research"
        ? `${trend.topic} is useful for research, but it should not be framed as market validation yet.`
        : decision === "watch"
          ? `${trend.topic} belongs on the radar, but it still needs stronger or fresher confirmation before action.`
          : decision === "avoid"
            ? `${trend.topic} has enough risk that it should stay out of today's priority list.`
            : `${trend.topic} should be ignored for now until fresh evidence appears.`;
  const recommendedAction =
    decision === "act"
      ? "Use it as a focused content or product-research move today."
      : decision === "research"
        ? "Use it for research memo validation and wait for builder/community confirmation."
        : decision === "watch"
          ? "Save or monitor it and inspect the next scan for stronger confirmation."
          : decision === "avoid"
            ? "Avoid promoting it today; the risk is higher than the signal."
            : "Ignore for now unless a future scan brings fresh evidence.";

  return {
    status,
    statusLabel: statusLabel(status),
    decision,
    decisionLabel: decisionLabel(decision),
    validationScore,
    confidence: confidenceLabel(validationScore - blockers.length * 8),
    summary,
    primaryReason,
    recommendedAction,
    positiveSignals: positiveSignals.slice(0, 6),
    blockers: blockers.slice(0, 6),
    warnings: warnings.slice(0, 6),
    qaFlags: qaFlags.slice(0, 8),
  };
}
