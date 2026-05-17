import type {
  DashboardTrend,
  SavedTrendWithCurrent,
  TrendActionCalibration,
  TrendActionConfidence,
  TrendActionPriority,
  TrendActionRecommendation,
  TrendActionScoreBand,
  TrendActionUrgencyLevel,
  TrendLifecycleStatus,
  WatchlistStatus,
} from "@/lib/trends/types";

const priorityLabels: Record<TrendActionPriority, string> = {
  act_now: "Act now",
  monitor: "Monitor",
  review: "Review",
  ignore: "Ignore",
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function lifecycleFit(status: TrendLifecycleStatus) {
  const scores: Record<TrendLifecycleStatus, number> = {
    Emerging: 92,
    Accelerating: 98,
    Peaking: 66,
    Cooling: 38,
    Stale: 18,
    Dormant: 10,
  };

  return scores[status] ?? 50;
}

function evidenceFit(trend: DashboardTrend) {
  const sourceScore = Math.min(100, trend.sourceCount * 30);
  const mentionScore = Math.min(100, trend.mentionCount * 8);
  const engagementScore = Math.min(100, Math.round(trend.totalEngagement / 12));

  return clampScore(
    sourceScore * 0.48 + mentionScore * 0.34 + engagementScore * 0.18,
  );
}

function watchlistFit(status: WatchlistStatus | null) {
  if (!status) return 50;

  const scores: Record<WatchlistStatus, number> = {
    rising: 94,
    stable: 60,
    cooling: 32,
    attention: 22,
    stale: 10,
  };

  return scores[status];
}

function isLifecycleClosed(status: TrendLifecycleStatus) {
  return status === "Cooling" || status === "Stale" || status === "Dormant";
}

function isLifecycleActionable(status: TrendLifecycleStatus) {
  return status === "Emerging" || status === "Accelerating";
}

function hasFreshEnoughSignal(trend: DashboardTrend) {
  const age = trend.lifecycle.latestSignalAgeHours;
  return age === null || age <= 48;
}

function hasReliableEvidence(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
) {
  const watchStatus = watchlistItem?.delta.watchStatus ?? null;

  return (
    (trend.sourceCount >= 2 && trend.mentionCount >= 3) ||
    (watchStatus === "rising" && trend.sourceCount >= 2) ||
    (trend.sourceCount >= 3 && trend.mentionCount >= 2)
  );
}

function scoreBand(score: number): TrendActionScoreBand {
  if (score >= 82) return "strong";
  if (score >= 66) return "qualified";
  if (score >= 48) return "borderline";
  return "weak";
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function buildRawActionScore(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
) {
  const watchStatus = watchlistItem?.delta.watchStatus ?? null;
  const rawScore =
    trend.trendScore * 0.24 +
    trend.creatorOpportunity.score * 0.24 +
    trend.topicQuality.score * 0.28 +
    lifecycleFit(trend.lifecycle.status) * 0.12 +
    evidenceFit(trend) * 0.08 +
    watchlistFit(watchStatus) * 0.04 +
    (trend.researchSignal.confidenceImpact === "boost"
      ? Math.min(6, trend.researchSignal.score * 0.05)
      : 0);

  let penalty = 0;

  if (trend.topicQuality.gateStatus === "suppress") penalty += 42;
  if (trend.topicQuality.gateStatus === "watch") penalty += 12;
  if (trend.topicQuality.noiseRisk === "high") penalty += 34;
  if (trend.topicQuality.noiseRisk === "medium") penalty += 12;
  if (trend.topicQuality.topicClarity === "vague") penalty += 18;
  if (trend.topicQuality.topicClarity === "needs_review") penalty += 7;
  if (!trend.topicQuality.isActionableTrend) penalty += 18;
  if (trend.creatorOpportunity.contentRisk === "high") penalty += 14;
  if (trend.creatorOpportunity.contentRisk === "medium") penalty += 5;
  if (trend.saturation >= 82) penalty += 18;
  else if (trend.saturation >= 72) penalty += 10;
  else if (trend.saturation >= 64) penalty += 4;
  if (isLifecycleClosed(trend.lifecycle.status)) penalty += 22;
  if (trend.lifecycle.status === "Peaking") penalty += 8;
  if (trend.lifecycle.latestSignalAgeHours !== null) {
    if (trend.lifecycle.latestSignalAgeHours >= 168) penalty += 24;
    else if (trend.lifecycle.latestSignalAgeHours >= 72) penalty += 12;
    else if (trend.lifecycle.latestSignalAgeHours >= 48) penalty += 5;
  }
  if (trend.sourceCount < 2) penalty += 10;
  if (trend.mentionCount < 2) penalty += 6;
  if (trend.researchSignal.evidenceLevel === "research_only") penalty += 14;
  if (trend.researchSignal.evidenceLevel === "overweighted") penalty += 8;
  if (watchStatus === "attention") penalty += 16;
  if (watchStatus === "cooling") penalty += 10;
  if (watchStatus === "stale") penalty += 22;

  return clampScore(rawScore - penalty);
}

function buildActNowBlockers(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
) {
  const blockers: string[] = [];
  const quality = trend.topicQuality;
  const latestAge = trend.lifecycle.latestSignalAgeHours;
  const watchStatus = watchlistItem?.delta.watchStatus ?? null;

  if (quality.gateStatus !== "pass") {
    blockers.push(`Quality gate is ${quality.gateStatus}.`);
  }
  if (quality.noiseRisk !== "low") {
    blockers.push(`Noise risk is ${quality.noiseRisk}.`);
  }
  if (quality.topicClarity !== "clear") {
    blockers.push(`Topic clarity is ${quality.topicClarity}.`);
  }
  if (!quality.isActionableTrend) {
    blockers.push("Topic is not clearly actionable yet.");
  }
  if (trend.creatorOpportunity.score < 78) {
    blockers.push(
      `Creator opportunity is ${trend.creatorOpportunity.score}/100; Act Now needs 78+.`,
    );
  }
  if (trend.creatorOpportunity.recommendedTiming !== "Act now") {
    blockers.push(
      `Creator timing is ${trend.creatorOpportunity.recommendedTiming}, not Act now.`,
    );
  }
  if (trend.creatorOpportunity.contentRisk === "high") {
    blockers.push("Creator content risk is high.");
  }
  if (trend.topicQuality.score < 72) {
    blockers.push(
      `Quality score is ${trend.topicQuality.score}/100; Act Now needs 72+.`,
    );
  }
  if (!isLifecycleActionable(trend.lifecycle.status)) {
    blockers.push(`Lifecycle is ${trend.lifecycle.status}.`);
  }
  if (latestAge !== null && latestAge > 48) {
    blockers.push(
      `Latest signal is ${Math.round(latestAge)}h old; Act Now needs freshness.`,
    );
  }
  if (trend.saturation >= 72) {
    blockers.push(
      `Saturation is ${trend.saturation}/100; window may be crowded.`,
    );
  }
  if (!hasReliableEvidence(trend, watchlistItem)) {
    blockers.push(
      "Evidence is not strong enough yet; needs cross-source confirmation or rising watchlist movement.",
    );
  }
  if (trend.researchSignal.evidenceLevel === "research_only") {
    blockers.push(
      "Research signal is isolated; needs builder, market or community confirmation before Act Now.",
    );
  }
  if (trend.researchSignal.evidenceLevel === "overweighted") {
    blockers.push(
      "Research source is overrepresented; wait for external confirmation before promotion.",
    );
  }
  if (
    watchStatus === "attention" ||
    watchStatus === "cooling" ||
    watchStatus === "stale"
  ) {
    blockers.push(
      `Watchlist movement is ${watchlistItem?.delta.watchStatusLabel ?? watchStatus}.`,
    );
  }

  return blockers;
}

function buildPromotionSignals(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
) {
  const signals: string[] = [];

  if (trend.trendScore >= 78) {
    signals.push(`Trend strength is ${trend.trendScore}/100.`);
  }
  if (trend.creatorOpportunity.score >= 80) {
    signals.push(
      `Creator opportunity is ${trend.creatorOpportunity.score}/100.`,
    );
  }
  if (
    trend.topicQuality.gateStatus === "pass" &&
    trend.topicQuality.noiseRisk === "low"
  ) {
    signals.push("Quality gate passes with low noise risk.");
  }
  if (isLifecycleActionable(trend.lifecycle.status)) {
    signals.push(`Lifecycle is ${trend.lifecycle.status}.`);
  }
  if (
    trend.lifecycle.latestSignalAgeHours === null ||
    trend.lifecycle.latestSignalAgeHours <= 24
  ) {
    signals.push("Latest signal is fresh.");
  }
  if (trend.sourceCount >= 2) {
    signals.push(`${trend.sourceCount} sources confirm the topic.`);
  }
  if (trend.hiddenGemScore >= 72 && trend.saturation <= 58) {
    signals.push(
      `Hidden-gem profile is ${trend.hiddenGemScore}/100 with ${trend.saturation}/100 saturation.`,
    );
  }
  if (trend.researchSignal.evidenceLevel === "research_backed") {
    signals.push(
      `Research signal is backed by ${trend.researchSignal.nonResearchSourceCount} non-research source${trend.researchSignal.nonResearchSourceCount === 1 ? "" : "s"}.`,
    );
  }
  if (watchlistItem?.delta.watchStatus === "rising") {
    signals.push(`Watchlist delta is rising: ${watchlistItem.delta.summary}`);
  }
  if (watchlistItem && watchlistItem.delta.newSignalsCount > 0) {
    signals.push(
      `${watchlistItem.delta.newSignalsCount} new evidence item${watchlistItem.delta.newSignalsCount === 1 ? "" : "s"} since save.`,
    );
  }

  return signals.slice(0, 8);
}

function buildDemotionSignals(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
) {
  const warnings: string[] = [];

  if (trend.topicQuality.gateStatus !== "pass") {
    pushUnique(warnings, `Quality gate is ${trend.topicQuality.gateStatus}.`);
  }
  if (trend.topicQuality.noiseRisk !== "low") {
    pushUnique(warnings, `Noise risk is ${trend.topicQuality.noiseRisk}.`);
  }
  if (trend.topicQuality.topicClarity !== "clear") {
    pushUnique(
      warnings,
      `Topic clarity is ${trend.topicQuality.topicClarity}.`,
    );
  }
  if (!trend.topicQuality.isActionableTrend) {
    pushUnique(warnings, "Topic is not clearly actionable yet.");
  }
  if (trend.creatorOpportunity.contentRisk !== "low") {
    pushUnique(
      warnings,
      `Creator content risk is ${trend.creatorOpportunity.contentRisk}.`,
    );
  }
  if (trend.saturation >= 64) {
    pushUnique(warnings, `Saturation is ${trend.saturation}/100.`);
  }
  if (trend.sourceCount < 2) {
    pushUnique(warnings, "Only one source is confirming the topic.");
  }
  if (trend.researchSignal.confidenceImpact === "caution") {
    pushUnique(warnings, trend.researchSignal.caveat);
  }
  if (
    isLifecycleClosed(trend.lifecycle.status) ||
    trend.lifecycle.status === "Peaking"
  ) {
    pushUnique(warnings, `Lifecycle is ${trend.lifecycle.status}.`);
  }
  if (
    trend.lifecycle.latestSignalAgeHours !== null &&
    trend.lifecycle.latestSignalAgeHours >= 48
  ) {
    pushUnique(
      warnings,
      `Latest signal is ${Math.round(trend.lifecycle.latestSignalAgeHours / 24)}d old.`,
    );
  }
  if (watchlistItem?.delta.watchStatus === "attention") {
    pushUnique(warnings, "Watchlist delta says this needs attention.");
  }
  if (watchlistItem?.delta.watchStatus === "cooling") {
    pushUnique(warnings, "Watchlist delta is cooling.");
  }
  if (watchlistItem?.delta.watchStatus === "stale") {
    pushUnique(warnings, "Watchlist delta is stale.");
  }
  for (const warning of trend.topicQuality.warnings.slice(0, 2)) {
    pushUnique(warnings, warning);
  }

  return warnings.slice(0, 8);
}

function buildConfidence(args: {
  actionScore: number;
  blockers: string[];
  promotionSignals: string[];
  demotionSignals: string[];
}): TrendActionConfidence {
  if (
    args.actionScore >= 78 &&
    args.blockers.length <= 1 &&
    args.promotionSignals.length >= 4 &&
    args.demotionSignals.length <= 2
  ) {
    return "high";
  }

  if (
    args.actionScore < 48 ||
    args.blockers.length >= 5 ||
    args.demotionSignals.length >= 5
  ) {
    return "low";
  }

  return "medium";
}

function buildCalibration(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
  actionScore: number,
): TrendActionCalibration {
  const actNowBlockers = buildActNowBlockers(trend, watchlistItem);
  const promotionSignals = buildPromotionSignals(trend, watchlistItem);
  const demotionSignals = buildDemotionSignals(trend, watchlistItem);
  const band = scoreBand(actionScore);
  const decisionConfidence = buildConfidence({
    actionScore,
    blockers: actNowBlockers,
    promotionSignals,
    demotionSignals,
  });
  const tuningNotes: string[] = [];

  if (actNowBlockers.length > 0) {
    tuningNotes.push(
      "Act Now is blocked until the listed evidence/quality conditions improve.",
    );
  }
  if (band === "borderline") {
    tuningNotes.push(
      "Score is borderline; keep this below action level unless watchlist movement improves.",
    );
  }
  if (trend.sourceCount < 2) {
    tuningNotes.push(
      "Single-source topics are deliberately held back to avoid false positives.",
    );
  }
  if (trend.researchSignal.confidenceImpact === "caution") {
    tuningNotes.push(
      "Research-only or overrepresented research signals are held below Act Now until another source class confirms them.",
    );
  }
  if (trend.lifecycle.status === "Peaking") {
    tuningNotes.push(
      "Peaking topics are capped below Act Now unless a future scan shows renewed acceleration.",
    );
  }

  return {
    scoreBand: band,
    decisionConfidence,
    isBlockedFromActNow: actNowBlockers.length > 0,
    actNowBlockers: actNowBlockers.slice(0, 7),
    promotionSignals,
    demotionSignals,
    tuningNotes: tuningNotes.slice(0, 4),
  };
}

function buildPriority(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
  actionScore: number,
  calibration: TrendActionCalibration,
): TrendActionPriority {
  const quality = trend.topicQuality;
  const watchStatus = watchlistItem?.delta.watchStatus ?? null;

  if (
    quality.gateStatus === "suppress" ||
    trend.lifecycle.status === "Stale" ||
    trend.lifecycle.status === "Dormant" ||
    (quality.noiseRisk === "high" && actionScore < 70) ||
    actionScore < 38
  ) {
    return "ignore";
  }

  if (
    actionScore >= 82 &&
    calibration.actNowBlockers.length === 0 &&
    calibration.decisionConfidence !== "low"
  ) {
    return "act_now";
  }

  if (
    quality.gateStatus === "watch" ||
    quality.topicClarity !== "clear" ||
    !quality.isActionableTrend ||
    trend.creatorOpportunity.contentRisk === "high" ||
    watchStatus === "attention" ||
    (trend.sourceCount < 2 && actionScore >= 58) ||
    (actionScore >= 72 && calibration.actNowBlockers.length > 0)
  ) {
    return "review";
  }

  if (actionScore >= 48) return "monitor";

  return "ignore";
}

function buildUrgency(
  priority: TrendActionPriority,
  actionScore: number,
  watchlistItem: SavedTrendWithCurrent | null,
  calibration: TrendActionCalibration,
): TrendActionUrgencyLevel {
  if (
    priority === "act_now" &&
    (actionScore >= 86 || watchlistItem?.delta.watchStatus === "rising")
  ) {
    return "high";
  }

  if (
    priority === "review" &&
    (watchlistItem?.delta.watchStatus === "attention" ||
      calibration.actNowBlockers.length >= 4)
  ) {
    return "high";
  }

  if (priority === "ignore") return "low";
  if (actionScore >= 66) return "medium";

  return "low";
}

function nextStep(
  priority: TrendActionPriority,
  trend: DashboardTrend,
  calibration: TrendActionCalibration,
) {
  if (priority === "act_now") {
    if (trend.researchSignal.evidenceLevel === "research_backed") {
      return `Open intelligence, cite the research support, then turn the “${trend.creatorOpportunity.bestAngle}” angle into a timely ${trend.creatorOpportunity.recommendedFormat.toLowerCase()}.`;
    }

    return `Open intelligence and turn the “${trend.creatorOpportunity.bestAngle}” angle into a timely ${trend.creatorOpportunity.recommendedFormat.toLowerCase()}.`;
  }

  if (priority === "monitor") {
    return "Keep this on the radar and wait for stronger cross-source confirmation, fresher evidence or a sharper creator gap.";
  }

  if (priority === "review") {
    const blocker = calibration.actNowBlockers[0];
    return blocker
      ? `Open intelligence first; resolve the main blocker before acting: ${blocker}`
      : "Open intelligence first; inspect quality warnings and evidence before using this as a content or product signal.";
  }

  return "Do not prioritize this now; only revisit it if a future scan brings fresh evidence or quality improvement.";
}

function summaryForPriority(
  priority: TrendActionPriority,
  trend: DashboardTrend,
  actionScore: number,
  calibration: TrendActionCalibration,
) {
  if (priority === "act_now") {
    return `${trend.topic} is actionable now: strong score, clean quality, fresh timing and enough evidence.`;
  }

  if (priority === "monitor") {
    return `${trend.topic} has signal, but the calibrated priority score ${actionScore}/100 keeps it below action level.`;
  }

  if (priority === "review") {
    const blockerCount = calibration.actNowBlockers.length;
    return `${trend.topic} has potential, but ${blockerCount || "some"} quality/evidence condition${blockerCount === 1 ? "" : "s"} block a clean Act Now call.`;
  }

  return `${trend.topic} should not take attention right now because the current signal is weak, stale, noisy or too crowded.`;
}

export function buildTrendActionRecommendation({
  trend,
  watchlistItem = null,
}: {
  trend: DashboardTrend;
  watchlistItem?: SavedTrendWithCurrent | null;
}): TrendActionRecommendation {
  const actionScore = buildRawActionScore(trend, watchlistItem);
  const calibration = buildCalibration(trend, watchlistItem, actionScore);
  const actionPriority = buildPriority(
    trend,
    watchlistItem,
    actionScore,
    calibration,
  );
  const urgencyLevel = buildUrgency(
    actionPriority,
    actionScore,
    watchlistItem,
    calibration,
  );

  return {
    actionPriority,
    actionPriorityLabel: priorityLabels[actionPriority],
    actionScore,
    urgencyLevel,
    summary: summaryForPriority(
      actionPriority,
      trend,
      actionScore,
      calibration,
    ),
    recommendedNextStep: nextStep(actionPriority, trend, calibration),
    reasons: calibration.promotionSignals,
    warnings: calibration.demotionSignals,
    calibration,
  };
}
