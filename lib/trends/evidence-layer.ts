import type {
  DashboardTrend,
  DashboardWindow,
  TrendDetailSignal,
  TrendDetailSnapshot,
  TrendEvidenceItem,
  TrendEvidenceLevel,
  TrendEvidenceMetric,
  TrendEvidenceType,
  TrendSignalQualityTag,
} from "@/lib/trends/types";

type EvidenceInput = {
  trend: DashboardTrend;
  window: DashboardWindow;
  signals: TrendDetailSignal[];
  snapshots: TrendDetailSnapshot[];
};

type EvidenceLayerResult = {
  evidence: TrendEvidenceItem[];
  signals: TrendDetailSignal[];
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

function evidenceLevel(score: number): TrendEvidenceLevel {
  if (score >= 76) return "strong";
  if (score >= 56) return "medium";
  return "weak";
}

function sourceQuality(source: string) {
  return sourceCredibility[source.trim().toLowerCase()] ?? 60;
}

function getSignalDate(signal: TrendDetailSignal) {
  const value = signal.publishedAt ?? signal.createdAt;
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageInHours(signal: TrendDetailSignal) {
  const date = getSignalDate(signal);
  if (!date) return Number.POSITIVE_INFINITY;

  return Math.max(0, (Date.now() - date.getTime()) / 36e5);
}

function formatSources(signals: TrendDetailSignal[]) {
  return Array.from(new Set(signals.map((signal) => signal.source))).slice(
    0,
    6,
  );
}

function metric(label: string, value: string | number): TrendEvidenceMetric {
  return { label, value: String(value) };
}

function scoreSignals(signals: TrendDetailSignal[]) {
  return signals.slice().sort((a, b) => {
    const aScore =
      sourceQuality(a.source) * 0.5 +
      Math.log10((a.engagement ?? 0) + 10) * 14 +
      Math.max(0, 48 - Math.min(48, ageInHours(a))) * 0.7 +
      (a.weight ?? 1) * 3;
    const bScore =
      sourceQuality(b.source) * 0.5 +
      Math.log10((b.engagement ?? 0) + 10) * 14 +
      Math.max(0, 48 - Math.min(48, ageInHours(b))) * 0.7 +
      (b.weight ?? 1) * 3;

    return bScore - aScore;
  });
}

function signalsForSourceDiversity(signals: TrendDetailSignal[]) {
  const seen = new Set<string>();
  const selected: TrendDetailSignal[] = [];

  for (const signal of scoreSignals(signals)) {
    if (seen.has(signal.source)) continue;
    seen.add(signal.source);
    selected.push(signal);
  }

  return selected.slice(0, 5);
}

function latestByWindow(snapshots: TrendDetailSnapshot[]) {
  const latest = new Map<DashboardWindow, TrendDetailSnapshot>();

  for (const snapshot of snapshots) {
    const existing = latest.get(snapshot.window);
    if (!existing || snapshot.createdAt > existing.createdAt) {
      latest.set(snapshot.window, snapshot);
    }
  }

  return latest;
}

function buildEvidenceItem(args: {
  id: TrendEvidenceType;
  title: string;
  label: string;
  score: number;
  level?: TrendEvidenceLevel;
  summary: string;
  whyItMatters: string;
  recommendedAction: string;
  metrics: TrendEvidenceMetric[];
  supportingSignals: TrendDetailSignal[];
}): TrendEvidenceItem {
  const score = clampScore(args.score);
  const supportingSignals = args.supportingSignals.slice(0, 5);

  return {
    id: args.id,
    type: args.id,
    title: args.title,
    label: args.label,
    score,
    level: args.level ?? evidenceLevel(score),
    summary: args.summary,
    whyItMatters: args.whyItMatters,
    recommendedAction: args.recommendedAction,
    metrics: args.metrics,
    sources: formatSources(supportingSignals),
    supportingSignals,
  };
}

function tagSignals(args: {
  trend: DashboardTrend;
  signals: TrendDetailSignal[];
  sourceCount: number;
  momentumDelta: number | null;
}) {
  const sourceCount = args.sourceCount;
  const hasContentGap =
    args.trend.contentScore >= 70 && args.trend.saturation <= 62;
  const hasSaturationWarning = args.trend.saturation >= 68;
  const hasMomentum =
    args.trend.velocity >= 62 ||
    (args.momentumDelta !== null && args.momentumDelta >= 6);

  return args.signals.map((signal) => {
    const evidenceTags = new Set<TrendEvidenceType>();
    const qualityTags = new Set<TrendSignalQualityTag>();
    const ageHours = ageInHours(signal);
    const sourceScore = sourceQuality(signal.source);

    if (ageHours <= 72 || sourceScore >= 82) {
      evidenceTags.add("early_signal");
    }

    if (ageHours <= 48) {
      qualityTags.add("fresh");
    } else if (ageHours >= 168) {
      qualityTags.add("old_signal");
      qualityTags.add("stale_evidence");
    } else {
      qualityTags.add("repeated_known");
    }

    if (sourceScore >= 82) {
      qualityTags.add("strong_source");
    }

    if (sourceScore <= 62) {
      qualityTags.add("weak_source");
    }

    if (sourceCount >= 2) {
      evidenceTags.add("cross_source_confirmation");
      qualityTags.add("cross_source_confirmation");
    }

    if (hasContentGap) {
      evidenceTags.add("content_gap");
    }

    if (hasSaturationWarning) {
      evidenceTags.add("saturation_warning");
    }

    if (hasMomentum) {
      evidenceTags.add("momentum_shift");
    }

    return {
      ...signal,
      evidenceTags: Array.from(evidenceTags),
      qualityTags: Array.from(qualityTags),
    };
  });
}

export function buildTrendEvidenceLayer({
  trend,
  signals,
  snapshots,
}: EvidenceInput): EvidenceLayerResult {
  const latest = latestByWindow(snapshots);
  const day = latest.get("24h");
  const week = latest.get("7d");
  const month = latest.get("30d");
  const dayVsWeek =
    day && week
      ? clampScore(day.trendScore) - clampScore(week.trendScore)
      : null;
  const weekVsMonth =
    week && month
      ? clampScore(week.trendScore) - clampScore(month.trendScore)
      : null;
  const creatorGap = clampScore(100 - trend.saturation);
  const taggedSignals = tagSignals({
    trend,
    signals,
    sourceCount: trend.sourceCount,
    momentumDelta: dayVsWeek,
  });
  const sortedSignals = scoreSignals(taggedSignals);
  const recentSignals = sortedSignals
    .filter((signal) => ageInHours(signal) <= 96)
    .slice(0, 5);
  const evidenceSignals = recentSignals.length
    ? recentSignals
    : sortedSignals.slice(0, 5);
  const diversitySignals = signalsForSourceDiversity(taggedSignals);
  const signalsByTag = (tag: TrendEvidenceType) =>
    taggedSignals.filter((signal) => signal.evidenceTags?.includes(tag));

  const freshnessPenalty = trend.lifecycle.freshnessScore < 45 ? 0.72 : 1;

  const earlySignalScore = clampScore(
    (trend.hiddenGemScore * 0.38 +
      trend.velocity * 0.3 +
      creatorGap * 0.14 +
      trend.lifecycle.freshnessScore * 0.12 +
      Math.min(100, recentSignals.length * 18) * 0.06) *
      freshnessPenalty,
  );

  const crossSourceScore = clampScore(
    trend.sourceDiversity * 0.48 +
      Math.min(100, trend.sourceCount * 24) * 0.32 +
      Math.min(100, signals.length * 10) * 0.2,
  );

  const contentGapScore = clampScore(
    trend.contentScore * 0.54 + creatorGap * 0.3 + trend.hiddenGemScore * 0.16,
  );

  const saturationRiskScore = clampScore(trend.saturation);
  const saturationLevel: TrendEvidenceLevel =
    saturationRiskScore >= 72
      ? "warning"
      : saturationRiskScore >= 55
        ? "medium"
        : "strong";

  const momentumScore = clampScore(
    trend.velocity * 0.55 +
      (dayVsWeek !== null ? Math.max(0, 50 + dayVsWeek * 3) : 45) * 0.25 +
      (weekVsMonth !== null ? Math.max(0, 50 + weekVsMonth * 2) : 45) * 0.2,
  );

  return {
    signals: taggedSignals,
    evidence: [
      buildEvidenceItem({
        id: "early_signal",
        title: "Early signal profile",
        label: "Early signal",
        score: earlySignalScore,
        summary:
          earlySignalScore >= 76
            ? `${trend.topic} is showing early movement with enough velocity and low-enough saturation to deserve attention now.`
            : `${trend.topic} has some early movement, but the signal is not yet strong enough to treat as a clean lead story.`,
        whyItMatters:
          "This separates genuine early movement from topics that are already obvious. Hidden-gem score, velocity and saturation are read together, not as isolated numbers.",
        recommendedAction:
          earlySignalScore >= 76
            ? "Prepare a short intelligence note or creator brief while the topic is still under-covered."
            : "Keep monitoring until velocity or source quality improves.",
        metrics: [
          metric("Hidden gem", trend.hiddenGemScore),
          metric("Velocity", trend.velocity),
          metric("Saturation", trend.saturation),
          metric("Fresh signals", recentSignals.length),
          metric("Lifecycle", trend.lifecycle.status),
        ],
        supportingSignals: signalsByTag("early_signal").length
          ? signalsByTag("early_signal")
          : evidenceSignals,
      }),
      buildEvidenceItem({
        id: "cross_source_confirmation",
        title: "Cross-source confirmation",
        label: "Confirmation",
        score: crossSourceScore,
        summary:
          trend.sourceCount >= 3
            ? `The trend is appearing across ${trend.sourceCount} sources, which lowers the chance that this is just one-platform noise.`
            : `The trend is still concentrated in ${trend.sourceCount} source${trend.sourceCount === 1 ? "" : "s"}, so confirmation is limited.`,
        whyItMatters:
          "A topic becomes more reliable when different source types start pointing in the same direction. One loud platform can lie; cross-source movement is harder to fake.",
        recommendedAction:
          trend.sourceCount >= 3
            ? "Treat this as validated enough for deeper research and positioning."
            : "Wait for at least one more independent source before calling it a confirmed trend.",
        metrics: [
          metric("Sources", trend.sourceCount),
          metric("Source diversity", trend.sourceDiversity),
          metric("Mentions", trend.mentionCount),
          metric("Signals shown", signals.length),
        ],
        supportingSignals: signalsByTag("cross_source_confirmation").length
          ? diversitySignals
          : sortedSignals.slice(0, 4),
      }),
      buildEvidenceItem({
        id: "content_gap",
        title: "Content gap window",
        label: "Content gap",
        score: contentGapScore,
        summary:
          contentGapScore >= 76
            ? `${trend.topic} has a useful content gap: strong content score with enough room before saturation gets ugly.`
            : `${trend.topic} has some content potential, but the angle still needs sharper differentiation.`,
        whyItMatters:
          "The best creator opportunities are not always the hottest topics. They are topics with enough signal, low enough saturation and a practical angle people can actually use.",
        recommendedAction:
          contentGapScore >= 76
            ? "Write the practical explainer, teardown or workflow piece before generic AI content catches up."
            : "Look for a more specific sub-angle before publishing.",
        metrics: [
          metric("Content score", trend.contentScore),
          metric("Creator gap", creatorGap),
          metric("Hidden gem", trend.hiddenGemScore),
          metric("Saturation", trend.saturation),
        ],
        supportingSignals: signalsByTag("content_gap").length
          ? signalsByTag("content_gap").slice(0, 5)
          : sortedSignals.slice(0, 4),
      }),
      buildEvidenceItem({
        id: "saturation_warning",
        title:
          saturationRiskScore >= 72
            ? "Saturation warning"
            : saturationRiskScore >= 55
              ? "Saturation watch"
              : "Low saturation opening",
        label: "Saturation",
        score: saturationRiskScore,
        level: saturationLevel,
        summary:
          saturationRiskScore >= 72
            ? `${trend.topic} is getting crowded. It may still be valuable, but it is no longer a clean hidden-gem lane.`
            : saturationRiskScore >= 55
              ? `${trend.topic} is moving toward a crowded zone. Generic content will probably underperform.`
              : `${trend.topic} is still relatively unsaturated, which gives you room to shape the angle early.`,
        whyItMatters:
          "Saturation controls timing. High signal is good, but if everyone is already saying the same thing, the edge is weaker.",
        recommendedAction:
          saturationRiskScore >= 72
            ? "Avoid generic trend commentary. Use a niche use-case, contrarian angle or source-backed teardown."
            : "Move before the topic becomes broad mainstream AI commentary.",
        metrics: [
          metric("Saturation", saturationRiskScore),
          metric("Creator gap", creatorGap),
          metric("Trend score", trend.trendScore),
          metric("Status", trend.status),
        ],
        supportingSignals: signalsByTag("saturation_warning").length
          ? signalsByTag("saturation_warning").slice(0, 5)
          : sortedSignals.slice(0, 4),
      }),
      buildEvidenceItem({
        id: "momentum_shift",
        title: "Momentum shift",
        label: "Momentum",
        score: momentumScore,
        summary:
          dayVsWeek !== null && dayVsWeek >= 8
            ? `${trend.topic} is hotter in the 24h window than the 7d baseline, which points to fresh acceleration.`
            : dayVsWeek !== null && dayVsWeek <= -8
              ? `${trend.topic} is cooling in the 24h window compared with the 7d baseline.`
              : `${trend.topic} is moving steadily rather than spiking sharply right now.`,
        whyItMatters:
          "Momentum tells you whether the topic is accelerating now or simply resting on older accumulated signal.",
        recommendedAction:
          momentumScore >= 76
            ? "Prioritize this in the next scan review."
            : "Keep it in watch mode unless new high-quality signals appear.",
        metrics: [
          metric("Velocity", trend.velocity),
          metric(
            "24h vs 7d",
            dayVsWeek === null
              ? "n/a"
              : dayVsWeek > 0
                ? `+${dayVsWeek}`
                : dayVsWeek,
          ),
          metric(
            "7d vs 30d",
            weekVsMonth === null
              ? "n/a"
              : weekVsMonth > 0
                ? `+${weekVsMonth}`
                : weekVsMonth,
          ),
          metric("Lifecycle", trend.lifecycle.status),
          metric("Freshness", trend.lifecycle.freshnessScore),
        ],
        supportingSignals: signalsByTag("momentum_shift").length
          ? signalsByTag("momentum_shift").slice(0, 5)
          : evidenceSignals,
      }),
    ],
  };
}
