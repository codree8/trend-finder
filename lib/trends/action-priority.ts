import type {
  DashboardTrend,
  SavedTrendWithCurrent,
  TrendActionPriority,
  TrendActionRecommendation,
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
    Emerging: 90,
    Accelerating: 96,
    Peaking: 74,
    Cooling: 44,
    Stale: 22,
    Dormant: 14,
  };

  return scores[status] ?? 50;
}

function evidenceFit(trend: DashboardTrend) {
  const sourceScore = Math.min(100, trend.sourceCount * 28);
  const mentionScore = Math.min(100, trend.mentionCount * 9);
  const engagementScore = Math.min(100, Math.round(trend.totalEngagement / 10));

  return clampScore(
    sourceScore * 0.44 + mentionScore * 0.36 + engagementScore * 0.2,
  );
}

function watchlistFit(status: WatchlistStatus | null) {
  if (!status) return 50;

  const scores: Record<WatchlistStatus, number> = {
    rising: 94,
    stable: 62,
    cooling: 36,
    attention: 30,
    stale: 14,
  };

  return scores[status];
}

function isLifecycleClosed(status: TrendLifecycleStatus) {
  return status === "Cooling" || status === "Stale" || status === "Dormant";
}

function hasFreshEnoughSignal(trend: DashboardTrend) {
  const age = trend.lifecycle.latestSignalAgeHours;
  return age === null || age <= 72;
}

function buildRawActionScore(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
) {
  const watchStatus = watchlistItem?.delta.watchStatus ?? null;
  const rawScore =
    trend.trendScore * 0.28 +
    trend.creatorOpportunity.score * 0.26 +
    trend.topicQuality.score * 0.22 +
    lifecycleFit(trend.lifecycle.status) * 0.12 +
    evidenceFit(trend) * 0.07 +
    watchlistFit(watchStatus) * 0.05;

  let penalty = 0;

  if (trend.topicQuality.gateStatus === "suppress") penalty += 36;
  if (trend.topicQuality.gateStatus === "watch") penalty += 8;
  if (trend.topicQuality.noiseRisk === "high") penalty += 26;
  if (trend.topicQuality.noiseRisk === "medium") penalty += 7;
  if (trend.topicQuality.topicClarity === "vague") penalty += 13;
  if (!trend.topicQuality.isActionableTrend) penalty += 14;
  if (trend.creatorOpportunity.contentRisk === "high") penalty += 10;
  if (trend.creatorOpportunity.contentRisk === "medium") penalty += 4;
  if (trend.saturation >= 82) penalty += 13;
  else if (trend.saturation >= 70) penalty += 6;
  if (isLifecycleClosed(trend.lifecycle.status)) penalty += 18;
  if (trend.lifecycle.latestSignalAgeHours !== null) {
    if (trend.lifecycle.latestSignalAgeHours >= 168) penalty += 18;
    else if (trend.lifecycle.latestSignalAgeHours >= 72) penalty += 8;
  }
  if (watchlistItem?.delta.watchStatus === "attention") penalty += 12;
  if (watchlistItem?.delta.watchStatus === "stale") penalty += 18;

  return clampScore(rawScore - penalty);
}

function buildPriority(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
  actionScore: number,
): TrendActionPriority {
  const quality = trend.topicQuality;
  const watchStatus = watchlistItem?.delta.watchStatus ?? null;

  if (
    quality.gateStatus === "suppress" ||
    trend.lifecycle.status === "Stale" ||
    trend.lifecycle.status === "Dormant" ||
    (quality.noiseRisk === "high" && actionScore < 62) ||
    actionScore < 38
  ) {
    return "ignore";
  }

  if (
    quality.gateStatus === "watch" ||
    quality.topicClarity !== "clear" ||
    !quality.isActionableTrend ||
    trend.creatorOpportunity.contentRisk === "high" ||
    watchStatus === "attention" ||
    (trend.sourceCount < 2 && actionScore < 76)
  ) {
    return "review";
  }

  if (
    actionScore >= 76 &&
    quality.gateStatus === "pass" &&
    quality.noiseRisk !== "high" &&
    trend.creatorOpportunity.level === "High" &&
    trend.creatorOpportunity.recommendedTiming === "Act now" &&
    !isLifecycleClosed(trend.lifecycle.status) &&
    hasFreshEnoughSignal(trend)
  ) {
    return "act_now";
  }

  if (actionScore >= 48) return "monitor";

  return "ignore";
}

function buildUrgency(
  priority: TrendActionPriority,
  actionScore: number,
  watchlistItem: SavedTrendWithCurrent | null,
): TrendActionUrgencyLevel {
  if (
    priority === "act_now" &&
    (actionScore >= 82 || watchlistItem?.delta.watchStatus === "rising")
  ) {
    return "high";
  }

  if (
    priority === "review" &&
    watchlistItem?.delta.watchStatus === "attention"
  ) {
    return "high";
  }

  if (priority === "ignore") return "low";
  if (actionScore >= 64) return "medium";

  return "low";
}

function nextStep(priority: TrendActionPriority, trend: DashboardTrend) {
  if (priority === "act_now") {
    return `Open intelligence and turn the “${trend.creatorOpportunity.bestAngle}” angle into a timely ${trend.creatorOpportunity.recommendedFormat.toLowerCase()}.`;
  }

  if (priority === "monitor") {
    return "Keep this on the radar and wait for stronger cross-source confirmation or a sharper creator gap.";
  }

  if (priority === "review") {
    return "Open intelligence first; inspect quality warnings and evidence before using this as a content or product signal.";
  }

  return "Do not prioritize this now; only revisit it if a future scan brings fresh evidence or quality improvement.";
}

function summaryForPriority(
  priority: TrendActionPriority,
  trend: DashboardTrend,
  actionScore: number,
) {
  if (priority === "act_now") {
    return `${trend.topic} is actionable now: strong creator opportunity, acceptable quality and a live lifecycle window.`;
  }

  if (priority === "monitor") {
    return `${trend.topic} has signal, but the priority score ${actionScore}/100 says it needs more confirmation before action.`;
  }

  if (priority === "review") {
    return `${trend.topic} may be useful, but quality or clarity pressure needs review before it becomes a recommendation.`;
  }

  return `${trend.topic} should not take attention right now because the current signal is weak, stale or too noisy.`;
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function buildReasons(
  trend: DashboardTrend,
  watchlistItem: SavedTrendWithCurrent | null,
) {
  const reasons: string[] = [];

  if (trend.trendScore >= 78) {
    reasons.push(`Trend strength is ${trend.trendScore}/100.`);
  }
  if (trend.creatorOpportunity.score >= 76) {
    reasons.push(
      `Creator opportunity is ${trend.creatorOpportunity.score}/100 with ${trend.creatorOpportunity.recommendedTiming.toLowerCase()} timing.`,
    );
  }
  if (trend.topicQuality.gateStatus === "pass") {
    reasons.push(`Quality gate passes at ${trend.topicQuality.score}/100.`);
  }
  if (
    trend.lifecycle.status === "Emerging" ||
    trend.lifecycle.status === "Accelerating"
  ) {
    reasons.push(
      `Lifecycle is ${trend.lifecycle.status}, so the timing window is still usable.`,
    );
  }
  if (trend.sourceCount >= 2) {
    reasons.push(`${trend.sourceCount} sources confirm the topic.`);
  }
  if (trend.hiddenGemScore >= 72 && trend.saturation <= 58) {
    reasons.push(
      `Hidden-gem profile is strong with ${trend.hiddenGemScore}/100 gem score and ${trend.saturation}/100 saturation.`,
    );
  }
  if (watchlistItem?.delta.watchStatus === "rising") {
    reasons.push(`Watchlist delta is rising: ${watchlistItem.delta.summary}`);
  }
  if (watchlistItem && watchlistItem.delta.newSignalsCount > 0) {
    reasons.push(
      `${watchlistItem.delta.newSignalsCount} new evidence item${watchlistItem.delta.newSignalsCount === 1 ? "" : "s"} since save.`,
    );
  }

  return reasons.slice(0, 7);
}

function buildWarnings(
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
  if (trend.saturation >= 70) {
    pushUnique(warnings, `Saturation is already ${trend.saturation}/100.`);
  }
  if (isLifecycleClosed(trend.lifecycle.status)) {
    pushUnique(warnings, `Lifecycle is ${trend.lifecycle.status}.`);
  }
  if (
    trend.lifecycle.latestSignalAgeHours !== null &&
    trend.lifecycle.latestSignalAgeHours >= 72
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

  return warnings.slice(0, 7);
}

export function buildTrendActionRecommendation({
  trend,
  watchlistItem = null,
}: {
  trend: DashboardTrend;
  watchlistItem?: SavedTrendWithCurrent | null;
}): TrendActionRecommendation {
  const actionScore = buildRawActionScore(trend, watchlistItem);
  const actionPriority = buildPriority(trend, watchlistItem, actionScore);
  const urgencyLevel = buildUrgency(actionPriority, actionScore, watchlistItem);

  return {
    actionPriority,
    actionPriorityLabel: priorityLabels[actionPriority],
    actionScore,
    urgencyLevel,
    summary: summaryForPriority(actionPriority, trend, actionScore),
    recommendedNextStep: nextStep(actionPriority, trend),
    reasons: buildReasons(trend, watchlistItem),
    warnings: buildWarnings(trend, watchlistItem),
  };
}
