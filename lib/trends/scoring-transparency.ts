import type {
  DashboardTrend,
  TrendDetailSignal,
  TrendDetailSnapshot,
  TrendScoringTransparency,
  TrendScoringTransparencyBreakdownItem,
  TrendScoringTransparencyConfidence,
  TrendScoringTransparencyImpact,
} from "@/lib/trends/types";

type ScoringTransparencyInput = {
  trend: DashboardTrend;
  signals: TrendDetailSignal[];
  snapshots: TrendDetailSnapshot[];
  rawTrendScore?: number;
};

const sourceCredibility: Record<string, number> = {
  github: 92,
  "hacker news": 84,
  hn: 84,
  rss: 68,
  blog: 66,
  reddit: 58,
  youtube: 54,
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return clampScore(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function sourceQuality(source: string) {
  return sourceCredibility[source.trim().toLowerCase()] ?? 60;
}

function confidenceLevel(score: number): TrendScoringTransparencyConfidence {
  if (score >= 74) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

function impactFromValue(
  value: number,
  highIsGood = true,
): TrendScoringTransparencyImpact {
  if (highIsGood) {
    if (value >= 70) return "positive";
    if (value <= 38) return "negative";
    return "neutral";
  }

  if (value >= 70) return "negative";
  if (value <= 38) return "positive";
  return "neutral";
}

function breakdownItem(args: {
  id: string;
  label: string;
  value: number;
  impact: TrendScoringTransparencyImpact;
  description: string;
}): TrendScoringTransparencyBreakdownItem {
  return {
    id: args.id,
    label: args.label,
    value: clampScore(args.value),
    impact: args.impact,
    description: args.description,
  };
}

function duplicatePressure(signals: TrendDetailSignal[]) {
  if (signals.length === 0) return 0;

  const knownSignals = signals.filter((signal) =>
    signal.qualityTags?.some((tag) =>
      ["repeated_known", "old_signal", "stale_evidence"].includes(tag),
    ),
  ).length;

  const urls = new Set(signals.map((signal) => signal.url));
  const repeatedUrlPressure =
    signals.length > 0
      ? ((signals.length - urls.size) / signals.length) * 100
      : 0;

  return clampScore(
    (knownSignals / signals.length) * 82 + repeatedUrlPressure * 18,
  );
}

function aliasPressure(trend: DashboardTrend, signals: TrendDetailSignal[]) {
  const aliasSignalCount = signals.filter((signal) =>
    signal.qualityTags?.includes("alias_variation"),
  ).length;
  const aliasSignalRatio =
    signals.length > 0 ? (aliasSignalCount / signals.length) * 100 : 0;
  const aliasListPressure = Math.min(100, trend.aliases.length * 11);

  return clampScore(aliasSignalRatio * 0.62 + aliasListPressure * 0.38);
}

function evidenceDepthScore(
  trend: DashboardTrend,
  signals: TrendDetailSignal[],
) {
  const signalDepth = Math.min(100, signals.length * 13);
  const mentionDepth = Math.min(100, trend.mentionCount * 8);
  const sourceDepth = Math.min(100, trend.sourceCount * 28);

  return clampScore(
    signalDepth * 0.38 + mentionDepth * 0.32 + sourceDepth * 0.3,
  );
}

function credibilityScore(trend: DashboardTrend, signals: TrendDetailSignal[]) {
  const signalQuality = signals
    .map((signal) => signal.qualityScore)
    .filter((value): value is number => typeof value === "number");
  const qualityFromSignals = signalQuality.length ? average(signalQuality) : 0;
  const qualityFromSources = signals.length
    ? average(signals.map((signal) => sourceQuality(signal.source)))
    : average(trend.sources.map((source) => sourceQuality(source)));

  if (qualityFromSignals > 0) {
    return clampScore(qualityFromSignals * 0.58 + qualityFromSources * 0.42);
  }

  return qualityFromSources;
}

function momentumDelta(snapshots: TrendDetailSnapshot[]) {
  const latestByWindow = new Map<string, TrendDetailSnapshot>();

  for (const snapshot of snapshots) {
    const existing = latestByWindow.get(snapshot.window);
    if (!existing || snapshot.createdAt > existing.createdAt) {
      latestByWindow.set(snapshot.window, snapshot);
    }
  }

  const day = latestByWindow.get("24h");
  const week = latestByWindow.get("7d");
  const month = latestByWindow.get("30d");

  return {
    dayVsWeek: day && week ? day.trendScore - week.trendScore : null,
    weekVsMonth: week && month ? week.trendScore - month.trendScore : null,
  };
}

function pushUnique(items: string[], value: string) {
  if (!items.includes(value)) items.push(value);
}

function buildExplanation(args: {
  trend: DashboardTrend;
  confidence: TrendScoringTransparencyConfidence;
  positiveDrivers: string[];
  negativeDrivers: string[];
}) {
  const { trend, confidence, positiveDrivers, negativeDrivers } = args;
  const firstPositive = positiveDrivers[0]?.toLowerCase() ?? "usable signal";
  const secondPositive = positiveDrivers[1]?.toLowerCase();
  const firstNegative = negativeDrivers[0]?.toLowerCase();

  const positiveText = secondPositive
    ? `${firstPositive} and ${secondPositive}`
    : firstPositive;
  const cautionText = firstNegative
    ? ` Main caution: ${firstNegative}.`
    : " No major ranking warning is currently dominating the score.";

  return `${trend.topic} has ${confidence.toLowerCase()} scoring confidence because it shows ${positiveText}.${cautionText}`;
}

export function buildScoringTransparency({
  trend,
  signals,
  snapshots,
  rawTrendScore,
}: ScoringTransparencyInput): TrendScoringTransparency {
  const credibility = credibilityScore(trend, signals);
  const freshness = trend.lifecycle.freshnessScore;
  const stalenessPenalty = clampScore(100 - freshness);
  const saturationPenalty = clampScore(
    trend.saturation >= 60
      ? (trend.saturation - 55) * 1.55
      : trend.saturation * 0.22,
  );
  const duplicate = duplicatePressure(signals);
  const alias = aliasPressure(trend, signals);
  const evidenceDepth = evidenceDepthScore(trend, signals);
  const movement = momentumDelta(snapshots);
  const adjustedTrendScore = clampScore(trend.trendScore);
  const rawScore = clampScore(rawTrendScore ?? trend.trendScore);
  const freshnessAdjustment = adjustedTrendScore - rawScore;

  const breakdown = [
    breakdownItem({
      id: "velocity",
      label: "Velocity contribution",
      value: trend.velocity,
      impact: impactFromValue(trend.velocity),
      description:
        trend.velocity >= 70
          ? "Recent movement is strong enough to lift the ranking."
          : trend.velocity <= 38
            ? "Velocity is weak, so the trend should not be treated as urgent yet."
            : "Velocity is usable but not a breakout signal by itself.",
    }),
    breakdownItem({
      id: "source-diversity",
      label: "Source diversity contribution",
      value: trend.sourceDiversity,
      impact: impactFromValue(trend.sourceDiversity),
      description:
        trend.sourceCount >= 3
          ? "The trend is confirmed across several independent sources."
          : trend.sourceCount >= 2
            ? "The trend has some cross-source support, but coverage can still improve."
            : "The trend is still concentrated in one source lane.",
    }),
    breakdownItem({
      id: "freshness",
      label: "Freshness contribution",
      value: freshness,
      impact: impactFromValue(freshness),
      description:
        freshness >= 70
          ? "Fresh signals are keeping the topic alive in the current window."
          : freshness <= 42
            ? "Signal age is pulling confidence down."
            : "Freshness is acceptable, but not enough to carry the score alone.",
    }),
    breakdownItem({
      id: "credibility",
      label: "Credibility contribution",
      value: credibility,
      impact: impactFromValue(credibility),
      description:
        credibility >= 76
          ? "Signal quality and source credibility are strong."
          : credibility <= 48
            ? "The evidence base leans toward weaker or less reliable sources."
            : "Source credibility is moderate.",
    }),
    breakdownItem({
      id: "hidden-gem",
      label: "Hidden gem contribution",
      value: trend.hiddenGemScore,
      impact: impactFromValue(trend.hiddenGemScore),
      description:
        trend.hiddenGemScore >= 72
          ? "The trend has early-signal potential before saturation fully catches up."
          : "The trend is visible, but not a clean hidden-gem candidate yet.",
    }),
    breakdownItem({
      id: "content-opportunity",
      label: "Content opportunity contribution",
      value: trend.contentScore,
      impact: impactFromValue(trend.contentScore),
      description:
        trend.contentScore >= 78
          ? "The topic has a clear creator or analyst angle."
          : "The content angle needs sharper positioning before it becomes useful.",
    }),
    breakdownItem({
      id: "saturation-penalty",
      label: "Saturation penalty",
      value: saturationPenalty,
      impact: impactFromValue(saturationPenalty, false),
      description:
        trend.saturation >= 72
          ? "Mainstream saturation is high enough to reduce hidden-gem confidence."
          : trend.saturation >= 55
            ? "Saturation is becoming a watch item, but it is not fatal yet."
            : "Saturation is still low enough to leave room for early positioning.",
    }),
    breakdownItem({
      id: "staleness-penalty",
      label: "Staleness penalty",
      value: stalenessPenalty,
      impact: impactFromValue(stalenessPenalty, false),
      description:
        stalenessPenalty >= 58
          ? "Older signal is actively reducing the ranking."
          : "Staleness is under control for the current window.",
    }),
    breakdownItem({
      id: "duplicate-pressure",
      label: "Duplicate pressure",
      value: duplicate,
      impact: impactFromValue(duplicate, false),
      description:
        duplicate >= 55
          ? "Several signals look repeated, known or stale, so ranking confidence is reduced."
          : "Duplicate pressure is not dominating the score.",
    }),
    breakdownItem({
      id: "canonical-strength",
      label: "Canonical alias strength",
      value: clampScore(100 - alias),
      impact: alias >= 65 ? "negative" : alias >= 38 ? "neutral" : "positive",
      description:
        alias >= 65
          ? "The trend is alias-heavy, so it may be a broad family of related ideas rather than one sharp topic."
          : trend.aliases.length > 0
            ? "Aliases are merged cleanly under one canonical topic."
            : "The topic identity is stable and not alias-heavy yet.",
    }),
  ];

  const positiveDrivers: string[] = [];
  const negativeDrivers: string[] = [];
  const warnings: string[] = [];

  if (trend.velocity >= 70) pushUnique(positiveDrivers, "Strong velocity");
  if (freshness >= 70) pushUnique(positiveDrivers, "Fresh signals");
  if (trend.sourceCount >= 3 || trend.sourceDiversity >= 62) {
    pushUnique(positiveDrivers, "Cross-source confirmation");
  }
  if (credibility >= 74) pushUnique(positiveDrivers, "Strong source quality");
  if (trend.hiddenGemScore >= 72 && trend.saturation <= 58) {
    pushUnique(positiveDrivers, "Low-saturation hidden gem profile");
  }
  if (trend.contentScore >= 78) {
    pushUnique(positiveDrivers, "Good creator opportunity");
  }
  if (evidenceDepth >= 72) pushUnique(positiveDrivers, "Solid evidence depth");

  if (trend.sourceCount <= 1 || trend.sourceDiversity < 38) {
    pushUnique(negativeDrivers, "Limited source diversity");
    pushUnique(warnings, "Limited source diversity");
  }
  if (duplicate >= 55) {
    pushUnique(negativeDrivers, "High duplicate pressure");
    pushUnique(warnings, "High duplicate pressure");
  }
  if (trend.saturation >= 72) {
    pushUnique(negativeDrivers, "Possible mainstream saturation");
    pushUnique(warnings, "Possible mainstream saturation");
  }
  if (freshness < 45 || ["Stale", "Dormant"].includes(trend.lifecycle.status)) {
    pushUnique(negativeDrivers, "Old signal base");
    pushUnique(warnings, "Old signal base");
  }
  if (signals.length < 3 || trend.mentionCount < 3) {
    pushUnique(negativeDrivers, "Weak evidence depth");
    pushUnique(warnings, "Weak evidence depth");
  }
  if (alias >= 65 || trend.aliases.length >= 7) {
    pushUnique(negativeDrivers, "Alias-heavy trend");
    pushUnique(warnings, "Alias-heavy trend");
  }
  if (credibility < 50) {
    pushUnique(negativeDrivers, "Weak source quality");
    pushUnique(warnings, "Weak source quality");
  }
  if (trend.lifecycle.momentumDirection === "down") {
    pushUnique(negativeDrivers, "Cooling momentum");
    pushUnique(warnings, "Cooling momentum");
  }

  if (positiveDrivers.length === 0) {
    pushUnique(positiveDrivers, "Moderate but monitorable signal");
  }

  const highSaturationPenalty =
    trend.saturation >= 72 ? trend.saturation - 55 : 0;
  const confidenceScore = clampScore(
    evidenceDepth * 0.2 +
      trend.sourceDiversity * 0.2 +
      freshness * 0.2 +
      credibility * 0.18 +
      trend.velocity * 0.12 +
      trend.hiddenGemScore * 0.1 -
      duplicate * 0.18 -
      stalenessPenalty * 0.14 -
      highSaturationPenalty * 0.12 -
      Math.max(0, alias - 55) * 0.08,
  );
  const confidence = confidenceLevel(confidenceScore);

  const rankingNotes = [
    `Raw snapshot score is ${rawScore}; freshness-adjusted trend score is ${adjustedTrendScore}.`,
    freshnessAdjustment === 0
      ? "Freshness adjustment is neutral in the current window."
      : freshnessAdjustment > 0
        ? `Freshness/lifecycle lifted the visible score by +${freshnessAdjustment}.`
        : `Freshness/lifecycle reduced the visible score by ${freshnessAdjustment}.`,
    movement.dayVsWeek === null
      ? "24h vs 7d movement is not available yet."
      : movement.dayVsWeek > 0
        ? `24h score is ${movement.dayVsWeek} points above the 7d baseline.`
        : movement.dayVsWeek < 0
          ? `24h score is ${Math.abs(movement.dayVsWeek)} points below the 7d baseline.`
          : "24h score is flat against the 7d baseline.",
  ];

  return {
    confidence,
    confidenceScore,
    explanation: buildExplanation({
      trend,
      confidence,
      positiveDrivers,
      negativeDrivers,
    }),
    rawTrendScore: rawScore,
    adjustedTrendScore,
    freshnessAdjustment,
    positiveDrivers,
    negativeDrivers,
    warnings,
    breakdown,
    rankingNotes,
  };
}
