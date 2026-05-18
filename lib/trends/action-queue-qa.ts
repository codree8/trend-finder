import type {
  ActionQueueItem,
  ActionQueueQaStatus,
  ActionQueueQaSummary,
  ActionQueueQaWarning,
  TrendActionConfidence,
} from "@/lib/trends/types";

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function confidenceValue(confidence: TrendActionConfidence) {
  if (confidence === "high") return 100;
  if (confidence === "medium") return 64;
  return 32;
}

function pushWarning(
  warnings: ActionQueueQaWarning[],
  warning: ActionQueueQaWarning,
) {
  warnings.push(warning);
}

function statusLabel(status: ActionQueueQaStatus) {
  const labels: Record<ActionQueueQaStatus, string> = {
    healthy: "Healthy calibration",
    review: "Needs review",
    too_aggressive: "Too aggressive",
  };

  return labels[status];
}

export function buildActionQueueQa(
  items: ActionQueueItem[],
): ActionQueueQaSummary {
  const totalItems = items.length;
  const actNowItems = items.filter((item) => item.actionPriority === "act_now");
  const reviewItems = items.filter((item) => item.actionPriority === "review");
  const ignoreItems = items.filter((item) => item.actionPriority === "ignore");
  const blockedActNowCandidates = items.filter(
    (item) =>
      item.actionScore >= 72 &&
      item.actionPriority !== "act_now" &&
      item.calibration.isBlockedFromActNow,
  ).length;
  const highRiskActNowCount = actNowItems.filter(
    (item) =>
      item.calibration.decisionConfidence !== "high" ||
      item.calibration.demotionSignals.length > 2 ||
      item.trend.topicQuality.noiseRisk !== "low" ||
      item.trend.topicQuality.gateStatus !== "pass",
  ).length;
  const singleSourceActNowCount = actNowItems.filter(
    (item) => item.trend.sourceCount < 2,
  ).length;
  const savedItems = items.filter((item) => item.isSaved);
  const risingSavedItems = savedItems.filter(
    (item) => item.watchlistItem?.delta.watchStatus === "rising",
  );
  const actNowShare = percent(actNowItems.length, totalItems);
  const reviewShare = percent(reviewItems.length, totalItems);
  const ignoreShare = percent(ignoreItems.length, totalItems);
  const averageActionScore = average(items.map((item) => item.actionScore));
  const averageConfidenceScore = average(
    items.map((item) => confidenceValue(item.calibration.decisionConfidence)),
  );
  const highConfidenceCount = items.filter(
    (item) => item.calibration.decisionConfidence === "high",
  ).length;
  const warnings: ActionQueueQaWarning[] = [];
  const tuningNotes: string[] = [];

  if (actNowShare > 18 && totalItems >= 12) {
    pushWarning(warnings, {
      severity: "danger",
      title: "Act on this lane may be too loose",
      detail: `${actNowShare}% of visible trends are in Act on this. Keep this lane rare or it stops being a priority signal.`,
    });
  }

  if (highRiskActNowCount > 0) {
    pushWarning(warnings, {
      severity: "danger",
      title: "Risky Act on this candidates detected",
      detail: `${highRiskActNowCount} Act on this item${highRiskActNowCount === 1 ? "" : "s"} still has quality, confidence or warning pressure.`,
    });
  }

  if (singleSourceActNowCount > 0) {
    pushWarning(warnings, {
      severity: "warning",
      title: "Single-source Act on this candidate",
      detail: `${singleSourceActNowCount} Act on this item${singleSourceActNowCount === 1 ? "" : "s"} has fewer than two confirming sources.`,
    });
  }

  if (blockedActNowCandidates > 0) {
    pushWarning(warnings, {
      severity: "info",
      title: "Promotion candidates held back",
      detail: `${blockedActNowCandidates} high-scoring item${blockedActNowCandidates === 1 ? "" : "s"} were blocked from Act on this by calibration rules. That is intentional noise suppression, not a bug.`,
    });
  }

  if (reviewShare > 45 && totalItems >= 10) {
    pushWarning(warnings, {
      severity: "warning",
      title: "Review lane is heavy",
      detail: `${reviewShare}% of trends need manual review. Consider improving source diversity or topic canonicalization if this stays high.`,
    });
  }

  if (ignoreShare > 65 && totalItems >= 10) {
    pushWarning(warnings, {
      severity: "info",
      title: "Most trends are being suppressed",
      detail: `${ignoreShare}% of trends are in Ignore. This can be healthy after noisy scans, but watch it over several days.`,
    });
  }

  if (actNowItems.length === 0 && totalItems > 0) {
    tuningNotes.push(
      "No Act on this items is acceptable; the queue is tuned to prefer false negatives over noisy recommendations.",
    );
  }
  if (blockedActNowCandidates > 0) {
    tuningNotes.push(
      "High-scoring but blocked items should usually sit in Review until quality, freshness or source confirmation improves.",
    );
  }
  if (risingSavedItems.length > 0) {
    tuningNotes.push(
      "Rising saved trends are treated as useful momentum signals, but they still cannot bypass quality and evidence gates.",
    );
  }
  tuningNotes.push(
    "Act on this now requires clean quality, fresh timing, reliable evidence and a strong creator window.",
  );

  let status: ActionQueueQaStatus = "healthy";
  if (actNowShare > 18 || highRiskActNowCount > 0) {
    status = "too_aggressive";
  } else if (warnings.some((warning) => warning.severity === "warning")) {
    status = "review";
  }

  return {
    status,
    statusLabel: statusLabel(status),
    generatedAt: new Date().toISOString(),
    totalItems,
    actNowShare,
    reviewShare,
    ignoreShare,
    averageActionScore,
    averageConfidenceScore,
    highConfidenceCount,
    blockedActNowCandidates,
    highRiskActNowCount,
    singleSourceActNowCount,
    savedItemsCount: savedItems.length,
    risingSavedItemsCount: risingSavedItems.length,
    warnings,
    tuningNotes,
  };
}
