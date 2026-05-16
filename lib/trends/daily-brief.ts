import { getActionQueue } from "@/lib/trends/action-queue";
import {
  getDashboardTrends,
  normalizeDashboardWindow,
} from "@/lib/trends/get-dashboard-trends";
import { listSavedTrends } from "@/lib/trends/watchlist";
import type {
  ActionQueueItem,
  DailyBriefAvoidSeverity,
  DailyBriefExecutiveSummary,
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

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value);
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

function isUsableOpportunity(trend: DashboardTrend) {
  return (
    trend.topicQuality.gateStatus !== "suppress" &&
    trend.topicQuality.noiseRisk !== "high" &&
    trend.topicQuality.isActionableTrend &&
    trend.lifecycle.status !== "Stale" &&
    trend.lifecycle.status !== "Dormant"
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
        b.lifecycle.freshnessScore * 0.14 +
        Math.max(0, 100 - b.saturation) * 0.08 -
        (a.hiddenGemScore * 0.42 +
          a.creatorOpportunity.score * 0.36 +
          a.lifecycle.freshnessScore * 0.14 +
          Math.max(0, 100 - a.saturation) * 0.08),
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
        b.topicQuality.score * 0.1 -
        (a.creatorOpportunity.score * 0.72 +
          a.contentScore * 0.18 +
          a.topicQuality.score * 0.1),
    )
    .slice(0, MAX_CREATOR_OPPORTUNITIES);
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
    trend.lifecycle.status === "Dormant"
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
    return `Lifecycle is ${trend.lifecycle.status}; latest signal age is ${trend.lifecycle.latestSignalAgeHours ?? "unknown"}h.`;
  }

  if (severity === "saturated") {
    return `Saturation is already ${trend.saturation}/100, so the opening may be crowded unless you have a very specific angle.`;
  }

  return `Signal quality is too thin for today's focus: ${trend.mentionCount} mentions, ${trend.sourceCount} sources, quality ${trend.topicQuality.score}/100.`;
}

function warningsForAvoidTrend(trend: DashboardTrend) {
  return uniqueByTrendKey(
    [
      ...trend.topicQuality.warnings,
      ...trend.creatorOpportunity.warnings,
      trend.lifecycle.summary,
    ].filter(Boolean),
    (warning) => warning,
  ).slice(0, 3);
}

function shouldAvoidTrend(trend: DashboardTrend) {
  return (
    trend.topicQuality.gateStatus === "suppress" ||
    trend.topicQuality.noiseRisk === "high" ||
    trend.topicQuality.isGenericTopic ||
    trend.topicQuality.topicClarity === "vague" ||
    trend.lifecycle.status === "Stale" ||
    trend.lifecycle.status === "Dormant" ||
    trend.saturation >= 82 ||
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

  return uniqueByTrendKey(warnings, (warning) => warning).slice(0, 8);
}

function buildRadarStats(args: {
  totalTrends: number;
  actionQueue: Awaited<ReturnType<typeof getActionQueue>>;
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
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
    sourceCoverageLabel: args.sourceCoverageLabel,
    latestScanAt: args.latestScanAt,
  };
}

function buildExecutiveSummary(args: {
  window: DashboardWindow;
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
}): DailyBriefExecutiveSummary {
  const actNow = args.topPriorityActions.filter(
    (item) => item.actionPriority === "act_now",
  );
  const topAction = args.topPriorityActions[0]?.trend ?? null;
  const topGem = args.hiddenGems[0] ?? null;
  const topCreator = args.creatorOpportunities[0] ?? null;
  const topAvoid = args.topicsToAvoid[0]?.trend ?? null;
  const watchlistHot = args.watchlistMovement.find(
    (item) => item.delta.watchStatus === "rising" && item.currentTrend,
  );

  const headline = topAction
    ? `${topAction.topic} leads today's actionable signal.`
    : topGem
      ? `${topGem.topic} is the cleanest opening in the current radar.`
      : "No clear Act Now winner in the selected window.";

  const narrative =
    args.topPriorityActions.length > 0
      ? `In the ${args.window} window, the brief finds ${actNow.length} Act Now candidate(s) and ${args.topPriorityActions.length - actNow.length} Monitor candidate(s). The strongest usable lane is ${formatTrendList([topAction, topCreator], "the current creator opportunity pool")}, while ${topAvoid?.topic ?? "low-quality broad topics"} should stay out of today's focus.`
      : `In the ${args.window} window, the radar is conservative: no priority candidate is strong enough to force action. Use this brief for monitoring, hidden-gem discovery and noise suppression rather than aggressive publishing.`;

  const bullets = [
    topAction
      ? `Priority: ${topAction.topic} has action score ${args.topPriorityActions[0]?.actionScore}/100 with ${args.topPriorityActions[0]?.urgencyLevel} urgency.`
      : "Priority: no Act Now topic cleared the tuning layer.",
    topGem
      ? `Hidden gem: ${topGem.topic} combines hidden-gem score ${topGem.hiddenGemScore}/100 with saturation ${topGem.saturation}/100.`
      : "Hidden gem: no quality-gated hidden gem stands out yet.",
    watchlistHot?.currentTrend
      ? `Watchlist: ${watchlistHot.currentTrend.topic} is rising with trend delta ${formatSigned(watchlistHot.delta.scoreDelta)}.`
      : `Watchlist: ${args.watchlistMovement.length} saved trend(s) have movement or inspection value.`,
    topAvoid
      ? `Avoid: ${topAvoid.topic} is flagged as ${args.topicsToAvoid[0].severity}.`
      : "Avoid: no major noise cluster is currently dominating the radar.",
  ];

  return { headline, narrative, bullets };
}

function buildRecommendedFocus(args: {
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
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
  const avoidCandidate = args.topicsToAvoid[0] ?? null;

  return {
    focusToday: primaryAction
      ? `Focus today on ${primaryAction.trend.topic}: ${primaryAction.recommendedNextStep}`
      : creatorCandidate
        ? `Focus today on ${creatorCandidate.topic}: ${creatorCandidate.creatorOpportunity.bestAngle}`
        : "Focus today on evidence review, not publishing. The radar is not showing a clean high-priority target.",
    monitor: watchCandidate?.currentTrend
      ? `Monitor ${watchCandidate.currentTrend.topic}: ${watchCandidate.delta.summary}`
      : hiddenGem
        ? `Monitor ${hiddenGem.topic}: it is early, usable and not yet over-saturated.`
        : "Monitor the next scan for source diversity and fresh mentions before making a move.",
    avoid: avoidCandidate
      ? `Avoid ${avoidCandidate.trend.topic}: ${avoidCandidate.reason}`
      : "Avoid forcing content from weak or generic topics just to fill the calendar.",
    rationale: [
      primaryAction
        ? `Action layer selected ${primaryAction.trend.topic} with ${primaryAction.actionScore}/100 action score.`
        : "Action layer did not find a strong Act Now candidate.",
      creatorCandidate
        ? `Best creator timing: ${creatorCandidate.topic} is marked ${creatorCandidate.creatorOpportunity.recommendedTiming}.`
        : "Creator opportunity layer is not showing a low-risk winner yet.",
      avoidCandidate
        ? `Noise suppression protects the brief from ${avoidCandidate.severity} topics.`
        : "No major suppressed trend needs a hard warning today.",
    ],
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
  const topicsToAvoid = buildTopicsToAvoid(
    dashboardData.trends,
    actionQueue.items,
  );
  const executiveSummary = buildExecutiveSummary({
    window,
    topPriorityActions,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    topicsToAvoid,
  });
  const radarStats = buildRadarStats({
    totalTrends: dashboardData.trends.length,
    actionQueue,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    topicsToAvoid,
    sourceCoverageLabel:
      dashboardData.latestScan?.sourceCoverage.label ?? "No scan coverage yet",
    latestScanAt: dashboardData.latestScan?.createdAt ?? null,
  });
  const overallWarnings = buildOverallWarnings({
    actionQueue,
    topicsToAvoid,
    watchlistMovement,
    latestScanWarnings: dashboardData.latestScan?.warnings ?? [],
  });
  const recommendedFocus = buildRecommendedFocus({
    topPriorityActions,
    watchlistMovement,
    hiddenGems: hiddenGemsWorthWatching,
    creatorOpportunities,
    topicsToAvoid,
  });
  const savedTrendKeys = watchlistData.items.map((item) =>
    normalizeKey(item.trendKey),
  );

  return {
    ok: true,
    window,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    radarStats,
    topPriorityActions,
    watchlistMovement,
    hiddenGemsWorthWatching,
    creatorOpportunities,
    topicsToAvoid,
    overallWarnings,
    recommendedFocus,
    savedTrendKeys,
    savedTrends: watchlistData.items,
  };
}
