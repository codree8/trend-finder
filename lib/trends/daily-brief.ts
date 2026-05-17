import { getActionQueue } from "@/lib/trends/action-queue";
import { tuneDailyBriefNarratives } from "@/lib/trends/daily-brief-qa";
import { buildDailyBriefReportDocument } from "@/lib/trends/daily-brief-report-document";
import {
  getDashboardTrends,
  normalizeDashboardWindow,
} from "@/lib/trends/get-dashboard-trends";
import { listSavedTrends } from "@/lib/trends/watchlist";
import type {
  ActionQueueItem,
  DailyBriefAvoidSeverity,
  DailyBriefExecutiveSummary,
  DailyBriefNarrative,
  DailyBriefPosture,
  DailyBriefRadarStats,
  DailyBriefRecommendedFocus,
  DailyBriefResponse,
  DailyBriefTopicToAvoid,
  DashboardTrend,
  DashboardWindow,
  SavedTrendWithCurrent,
  WatchlistStatus,
} from "@/lib/trends/types";

const MAX_PRIORITY_ACTIONS = 6;
const MAX_WATCHLIST_MOVEMENT = 6;
const MAX_HIDDEN_GEMS = 5;
const MAX_CREATOR_OPPORTUNITIES = 5;
const MAX_RESEARCH_SIGNALS = 5;
const MAX_TOPICS_TO_AVOID = 8;

const watchStatusRank: Record<WatchlistStatus, number> = {
  rising: 5,
  attention: 4,
  cooling: 3,
  stable: 1,
  stale: 2,
};

const avoidSeverityRank: Record<DailyBriefAvoidSeverity, number> = {
  noise: 5,
  generic: 4,
  stale: 3,
  saturated: 2,
  weak_signal: 1,
};

const confidenceBase = {
  high: 92,
  medium: 72,
  low: 50,
} as const;

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  const usable = values.filter(Number.isFinite);
  if (usable.length === 0) return 0;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatTrendList(
  trends: Array<DashboardTrend | null>,
  fallback: string,
) {
  const names = trends
    .filter((trend): trend is DashboardTrend => trend !== null)
    .map((trend) => trend.topic)
    .filter(Boolean)
    .slice(0, 3);

  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names[2]}`;
}

function uniqueByTrendKey<T>(items: T[], keyForItem: (item: T) => string) {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = normalizeKey(keyForItem(item));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

function compactUnique(items: string[], maxItems = 4) {
  return uniqueByTrendKey(
    items.filter((item) => item.trim().length > 0),
    (item) => item,
  ).slice(0, maxItems);
}

function trendIdentity(trend: DashboardTrend | null) {
  if (!trend) {
    return {
      relatedTrendSlug: null,
      relatedTrendKey: null,
    };
  }

  return {
    relatedTrendSlug: trend.slug,
    relatedTrendKey: trend.canonicalKey || trend.id || trend.slug,
  };
}

function isUsableOpportunity(trend: DashboardTrend) {
  return (
    trend.topicQuality.gateStatus !== "suppress" &&
    trend.topicQuality.noiseRisk !== "high" &&
    trend.topicQuality.isActionableTrend &&
    trend.lifecycle.status !== "Stale" &&
    trend.lifecycle.status !== "Dormant" &&
    trend.signalAging.status !== "stale" &&
    trend.trendValidation.decision !== "ignore" &&
    trend.actionConsistency.status !== "blocked"
  );
}

function buildTopPriorityActions(items: ActionQueueItem[]) {
  return items
    .filter(
      (item) =>
        item.actionPriority === "act_now" || item.actionPriority === "monitor",
    )
    .filter((item) => item.trend.topicQuality.gateStatus !== "suppress")
    .slice(0, MAX_PRIORITY_ACTIONS);
}

function watchlistMovementScore(item: SavedTrendWithCurrent) {
  const delta = item.delta;

  return (
    watchStatusRank[delta.watchStatus] * 100 +
    Math.abs(delta.scoreDelta) * 2 +
    Math.abs(delta.creatorOpportunityDelta) +
    Math.max(0, delta.newSignalsCount) * 6 +
    (delta.lifecycleChanged ? 14 : 0) +
    (item.currentTrend ? 0 : 18)
  );
}

function buildWatchlistMovement(items: SavedTrendWithCurrent[]) {
  const movingItems = items.filter((item) => {
    const delta = item.delta;

    return (
      delta.watchStatus !== "stable" ||
      delta.lifecycleChanged ||
      Math.abs(delta.scoreDelta) >= 5 ||
      Math.abs(delta.creatorOpportunityDelta) >= 8 ||
      delta.newSignalsCount > 0 ||
      delta.warnings.length > 0
    );
  });

  const pool = movingItems.length > 0 ? movingItems : items;

  return pool
    .slice()
    .sort((a, b) => watchlistMovementScore(b) - watchlistMovementScore(a))
    .slice(0, MAX_WATCHLIST_MOVEMENT);
}

function buildHiddenGems(trends: DashboardTrend[]) {
  return trends
    .filter(isUsableOpportunity)
    .filter(
      (trend) =>
        trend.status === "Hidden Gem" ||
        trend.hiddenGemScore >= 68 ||
        (trend.creatorOpportunity.score >= 72 && trend.saturation <= 62),
    )
    .sort(
      (a, b) =>
        b.hiddenGemScore * 0.42 +
        b.creatorOpportunity.score * 0.36 +
        b.lifecycle.freshnessScore * 0.08 +
        b.signalAging.overallFreshnessScore * 0.1 +
        b.trendValidation.validationScore * 0.08 +
        Math.max(0, 100 - b.saturation) * 0.06 +
        (b.researchSignal.confidenceImpact === "boost" ? 5 : 0) -
        (b.researchSignal.confidenceImpact === "caution" ? 7 : 0) -
        (a.hiddenGemScore * 0.42 +
          a.creatorOpportunity.score * 0.36 +
          a.lifecycle.freshnessScore * 0.08 +
          a.signalAging.overallFreshnessScore * 0.1 +
          a.trendValidation.validationScore * 0.08 +
          Math.max(0, 100 - a.saturation) * 0.06 +
          (a.researchSignal.confidenceImpact === "boost" ? 5 : 0) -
          (a.researchSignal.confidenceImpact === "caution" ? 7 : 0)),
    )
    .slice(0, MAX_HIDDEN_GEMS);
}

function buildCreatorOpportunities(trends: DashboardTrend[]) {
  return trends
    .filter(isUsableOpportunity)
    .filter(
      (trend) =>
        trend.creatorOpportunity.recommendedTiming === "Act now" ||
        trend.creatorOpportunity.recommendedTiming === "Watch",
    )
    .filter((trend) => trend.creatorOpportunity.contentRisk !== "high")
    .sort(
      (a, b) =>
        b.creatorOpportunity.score * 0.72 +
        b.contentScore * 0.18 +
        b.topicQuality.score * 0.08 +
        b.signalAging.overallFreshnessScore * 0.08 +
        b.actionConsistency.score * 0.04 -
        (a.creatorOpportunity.score * 0.72 +
          a.contentScore * 0.18 +
          a.topicQuality.score * 0.08 +
          a.signalAging.overallFreshnessScore * 0.08 +
          a.actionConsistency.score * 0.04),
    )
    .slice(0, MAX_CREATOR_OPPORTUNITIES);
}

function researchCandidateScore(trend: DashboardTrend) {
  const boost = trend.researchSignal.confidenceImpact === "boost" ? 18 : 0;
  const cautionPenalty =
    trend.researchSignal.confidenceImpact === "caution"
      ? Math.max(10, trend.researchSignal.researchOnlyPenalty)
      : 0;

  return (
    trend.researchSignal.score * 0.42 +
    trend.topicQuality.score * 0.18 +
    trend.hiddenGemScore * 0.14 +
    trend.lifecycle.freshnessScore * 0.08 +
    trend.signalAging.overallFreshnessScore * 0.08 +
    trend.sourceQuality.crossSourceConfirmationScore * 0.14 +
    boost -
    cautionPenalty
  );
}

function buildResearchSignals(trends: DashboardTrend[]) {
  return trends
    .filter((trend) => trend.researchSignal.researchSignalCount > 0)
    .filter((trend) => trend.topicQuality.gateStatus !== "suppress")
    .sort((a, b) => researchCandidateScore(b) - researchCandidateScore(a))
    .slice(0, MAX_RESEARCH_SIGNALS);
}

function avoidSeverityForTrend(trend: DashboardTrend): DailyBriefAvoidSeverity {
  if (
    trend.topicQuality.gateStatus === "suppress" ||
    trend.topicQuality.noiseRisk === "high"
  ) {
    return "noise";
  }

  if (
    trend.topicQuality.isGenericTopic ||
    trend.topicQuality.topicClarity === "vague"
  ) {
    return "generic";
  }

  if (
    trend.lifecycle.status === "Stale" ||
    trend.lifecycle.status === "Dormant" ||
    trend.signalAging.status === "stale"
  ) {
    return "stale";
  }

  if (trend.saturation >= 82) return "saturated";

  return "weak_signal";
}

function avoidReasonForTrend(
  trend: DashboardTrend,
  severity: DailyBriefAvoidSeverity,
) {
  if (severity === "noise") {
    return `Quality gate is ${trend.topicQuality.gateStatus}; noise risk is ${trend.topicQuality.noiseRisk}. Do not chase it before inspecting evidence.`;
  }

  if (severity === "generic") {
    return `The topic is not sharp enough yet: clarity is ${trend.topicQuality.topicClarity}, actionability is ${trend.topicQuality.isActionableTrend ? "present" : "weak"}.`;
  }

  if (severity === "stale") {
    return `${trend.signalAging.summary} Lifecycle is ${trend.lifecycle.status}; latest signal age is ${trend.signalAging.latestSignalAgeHours ?? trend.lifecycle.latestSignalAgeHours ?? "unknown"}h.`;
  }

  if (severity === "saturated") {
    return `Saturation is already ${trend.saturation}/100, so the opening may be crowded unless you have a very specific angle.`;
  }

  if (trend.researchSignal.confidenceImpact === "caution") {
    return `${trend.researchSignal.summary} ${trend.researchSignal.caveat}`;
  }

  return `Signal quality is too thin for today's focus: ${trend.mentionCount} mentions, ${trend.sourceCount} sources, quality ${trend.topicQuality.score}/100.`;
}

function warningsForAvoidTrend(trend: DashboardTrend) {
  return compactUnique(
    [
      ...trend.topicQuality.warnings,
      ...trend.creatorOpportunity.warnings,
      ...trend.researchSignal.warnings,
      ...trend.signalAging.warnings,
      trend.actionConsistency.status !== "clean" ? trend.actionConsistency.summary : "",
      trend.lifecycle.summary,
    ].filter(Boolean),
    3,
  );
}

function shouldAvoidTrend(trend: DashboardTrend) {
  return (
    trend.topicQuality.gateStatus === "suppress" ||
    trend.topicQuality.noiseRisk === "high" ||
    trend.topicQuality.isGenericTopic ||
    trend.topicQuality.topicClarity === "vague" ||
    trend.lifecycle.status === "Stale" ||
    trend.lifecycle.status === "Dormant" ||
    trend.signalAging.status === "stale" ||
    trend.trendValidation.decision === "ignore" ||
    trend.actionConsistency.status === "blocked" ||
    trend.saturation >= 82 ||
    (trend.researchSignal.confidenceImpact === "caution" &&
      trend.sourceQuality.confirmedSourceCount <= 1) ||
    (trend.topicQuality.score < 45 && trend.sourceCount <= 1)
  );
}

function buildTopicsToAvoid(
  trends: DashboardTrend[],
  actionItems: ActionQueueItem[],
): DailyBriefTopicToAvoid[] {
  const ignoreTrends = actionItems
    .filter((item) => item.actionPriority === "ignore")
    .map((item) => item.trend);
  const noisyTrends = trends.filter(shouldAvoidTrend);
  const candidates = uniqueByTrendKey(
    [...ignoreTrends, ...noisyTrends],
    (trend) => trend.canonicalKey || trend.id,
  );

  return candidates
    .map((trend) => {
      const severity = avoidSeverityForTrend(trend);

      return {
        trend,
        severity,
        reason: avoidReasonForTrend(trend, severity),
        warnings: warningsForAvoidTrend(trend),
      } satisfies DailyBriefTopicToAvoid;
    })
    .sort((a, b) => {
      const severityDelta =
        avoidSeverityRank[b.severity] - avoidSeverityRank[a.severity];
      if (severityDelta !== 0) return severityDelta;
      return b.trend.trendScore - a.trend.trendScore;
    })
    .slice(0, MAX_TOPICS_TO_AVOID);
}

function buildOverallWarnings(args: {
  actionQueue: Awaited<ReturnType<typeof getActionQueue>>;
  topicsToAvoid: DailyBriefTopicToAvoid[];
  watchlistMovement: SavedTrendWithCurrent[];
  latestScanWarnings: string[];
}) {
  const warnings: string[] = [];

  for (const warning of args.latestScanWarnings) warnings.push(warning);

  for (const warning of args.actionQueue.qa.warnings) {
    warnings.push(`${warning.title}: ${warning.detail}`);
  }

  if (args.actionQueue.summary.actNow === 0) {
    warnings.push(
      "No Act Now candidate passed the current priority calibration.",
    );
  }

  const attentionCount = args.watchlistMovement.filter(
    (item) => item.delta.watchStatus === "attention",
  ).length;
  if (attentionCount > 0) {
    warnings.push(
      `${attentionCount} saved trend(s) need quality inspection before action.`,
    );
  }

  if (args.topicsToAvoid.length >= 5) {
    warnings.push(
      "Noise pressure is elevated; be selective with broad AI topics today.",
    );
  }

  return compactUnique(warnings, 8);
}

function buildRadarStats(args: {
  totalTrends: number;
  actionQueue: Awaited<ReturnType<typeof getActionQueue>>;
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  researchSignals: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
  sourceCoverageLabel: string;
  latestScanAt: string | null;
}): DailyBriefRadarStats {
  return {
    totalTrends: args.totalTrends,
    actNow: args.actionQueue.summary.actNow,
    monitor: args.actionQueue.summary.monitor,
    hiddenGems: args.hiddenGems.length,
    creatorOpportunities: args.creatorOpportunities.length,
    watchlistMoving: args.watchlistMovement.length,
    watchlistNeedsAttention: args.watchlistMovement.filter(
      (item) => item.delta.watchStatus === "attention",
    ).length,
    topicsToAvoid: args.topicsToAvoid.length,
    researchSignals: args.researchSignals.length,
    sourceCoverageLabel: args.sourceCoverageLabel,
    latestScanAt: args.latestScanAt,
  };
}

function actionItemConfidence(item: ActionQueueItem | null) {
  if (!item) return 0;

  const calibration = confidenceBase[item.calibration.decisionConfidence];
  const blockerPenalty = Math.min(
    18,
    item.calibration.actNowBlockers.length * 3,
  );

  return clampScore(
    item.actionScore * 0.46 +
      item.trend.topicQuality.score * 0.18 +
      item.trend.creatorOpportunity.score * 0.14 +
      calibration * 0.22 -
      blockerPenalty,
  );
}

function trendNarrativeConfidence(trend: DashboardTrend | null) {
  if (!trend) return 0;

  const evidenceScore = Math.min(
    100,
    trend.sourceCount * 24 + trend.mentionCount * 7,
  );

  return clampScore(
    trend.trendScore * 0.24 +
      trend.topicQuality.score * 0.24 +
      trend.creatorOpportunity.score * 0.2 +
      trend.lifecycle.freshnessScore * 0.14 +
      evidenceScore * 0.14 +
      (trend.researchSignal.confidenceImpact === "boost" ? 8 : 0) -
      (trend.researchSignal.confidenceImpact === "caution" ? 8 : 0),
  );
}

function movementConfidence(item: SavedTrendWithCurrent | null) {
  if (!item) return 0;

  const statusScore: Record<WatchlistStatus, number> = {
    rising: 88,
    attention: 68,
    cooling: 58,
    stable: 45,
    stale: 36,
  };

  return clampScore(
    statusScore[item.delta.watchStatus] * 0.52 +
      Math.min(100, Math.abs(item.delta.scoreDelta) * 8) * 0.16 +
      Math.min(100, Math.abs(item.delta.creatorOpportunityDelta) * 6) * 0.12 +
      Math.min(100, item.delta.newSignalsCount * 22) * 0.12 +
      (item.delta.lifecycleChanged ? 82 : 50) * 0.08,
  );
}

function buildBriefPosture(args: {
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  researchSignals: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
  overallWarnings: string[];
}): DailyBriefPosture {
  const actNowCount = args.topPriorityActions.filter(
    (item) => item.actionPriority === "act_now",
  ).length;
  const topAction = args.topPriorityActions[0] ?? null;
  const risingSaved = args.watchlistMovement.filter(
    (item) => item.delta.watchStatus === "rising",
  ).length;
  const attentionSaved = args.watchlistMovement.filter(
    (item) => item.delta.watchStatus === "attention",
  ).length;
  const hardAvoidCount = args.topicsToAvoid.filter(
    (item) => item.severity === "noise" || item.severity === "generic",
  ).length;
  const opportunityCount =
    args.hiddenGems.length +
    args.creatorOpportunities.length +
    args.researchSignals.filter(
      (trend) => trend.researchSignal.confidenceImpact === "boost",
    ).length;
  const topConfidence = actionItemConfidence(topAction);

  const posture =
    actNowCount > 0 && topConfidence >= 74 && hardAvoidCount <= 3
      ? "offensive"
      : args.topPriorityActions.length > 0 ||
          opportunityCount > 0 ||
          risingSaved > 0
        ? "selective"
        : "defensive";

  const labels: Record<DailyBriefPosture["posture"], string> = {
    offensive: "Offensive posture",
    selective: "Selective posture",
    defensive: "Defensive posture",
  };

  const summaries: Record<DailyBriefPosture["posture"], string> = {
    offensive:
      "There is enough quality, timing and freshness to justify a focused move today.",
    selective:
      "There are usable openings, but the radar is asking for judgment rather than volume.",
    defensive:
      "The radar is thin or noisy; protect attention and wait for stronger evidence.",
  };

  const confidence = clampScore(
    average([
      topConfidence || 55,
      args.creatorOpportunities[0]
        ? trendNarrativeConfidence(args.creatorOpportunities[0])
        : 55,
      args.hiddenGems[0] ? trendNarrativeConfidence(args.hiddenGems[0]) : 55,
      args.researchSignals[0]
        ? trendNarrativeConfidence(args.researchSignals[0])
        : 55,
    ]) -
      Math.min(18, hardAvoidCount * 3) -
      Math.min(10, attentionSaved * 2) -
      Math.min(8, args.overallWarnings.length),
  );

  const reasons = compactUnique([
    actNowCount > 0
      ? `${pluralize(actNowCount, "Act Now candidate")} cleared priority tuning.`
      : "No Act Now candidate cleared the priority tuning layer.",
    opportunityCount > 0
      ? `${pluralize(opportunityCount, "quality opportunity")} remain usable after noise suppression.`
      : "No strong creator or hidden-gem opportunity is clean enough yet.",
    risingSaved > 0
      ? `${pluralize(risingSaved, "saved trend")} is rising in the watchlist.`
      : `${pluralize(args.watchlistMovement.length, "saved trend")} has movement or inspection value.`,
    args.researchSignals.length > 0
      ? `${pluralize(args.researchSignals.length, "research-backed candidate")} found by arXiv calibration.`
      : "No research-source signal is affecting the brief today.",
    hardAvoidCount > 0
      ? `${pluralize(hardAvoidCount, "hard avoid")} detected in the current radar.`
      : "No major hard-avoid cluster is dominating the brief.",
  ]);

  return {
    posture,
    label: labels[posture],
    summary: summaries[posture],
    confidence,
    reasons,
  };
}

function buildExecutiveSummary(args: {
  window: DashboardWindow;
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  researchSignals: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
  briefPosture: DailyBriefPosture;
}): DailyBriefExecutiveSummary {
  const actNow = args.topPriorityActions.filter(
    (item) => item.actionPriority === "act_now",
  );
  const topActionItem = args.topPriorityActions[0] ?? null;
  const topAction = topActionItem?.trend ?? null;
  const topGem = args.hiddenGems[0] ?? null;
  const topCreator = args.creatorOpportunities[0] ?? null;
  const topResearch = args.researchSignals[0] ?? null;
  const topAvoid = args.topicsToAvoid[0]?.trend ?? null;
  const watchlistHot = args.watchlistMovement.find(
    (item) => item.delta.watchStatus === "rising" && item.currentTrend,
  );

  const headline = topAction
    ? `${topAction.topic} leads the ${args.briefPosture.label.toLowerCase()}.`
    : topGem
      ? `${topGem.topic} is the cleanest opening, but not a full-force signal yet.`
      : `${args.briefPosture.label}: no clear Act Now winner.`;

  const strongestLane = formatTrendList(
    [topAction, topCreator, topGem, topResearch],
    "the current monitored opportunity pool",
  );
  const avoidTarget = topAvoid?.topic ?? "generic AI noise";

  const narrative =
    args.topPriorityActions.length > 0
      ? `In the ${args.window} window, the radar finds ${pluralize(actNow.length, "Act Now candidate")} and ${pluralize(args.topPriorityActions.length - actNow.length, "Monitor candidate")}. The strongest usable lane is ${strongestLane}. Keep ${avoidTarget} out of today's priority path unless evidence improves.`
      : `In the ${args.window} window, the radar is conservative. Use the brief for monitoring, watchlist inspection and noise suppression rather than aggressive publishing.`;

  const bullets = [
    `Posture: ${args.briefPosture.label} with ${args.briefPosture.confidence}/100 confidence.`,
    topActionItem
      ? `Priority: ${topActionItem.trend.topic} has action score ${topActionItem.actionScore}/100 and ${topActionItem.urgencyLevel} urgency.`
      : "Priority: no topic deserves immediate execution yet.",
    topGem
      ? `Hidden gem: ${topGem.topic} combines hidden-gem score ${topGem.hiddenGemScore}/100 with saturation ${topGem.saturation}/100.`
      : "Hidden gem: no quality-gated hidden gem stands out yet.",
    watchlistHot?.currentTrend
      ? `Watchlist: ${watchlistHot.currentTrend.topic} is rising with trend delta ${formatSigned(watchlistHot.delta.scoreDelta)}.`
      : `Watchlist: ${pluralize(args.watchlistMovement.length, "saved trend")} have movement or inspection value.`,
    topResearch
      ? `Research: ${topResearch.topic} carries ${topResearch.researchSignal.score}/100 research signal. ${topResearch.researchSignal.caveat}`
      : "Research: no arXiv-backed candidate is changing today's priority.",
    topAvoid
      ? `Avoid: ${topAvoid.topic} is flagged as ${args.topicsToAvoid[0].severity}.`
      : "Avoid: no major noise cluster is currently dominating the radar.",
  ];

  return { headline, narrative, bullets };
}

function actionEvidence(item: ActionQueueItem) {
  const trend = item.trend;

  return compactUnique([
    `Action score ${item.actionScore}/100, ${item.urgencyLevel} urgency, ${item.calibration.decisionConfidence} decision confidence.`,
    `Quality ${trend.topicQuality.score}/100 with gate ${trend.topicQuality.gateStatus} and ${trend.topicQuality.noiseRisk} noise risk.`,
    `${pluralize(trend.mentionCount, "mention")} across ${pluralize(trend.sourceCount, "source")}; lifecycle is ${trend.lifecycle.status}.`,
    trend.researchSignal.researchSignalCount > 0
      ? `Research signal ${trend.researchSignal.score}/100: ${trend.researchSignal.summary}`
      : "No research-source evidence attached.",
    item.watchlistItem
      ? `Watchlist status: ${item.watchlistItem.delta.watchStatusLabel}.`
      : "Not saved yet; save it if this is part of your content radar.",
  ]);
}

function trendEvidence(trend: DashboardTrend) {
  return compactUnique([
    `Trend ${trend.trendScore}/100, creator opportunity ${trend.creatorOpportunity.score}/100, quality ${trend.topicQuality.score}/100.`,
    `${pluralize(trend.mentionCount, "mention")} across ${pluralize(trend.sourceCount, "source")}; latest signal ${trend.lifecycle.latestSignalAgeHours ?? "unknown"}h old.`,
    `Lifecycle ${trend.lifecycle.status}; freshness ${trend.lifecycle.freshnessScore}/100; saturation ${trend.saturation}/100.`,
    trend.researchSignal.researchSignalCount > 0
      ? `Research signal ${trend.researchSignal.score}/100: ${trend.researchSignal.recommendedUse}`
      : "Research signal: no arXiv evidence attached.",
    `Recommended format: ${trend.creatorOpportunity.recommendedFormat}; timing: ${trend.creatorOpportunity.recommendedTiming}.`,
  ]);
}

function avoidEvidence(item: DailyBriefTopicToAvoid) {
  return compactUnique([
    `Severity: ${item.severity}.`,
    `Quality ${item.trend.topicQuality.score}/100, gate ${item.trend.topicQuality.gateStatus}, noise risk ${item.trend.topicQuality.noiseRisk}.`,
    `Lifecycle ${item.trend.lifecycle.status}; saturation ${item.trend.saturation}/100.`,
    ...item.warnings,
  ]);
}

function buildIntelligenceNarratives(args: {
  window: DashboardWindow;
  briefPosture: DailyBriefPosture;
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  researchSignals: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
  overallWarnings: string[];
}): DailyBriefNarrative[] {
  const primaryAction =
    args.topPriorityActions.find((item) => item.actionPriority === "act_now") ??
    args.topPriorityActions[0] ??
    null;
  const creatorCandidate = args.creatorOpportunities[0] ?? null;
  const hiddenGem = args.hiddenGems[0] ?? null;
  const researchCandidate = args.researchSignals[0] ?? null;
  const watchCandidate =
    args.watchlistMovement.find(
      (item) => item.delta.watchStatus === "rising",
    ) ??
    args.watchlistMovement[0] ??
    null;
  const avoidCandidate = args.topicsToAvoid[0] ?? null;

  const narratives: DailyBriefNarrative[] = [
    {
      id: "market-posture",
      eyebrow: "Radar read",
      title: args.briefPosture.label,
      verdict: args.briefPosture.summary,
      narrative:
        args.briefPosture.posture === "offensive"
          ? `The ${args.window} radar is giving you a narrow permission slip to act. Not on everything — on the cleanest lane only.`
          : args.briefPosture.posture === "selective"
            ? `The ${args.window} radar has signal, but not enough to reward a spray-and-pray content day. Pick the strongest lane and ignore the rest.`
            : `The ${args.window} radar is not paying rent today. The smart move is to protect attention, inspect evidence and wait for stronger confirmation.`,
      confidence: args.briefPosture.confidence,
      tone:
        args.briefPosture.posture === "offensive"
          ? "opportunity"
          : args.briefPosture.posture === "defensive"
            ? "risk"
            : "monitor",
      evidence: args.briefPosture.reasons,
      recommendedMove:
        args.briefPosture.posture === "offensive"
          ? "Turn the top priority into one concrete content or product-research action today."
          : args.briefPosture.posture === "selective"
            ? "Choose one lane, validate it in the drawer, then decide whether to save or execute."
            : "Do not force a trend. Use the brief to prune noise and wait for cleaner movement.",
      relatedTrendSlug: null,
      relatedTrendKey: null,
    },
  ];

  if (primaryAction) {
    narratives.push({
      id: "priority-thesis",
      eyebrow: "Priority thesis",
      title: primaryAction.trend.topic,
      verdict: primaryAction.summary,
      narrative: `${primaryAction.trend.topic} is the strongest execution candidate because the action layer combines timing, quality, lifecycle and evidence instead of ranking by raw hype alone. The next move is specific: ${primaryAction.recommendedNextStep}`,
      confidence: actionItemConfidence(primaryAction),
      tone:
        primaryAction.actionPriority === "act_now" ? "opportunity" : "monitor",
      evidence: actionEvidence(primaryAction),
      recommendedMove: primaryAction.recommendedNextStep,
      ...trendIdentity(primaryAction.trend),
    });
  } else if (hiddenGem) {
    narratives.push({
      id: "priority-thesis",
      eyebrow: "Fallback thesis",
      title: hiddenGem.topic,
      verdict: "No Act Now winner, but this is the cleanest early opening.",
      narrative: `${hiddenGem.topic} is not promoted as a hard action yet, but it is the best candidate to inspect because the hidden-gem layer sees early upside without obvious noise pressure.`,
      confidence: trendNarrativeConfidence(hiddenGem),
      tone: "monitor",
      evidence: trendEvidence(hiddenGem),
      recommendedMove:
        "Open the drawer, inspect evidence quality, then save it if the supporting signals look credible.",
      ...trendIdentity(hiddenGem),
    });
  }

  if (creatorCandidate) {
    narratives.push({
      id: "creator-lane",
      eyebrow: "Creator lane",
      title: creatorCandidate.topic,
      verdict: creatorCandidate.creatorOpportunity.bestAngle,
      narrative: `${creatorCandidate.topic} has the best creator timing in this brief. The angle is already shaped enough to become content, and the recommended format is ${creatorCandidate.creatorOpportunity.recommendedFormat}.`,
      confidence: trendNarrativeConfidence(creatorCandidate),
      tone:
        creatorCandidate.creatorOpportunity.recommendedTiming === "Act now"
          ? "opportunity"
          : "monitor",
      evidence: trendEvidence(creatorCandidate),
      recommendedMove: `Draft a ${creatorCandidate.creatorOpportunity.recommendedFormat.toLowerCase()} around: ${creatorCandidate.creatorOpportunity.bestAngle}`,
      ...trendIdentity(creatorCandidate),
    });
  }

  if (researchCandidate) {
    narratives.push({
      id: "research-signal",
      eyebrow: "Research signal",
      title: researchCandidate.topic,
      verdict: researchCandidate.researchSignal.summary,
      narrative:
        researchCandidate.researchSignal.confidenceImpact === "boost"
          ? `${researchCandidate.topic} has arXiv support without being trapped inside arXiv only. Use it as evidence for a research memo or early product thesis, not as a hype headline.`
          : `${researchCandidate.topic} has arXiv evidence, but the current calibration keeps it cautious because research evidence is isolated or overweighted.`,
      confidence: trendNarrativeConfidence(researchCandidate),
      tone:
        researchCandidate.researchSignal.confidenceImpact === "boost"
          ? "opportunity"
          : "monitor",
      evidence: compactUnique(
        [
          ...trendEvidence(researchCandidate),
          ...researchCandidate.researchSignal.drivers,
          ...researchCandidate.researchSignal.warnings,
        ],
        6,
      ),
      recommendedMove: researchCandidate.researchSignal.recommendedUse,
      ...trendIdentity(researchCandidate),
    });
  }

  if (watchCandidate) {
    narratives.push({
      id: "watchlist-movement",
      eyebrow: "Watchlist movement",
      title: watchCandidate.currentTrend?.topic ?? watchCandidate.topic,
      verdict: watchCandidate.delta.summary,
      narrative: watchCandidate.currentTrend
        ? `${watchCandidate.currentTrend.topic} moved inside your saved radar. Treat this as a personal signal, not a global ranking: it matters because you already chose to track it.`
        : `${watchCandidate.topic} is saved, but it is missing a current snapshot. That is useful as a warning: the item may be stale, renamed or outside the selected window.`,
      confidence: movementConfidence(watchCandidate),
      tone:
        watchCandidate.delta.watchStatus === "rising"
          ? "opportunity"
          : watchCandidate.delta.watchStatus === "attention" ||
              watchCandidate.delta.watchStatus === "stale"
            ? "risk"
            : "monitor",
      evidence: compactUnique([
        `Watch status: ${watchCandidate.delta.watchStatusLabel}.`,
        `Trend delta ${formatSigned(watchCandidate.delta.scoreDelta)}, creator delta ${formatSigned(watchCandidate.delta.creatorOpportunityDelta)}, quality delta ${formatSigned(watchCandidate.delta.qualityDelta)}.`,
        `${pluralize(watchCandidate.delta.newSignalsCount, "new signal")} since baseline.`,
        watchCandidate.delta.lifecycleChanged
          ? `Lifecycle changed from ${watchCandidate.delta.previousLifecycleStatus ?? "unknown"} to ${watchCandidate.delta.currentLifecycleStatus ?? "unknown"}.`
          : "Lifecycle did not materially change.",
      ]),
      recommendedMove: watchCandidate.delta.recommendedAction,
      ...trendIdentity(watchCandidate.currentTrend),
    });
  }

  if (avoidCandidate) {
    narratives.push({
      id: "avoidance-read",
      eyebrow: "Noise filter",
      title: avoidCandidate.trend.topic,
      verdict: avoidCandidate.reason,
      narrative: `${avoidCandidate.trend.topic} is the main topic to keep out of today's focus. This is not a ban; it is a demand for better evidence before attention gets spent.`,
      confidence: clampScore(
        avoidSeverityRank[avoidCandidate.severity] * 16 +
          (100 - avoidCandidate.trend.topicQuality.score) * 0.22 +
          Math.min(20, avoidCandidate.warnings.length * 5),
      ),
      tone: "risk",
      evidence: avoidEvidence(avoidCandidate),
      recommendedMove:
        "Do not execute from this topic today unless the detail drawer shows a very specific, fresh and source-backed angle.",
      ...trendIdentity(avoidCandidate.trend),
    });
  }

  if (args.overallWarnings.length > 0) {
    narratives.push({
      id: "brief-caveat",
      eyebrow: "Calibration caveat",
      title: "Read the brief with tuning context",
      verdict: args.overallWarnings[0],
      narrative:
        "The daily brief is computed from current intelligence layers, so warnings matter. They explain why a topic may look interesting but still fail the execution bar.",
      confidence: clampScore(
        62 + Math.min(24, args.overallWarnings.length * 4),
      ),
      tone: "neutral",
      evidence: args.overallWarnings.slice(0, 4),
      recommendedMove:
        "Use warnings as a final checklist before saving, publishing or turning any trend into action.",
      relatedTrendSlug: null,
      relatedTrendKey: null,
    });
  }

  return narratives.slice(0, 6);
}

function buildRecommendedFocus(args: {
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  researchSignals: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
  briefPosture: DailyBriefPosture;
}): DailyBriefRecommendedFocus {
  const primaryAction =
    args.topPriorityActions.find((item) => item.actionPriority === "act_now") ??
    args.topPriorityActions[0] ??
    null;
  const watchCandidate =
    args.watchlistMovement.find(
      (item) => item.delta.watchStatus === "rising",
    ) ??
    args.watchlistMovement[0] ??
    null;
  const creatorCandidate = args.creatorOpportunities[0] ?? null;
  const hiddenGem = args.hiddenGems[0] ?? null;
  const researchCandidate = args.researchSignals[0] ?? null;
  const avoidCandidate = args.topicsToAvoid[0] ?? null;

  return {
    focusToday: primaryAction
      ? `Focus today on ${primaryAction.trend.topic}: ${primaryAction.recommendedNextStep}`
      : creatorCandidate
        ? `Focus today on ${creatorCandidate.topic}: ${creatorCandidate.creatorOpportunity.bestAngle}`
        : researchCandidate
          ? `Focus today on research validation for ${researchCandidate.topic}: ${researchCandidate.researchSignal.recommendedUse}`
          : "Focus today on evidence review, not publishing. The radar is not showing a clean high-priority target.",
    monitor: watchCandidate?.currentTrend
      ? `Monitor ${watchCandidate.currentTrend.topic}: ${watchCandidate.delta.summary}`
      : hiddenGem
        ? `Monitor ${hiddenGem.topic}: it is early, usable and not yet over-saturated.`
        : "Monitor the next scan for source diversity and fresh mentions before making a move.",
    avoid: avoidCandidate
      ? `Avoid ${avoidCandidate.trend.topic}: ${avoidCandidate.reason}`
      : "Avoid forcing content from weak or generic topics just to fill the calendar.",
    rationale: compactUnique([
      `Brief posture is ${args.briefPosture.label.toLowerCase()} with ${args.briefPosture.confidence}/100 confidence.`,
      primaryAction
        ? `Action layer selected ${primaryAction.trend.topic} with ${primaryAction.actionScore}/100 action score.`
        : "Action layer did not find a strong Act Now candidate.",
      creatorCandidate
        ? `Best creator timing: ${creatorCandidate.topic} is marked ${creatorCandidate.creatorOpportunity.recommendedTiming}.`
        : "Creator opportunity layer is not showing a low-risk winner yet.",
      researchCandidate
        ? `Research calibration selected ${researchCandidate.topic} with ${researchCandidate.researchSignal.score}/100 research score and ${researchCandidate.signalAging.statusLabel.toLowerCase()}.`
        : "Research calibration did not find an arXiv-backed candidate worth elevating.",
      avoidCandidate
        ? `Noise suppression and evidence-action QA protect the brief from ${avoidCandidate.severity} topics.`
        : "No major suppressed trend needs a hard warning today.",
    ]),
  };
}

export async function getDailyBrief(
  requestedWindow: DashboardWindow = "7d",
): Promise<DailyBriefResponse> {
  const window = normalizeDashboardWindow(requestedWindow);
  const [dashboardData, actionQueue, watchlistData] = await Promise.all([
    getDashboardTrends(window),
    getActionQueue(window),
    listSavedTrends(window),
  ]);

  const topPriorityActions = buildTopPriorityActions(actionQueue.items);
  const watchlistMovement = buildWatchlistMovement(watchlistData.items);
  const hiddenGemsWorthWatching = buildHiddenGems(dashboardData.hiddenGems);
  const creatorOpportunities = buildCreatorOpportunities(
    dashboardData.creatorMode.opportunities,
  );
  const researchSignals = buildResearchSignals(dashboardData.trends);
  const topicsToAvoid = buildTopicsToAvoid(
    dashboardData.trends,
    actionQueue.items,
  );
  const overallWarnings = buildOverallWarnings({
    actionQueue,
    topicsToAvoid,
    watchlistMovement,
    latestScanWarnings: dashboardData.latestScan?.warnings ?? [],
  });
  const briefPosture = buildBriefPosture({
    topPriorityActions,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    researchSignals,
    topicsToAvoid,
    overallWarnings,
  });
  const executiveSummary = buildExecutiveSummary({
    window,
    topPriorityActions,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    researchSignals,
    topicsToAvoid,
    briefPosture,
  });
  const radarStats = buildRadarStats({
    totalTrends: dashboardData.trends.length,
    actionQueue,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    topicsToAvoid,
    researchSignals,
    sourceCoverageLabel:
      dashboardData.latestScan?.sourceCoverage.label ?? "No scan coverage yet",
    latestScanAt: dashboardData.latestScan?.createdAt ?? null,
  });
  const rawIntelligenceNarratives = buildIntelligenceNarratives({
    window,
    briefPosture,
    topPriorityActions,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    researchSignals,
    topicsToAvoid,
    overallWarnings,
  });
  const narrativeTuning = tuneDailyBriefNarratives({
    narratives: rawIntelligenceNarratives,
    topPriorityActions,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    researchSignals,
    topicsToAvoid,
    overallWarnings,
  });
  const recommendedFocus = buildRecommendedFocus({
    topPriorityActions,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    researchSignals,
    topicsToAvoid,
    briefPosture,
  });
  const savedTrendKeys = watchlistData.items.map((item) =>
    normalizeKey(item.trendKey),
  );
  const generatedAt = new Date().toISOString();
  const reportDocument = buildDailyBriefReportDocument({
    window,
    generatedAt,
    executiveSummary,
    radarStats,
    briefPosture,
    qa: narrativeTuning.qa,
    intelligenceNarratives: narrativeTuning.narratives,
    topPriorityActions,
    watchlistMovement,
    hiddenGemsWorthWatching,
    creatorOpportunities,
    researchSignals,
    topicsToAvoid,
    overallWarnings,
    recommendedFocus,
  });

  return {
    ok: true,
    window,
    generatedAt,
    executiveSummary,
    radarStats,
    briefPosture,
    qa: narrativeTuning.qa,
    reportDocument,
    intelligenceNarratives: narrativeTuning.narratives,
    topPriorityActions,
    watchlistMovement,
    hiddenGemsWorthWatching,
    creatorOpportunities,
    researchSignals,
    topicsToAvoid,
    overallWarnings,
    recommendedFocus,
    savedTrendKeys,
    savedTrends: watchlistData.items,
  };
}
