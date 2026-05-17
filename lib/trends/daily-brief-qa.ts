import type {
  ActionQueueItem,
  DailyBriefNarrative,
  DailyBriefNarrativeCalibration,
  DailyBriefNarrativeCalibrationStatus,
  DailyBriefQaAdjustment,
  DailyBriefQaStatus,
  DailyBriefQaSummary,
  DailyBriefQaWarning,
  DailyBriefTopicToAvoid,
  DashboardTrend,
  SavedTrendWithCurrent,
} from "@/lib/trends/types";

type TuneDailyBriefNarrativesInput = {
  narratives: DailyBriefNarrative[];
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGems: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  researchSignals: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
  overallWarnings: string[];
};

type TrendContext = {
  trend: DashboardTrend | null;
  actionItem: ActionQueueItem | null;
  watchlistItem: SavedTrendWithCurrent | null;
  avoidItem: DailyBriefTopicToAvoid | null;
};

const confidenceFloorByTone: Record<DailyBriefNarrative["tone"], number> = {
  opportunity: 42,
  monitor: 35,
  risk: 48,
  neutral: 32,
};

function normalizeKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  const usable = values.filter(Number.isFinite);
  if (usable.length === 0) return 0;

  return Math.round(
    usable.reduce((sum, value) => sum + value, 0) / usable.length,
  );
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function pushWarning(
  warnings: DailyBriefQaWarning[],
  warning: DailyBriefQaWarning,
) {
  warnings.push(warning);
}

function qaStatusLabel(status: DailyBriefQaStatus) {
  const labels: Record<DailyBriefQaStatus, string> = {
    healthy: "Healthy narrative calibration",
    review: "Needs narrative review",
    too_aggressive: "Narratives too aggressive",
    too_cautious: "Narratives too cautious",
  };

  return labels[status];
}

function statusForAdjustment(delta: number, reasons: string[]) {
  if (reasons.length === 0)
    return "clean" satisfies DailyBriefNarrativeCalibrationStatus;
  if (delta <= -16)
    return "downgraded" satisfies DailyBriefNarrativeCalibrationStatus;
  if (delta <= -6)
    return "softened" satisfies DailyBriefNarrativeCalibrationStatus;
  return "needs_review" satisfies DailyBriefNarrativeCalibrationStatus;
}

function calibrationNote(status: DailyBriefNarrativeCalibrationStatus) {
  const notes: Record<DailyBriefNarrativeCalibrationStatus, string> = {
    clean: "Narrative passed QA without material tuning.",
    softened: "Narrative confidence was softened to avoid overclaiming.",
    downgraded:
      "Narrative was downgraded because evidence, quality or timing pressure is not strong enough.",
    needs_review:
      "Narrative is usable, but should be read with manual judgment.",
  };

  return notes[status];
}

function trendKeys(trend: DashboardTrend) {
  return [trend.canonicalKey, trend.slug, trend.id, trend.topic].map(
    normalizeKey,
  );
}

function registerTrend(
  map: Map<string, TrendContext>,
  trend: DashboardTrend | null,
  context: Partial<TrendContext>,
) {
  if (!trend) return;

  for (const key of trendKeys(trend)) {
    if (!key) continue;
    const existing = map.get(key) ?? {
      trend,
      actionItem: null,
      watchlistItem: null,
      avoidItem: null,
    };

    map.set(key, {
      trend: existing.trend ?? trend,
      actionItem: context.actionItem ?? existing.actionItem,
      watchlistItem: context.watchlistItem ?? existing.watchlistItem,
      avoidItem: context.avoidItem ?? existing.avoidItem,
    });
  }
}

function buildContextIndex(input: TuneDailyBriefNarrativesInput) {
  const map = new Map<string, TrendContext>();

  for (const item of input.topPriorityActions) {
    registerTrend(map, item.trend, { actionItem: item });
  }

  for (const trend of input.hiddenGems) {
    registerTrend(map, trend, {});
  }

  for (const trend of input.creatorOpportunities) {
    registerTrend(map, trend, {});
  }

  for (const trend of input.researchSignals) {
    registerTrend(map, trend, {});
  }

  for (const item of input.watchlistMovement) {
    registerTrend(map, item.currentTrend, { watchlistItem: item });
  }

  for (const item of input.topicsToAvoid) {
    registerTrend(map, item.trend, { avoidItem: item });
  }

  return map;
}

function contextForNarrative(
  narrative: DailyBriefNarrative,
  contextIndex: Map<string, TrendContext>,
): TrendContext {
  const relatedKeys = [
    narrative.relatedTrendKey,
    narrative.relatedTrendSlug,
    narrative.title,
  ].map(normalizeKey);

  for (const key of relatedKeys) {
    const context = contextIndex.get(key);
    if (context) return context;
  }

  return {
    trend: null,
    actionItem: null,
    watchlistItem: null,
    avoidItem: null,
  };
}

function evidenceDensityForNarrative(narrative: DailyBriefNarrative) {
  const evidenceCount = narrative.evidence.filter(
    (item) => item.trim().length > 0,
  ).length;

  if (evidenceCount >= 4) return 100;
  if (evidenceCount === 3) return 78;
  if (evidenceCount === 2) return 58;
  if (evidenceCount === 1) return 32;
  return 0;
}

function tuneNarrative(args: {
  narrative: DailyBriefNarrative;
  context: TrendContext;
}): {
  narrative: DailyBriefNarrative;
  adjustment: DailyBriefQaAdjustment;
  lowEvidence: boolean;
  aggressive: boolean;
  ungroundedOpportunity: boolean;
} {
  const { narrative, context } = args;
  const trend = context.trend;
  const reasons: string[] = [];
  let penalty = 0;
  let bonus = 0;

  const evidenceDensity = evidenceDensityForNarrative(narrative);
  const lowEvidence = evidenceDensity < 58;

  if (lowEvidence) {
    penalty += 10;
    reasons.push("Narrative has fewer than two concrete evidence points.");
  }

  if (
    narrative.tone === "opportunity" &&
    !trend &&
    narrative.id !== "market-posture"
  ) {
    penalty += 10;
    reasons.push("Opportunity narrative is not connected to a concrete trend.");
  }

  if (trend) {
    if (trend.sourceCount < 2) {
      penalty += narrative.tone === "opportunity" ? 12 : 6;
      reasons.push("Source confirmation is thin: fewer than two sources.");
    }

    if (trend.researchSignal.confidenceImpact === "caution") {
      penalty += narrative.tone === "opportunity" ? 12 : 6;
      reasons.push("Research signal is isolated or overrepresented.");
    }

    if (trend.researchSignal.confidenceImpact === "boost") {
      bonus += 5;
      reasons.push("Research signal is supported outside arXiv.");
    }

    if (trend.mentionCount < 3) {
      penalty += narrative.tone === "opportunity" ? 7 : 4;
      reasons.push("Mention volume is still light.");
    }

    if (trend.topicQuality.gateStatus === "watch") {
      penalty += narrative.tone === "opportunity" ? 10 : 5;
      reasons.push("Quality gate is watch, not pass.");
    }

    if (trend.topicQuality.gateStatus === "suppress") {
      penalty += 28;
      reasons.push("Quality gate suppresses this topic.");
    }

    if (trend.topicQuality.noiseRisk === "medium") {
      penalty += narrative.tone === "opportunity" ? 8 : 4;
      reasons.push("Noise risk is medium.");
    }

    if (trend.topicQuality.noiseRisk === "high") {
      penalty += 24;
      reasons.push("Noise risk is high.");
    }

    if (
      !trend.topicQuality.isActionableTrend &&
      narrative.tone === "opportunity"
    ) {
      penalty += 10;
      reasons.push("Topic is not actionable enough for an opportunity claim.");
    }

    if (trend.creatorOpportunity.contentRisk === "high") {
      penalty += 16;
      reasons.push("Creator content risk is high.");
    }

    if (trend.lifecycle.status === "Cooling") {
      penalty += narrative.tone === "opportunity" ? 8 : 4;
      reasons.push("Lifecycle is cooling.");
    }

    if (
      trend.lifecycle.status === "Stale" ||
      trend.lifecycle.status === "Dormant"
    ) {
      penalty += 22;
      reasons.push(`Lifecycle is ${trend.lifecycle.status.toLowerCase()}.`);
    }

    if (trend.saturation >= 82 && narrative.tone === "opportunity") {
      penalty += 10;
      reasons.push("Saturation is high for an execution recommendation.");
    }

    if (
      trend.topicQuality.gateStatus === "pass" &&
      trend.topicQuality.noiseRisk === "low" &&
      trend.sourceCount >= 2 &&
      evidenceDensity >= 78
    ) {
      bonus += narrative.tone === "risk" ? 0 : 4;
    }
  }

  if (context.actionItem) {
    if (context.actionItem.calibration.decisionConfidence !== "high") {
      penalty += narrative.tone === "opportunity" ? 8 : 4;
      reasons.push("Action Queue decision confidence is not high.");
    }

    if (context.actionItem.calibration.actNowBlockers.length > 0) {
      const blockerPenalty = Math.min(
        15,
        context.actionItem.calibration.actNowBlockers.length * 4,
      );
      penalty += blockerPenalty;
      reasons.push("Action Queue still has Act Now blockers.");
    }

    if (
      narrative.tone === "opportunity" &&
      context.actionItem.actionPriority !== "act_now"
    ) {
      penalty += 7;
      reasons.push(
        "Narrative sounds like action, but queue priority is not Act Now.",
      );
    }
  }

  if (context.avoidItem && narrative.tone === "opportunity") {
    penalty += 18;
    reasons.push("Same topic also appears in the avoid lane.");
  }

  const rawAdjustedConfidence = narrative.confidence - penalty + bonus;
  const adjustedConfidence = clampScore(
    Math.max(confidenceFloorByTone[narrative.tone], rawAdjustedConfidence),
  );
  const delta = adjustedConfidence - narrative.confidence;
  const status = statusForAdjustment(delta, reasons);
  const aggressive =
    narrative.tone === "opportunity" &&
    (narrative.confidence >= 74 || adjustedConfidence >= 68) &&
    reasons.length > 0;
  const ungroundedOpportunity =
    narrative.tone === "opportunity" && (!trend || trend.sourceCount < 2);
  const tunedTone: DailyBriefNarrative["tone"] =
    narrative.tone === "opportunity" && adjustedConfidence < 64
      ? "monitor"
      : narrative.tone;

  const calibration: DailyBriefNarrativeCalibration = {
    status,
    note: calibrationNote(status),
    confidenceBefore: narrative.confidence,
    confidenceAfter: adjustedConfidence,
    reasons: reasons.slice(0, 4),
  };

  const tunedNarrative: DailyBriefNarrative = {
    ...narrative,
    tone: tunedTone,
    confidence: adjustedConfidence,
    calibration,
  };

  return {
    narrative: tunedNarrative,
    adjustment: {
      narrativeId: narrative.id,
      narrativeTitle: narrative.title,
      status,
      confidenceBefore: narrative.confidence,
      confidenceAfter: adjustedConfidence,
      reasons: reasons.slice(0, 4),
    },
    lowEvidence,
    aggressive,
    ungroundedOpportunity,
  };
}

function buildTuningNotes(args: {
  status: DailyBriefQaStatus;
  actNowCount: number;
  lowEvidenceNarratives: number;
  aggressiveNarratives: number;
  ungroundedOpportunityNarratives: number;
  averageNarrativeConfidence: number;
}) {
  const notes: string[] = [];

  if (args.status === "too_aggressive") {
    notes.push(
      "Daily Brief should soften opportunity language until quality, source diversity and Action Queue confidence agree.",
    );
  }

  if (args.actNowCount === 0) {
    notes.push(
      "No Act Now candidate is not a failure; this layer should prefer a missed opportunity over a noisy recommendation.",
    );
  }

  if (args.lowEvidenceNarratives > 0) {
    notes.push(
      "Low-evidence narratives should stay in monitor language and push the user toward drawer inspection.",
    );
  }

  if (args.ungroundedOpportunityNarratives > 0) {
    notes.push(
      "Opportunity claims without at least two confirming sources are automatically softened.",
    );
  }

  if (args.averageNarrativeConfidence < 55) {
    notes.push(
      "Average confidence is low; keep the brief defensive and avoid strong publishing recommendations.",
    );
  }

  notes.push(
    "Narrative QA does not change database data; it calibrates the report language and confidence shown to the user.",
  );

  return notes;
}

export function tuneDailyBriefNarratives(
  input: TuneDailyBriefNarrativesInput,
): {
  narratives: DailyBriefNarrative[];
  qa: DailyBriefQaSummary;
} {
  const contextIndex = buildContextIndex(input);
  const tuned = input.narratives.map((narrative) =>
    tuneNarrative({
      narrative,
      context: contextForNarrative(narrative, contextIndex),
    }),
  );
  const narratives = tuned.map((item) => item.narrative);
  const adjustments = tuned.map((item) => item.adjustment);
  const totalNarratives = narratives.length;
  const highConfidenceNarratives = narratives.filter(
    (narrative) => narrative.confidence >= 78,
  ).length;
  const lowEvidenceNarratives = tuned.filter((item) => item.lowEvidence).length;
  const aggressiveNarratives = tuned.filter((item) => item.aggressive).length;
  const ungroundedOpportunityNarratives = tuned.filter(
    (item) => item.ungroundedOpportunity,
  ).length;
  const calibratedNarratives = adjustments.filter(
    (item) => item.status !== "clean",
  ).length;
  const averageNarrativeConfidence = average(
    narratives.map((narrative) => narrative.confidence),
  );
  const evidenceDensity = average(
    narratives.map((narrative) => evidenceDensityForNarrative(narrative)),
  );
  const actionabilityScore = average([
    ...input.topPriorityActions.map((item) => item.actionScore),
    ...input.creatorOpportunities.map(
      (trend) => trend.creatorOpportunity.score,
    ),
  ]);
  const actNowCount = input.topPriorityActions.filter(
    (item) => item.actionPriority === "act_now",
  ).length;
  const warnings: DailyBriefQaWarning[] = [];

  if (aggressiveNarratives > 0) {
    pushWarning(warnings, {
      severity: "danger",
      title: "Narrative tone may overclaim",
      detail: `${aggressiveNarratives} opportunity narrative${aggressiveNarratives === 1 ? "" : "s"} needed softening because evidence, quality or timing pressure was not clean enough.`,
    });
  }

  if (ungroundedOpportunityNarratives > 0) {
    pushWarning(warnings, {
      severity: "warning",
      title: "Thin-source opportunity claims",
      detail: `${ungroundedOpportunityNarratives} opportunity narrative${ungroundedOpportunityNarratives === 1 ? "" : "s"} had fewer than two confirming sources or no concrete trend context.`,
    });
  }

  if (lowEvidenceNarratives > 1) {
    pushWarning(warnings, {
      severity: "warning",
      title: "Evidence density is light",
      detail: `${lowEvidenceNarratives} narrative${lowEvidenceNarratives === 1 ? "" : "s"} contain fewer than two evidence bullets. Keep these in review mode.`,
    });
  }

  if (input.overallWarnings.length >= 4) {
    pushWarning(warnings, {
      severity: "info",
      title: "Brief has warning pressure",
      detail: `${input.overallWarnings.length} upstream warning${input.overallWarnings.length === 1 ? "" : "s"} are active. This should reduce confidence in aggressive recommendations.`,
    });
  }

  if (actNowCount > 2) {
    pushWarning(warnings, {
      severity: "danger",
      title: "Too many Act Now items for a daily brief",
      detail: `${actNowCount} Act Now items are visible. Daily Brief should usually force one primary lane, not a shopping list of urgency.`,
    });
  }

  let status: DailyBriefQaStatus = "healthy";
  if (aggressiveNarratives > 0 || actNowCount > 2) {
    status = "too_aggressive";
  } else if (warnings.some((warning) => warning.severity === "warning")) {
    status = "review";
  } else if (
    totalNarratives > 0 &&
    highConfidenceNarratives === 0 &&
    input.topPriorityActions.length > 0 &&
    evidenceDensity >= 70
  ) {
    status = "too_cautious";
  }

  const qa: DailyBriefQaSummary = {
    status,
    statusLabel: qaStatusLabel(status),
    generatedAt: new Date().toISOString(),
    totalNarratives,
    highConfidenceNarratives,
    lowEvidenceNarratives,
    aggressiveNarratives,
    ungroundedOpportunityNarratives,
    calibratedNarratives,
    averageNarrativeConfidence,
    postureConfidence: input.narratives[0]?.confidence ?? 0,
    evidenceDensity,
    actionabilityScore,
    actNowShare: percent(
      actNowCount,
      Math.max(1, input.topPriorityActions.length),
    ),
    warnings,
    tuningNotes: buildTuningNotes({
      status,
      actNowCount,
      lowEvidenceNarratives,
      aggressiveNarratives,
      ungroundedOpportunityNarratives,
      averageNarrativeConfidence,
    }),
    narrativeAdjustments: adjustments,
  };

  return { narratives, qa };
}
