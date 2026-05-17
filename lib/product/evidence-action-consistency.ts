import type {
  DashboardTrend,
  EvidenceActionAlignmentCheck,
  EvidenceToActionConsistencyQa,
} from "@/lib/trends/types";

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function check(args: EvidenceActionAlignmentCheck): EvidenceActionAlignmentCheck {
  return args;
}

function statusLabel(status: EvidenceToActionConsistencyQa["status"]) {
  if (status === "clean") return "Clean";
  if (status === "review") return "Review";
  return "Blocked";
}

function productDecisionRank(value: DashboardTrend["productIntelligence"]["classification"]) {
  if (value === "Act") return 3;
  if (value === "Watch") return 2;
  return 1;
}

function validationDecisionRank(value: DashboardTrend["trendValidation"]["decision"]) {
  if (value === "act") return 3;
  if (value === "watch") return 2;
  if (value === "research") return 2;
  if (value === "avoid") return 1;
  return 0;
}

export function buildEvidenceActionConsistencyQa(trend: DashboardTrend): EvidenceToActionConsistencyQa {
  const checks: EvidenceActionAlignmentCheck[] = [];

  const productRank = productDecisionRank(trend.productIntelligence.classification);
  const validationRank = validationDecisionRank(trend.trendValidation.decision);
  const productOverstatesValidation = productRank - validationRank >= 2;
  checks.push(
    check({
      id: "product_validation_alignment",
      label: "Product verdict vs validation",
      status: productOverstatesValidation ? "fail" : productRank > validationRank ? "warn" : "pass",
      detail: productOverstatesValidation
        ? "Product copy is more aggressive than validation state allows."
        : productRank > validationRank
          ? "Product copy is slightly ahead of validation; keep wording cautious."
          : "Product verdict is aligned with validation state.",
    }),
  );

  const staleActMismatch =
    trend.signalAging.status === "stale" && trend.productIntelligence.classification === "Act";
  checks.push(
    check({
      id: "aging_action_alignment",
      label: "Aging vs action",
      status: staleActMismatch ? "fail" : trend.signalAging.status === "cooling" && productRank >= 3 ? "warn" : "pass",
      detail: staleActMismatch
        ? "Stale evidence cannot support an Act recommendation."
        : trend.signalAging.status === "cooling" && productRank >= 3
          ? "Cooling evidence should usually be Watch, not Act."
          : "Action language respects signal age.",
    }),
  );

  const researchMismatch =
    trend.researchSignal.evidenceLevel === "research_only" && trend.productIntelligence.classification === "Act";
  checks.push(
    check({
      id: "research_action_alignment",
      label: "Research caveat vs action",
      status: researchMismatch ? "fail" : trend.researchSignal.confidenceImpact === "caution" && productRank >= 3 ? "warn" : "pass",
      detail: researchMismatch
        ? "Research-only evidence cannot be treated as adoption proof."
        : trend.researchSignal.confidenceImpact === "caution" && productRank >= 3
          ? "Research caveat exists; action wording should stay restrained."
          : "Research caveat is consistent with the decision.",
    }),
  );

  const weakSourceMismatch =
    trend.sourceQuality.singleSourceRisk !== "low" && trend.productIntelligence.classification === "Act";
  checks.push(
    check({
      id: "source_action_alignment",
      label: "Source confidence vs action",
      status: weakSourceMismatch ? "fail" : trend.sourceQuality.crossSourceConfirmationScore < 45 && productRank >= 2 ? "warn" : "pass",
      detail: weakSourceMismatch
        ? "Single-source pressure cannot support a clean Act recommendation."
        : trend.sourceQuality.crossSourceConfirmationScore < 45 && productRank >= 2
          ? "Cross-source evidence is weak; Watch copy should include caveat."
          : "Source confidence matches the decision.",
    }),
  );

  const qualityMismatch =
    (trend.topicQuality.gateStatus === "suppress" || trend.topicQuality.noiseRisk === "high") &&
    productRank >= 2;
  checks.push(
    check({
      id: "quality_action_alignment",
      label: "Quality gate vs action",
      status: qualityMismatch ? "fail" : trend.topicQuality.gateStatus === "watch" && productRank >= 3 ? "warn" : "pass",
      detail: qualityMismatch
        ? "Quality/noise layer blocks Watch-or-Act promotion."
        : trend.topicQuality.gateStatus === "watch" && productRank >= 3
          ? "Quality gate is watch; Act copy should be softened."
          : "Quality gate matches the product decision.",
    }),
  );

  const saturationMismatch = trend.saturation >= 86 && trend.productIntelligence.classification === "Act";
  checks.push(
    check({
      id: "saturation_action_alignment",
      label: "Saturation vs action",
      status: saturationMismatch ? "fail" : trend.saturation >= 72 && productRank >= 3 ? "warn" : "pass",
      detail: saturationMismatch
        ? "A highly saturated trend cannot be promoted as an early opportunity."
        : trend.saturation >= 72 && productRank >= 3
          ? "Saturation is high; action should be angle-specific."
          : "Saturation pressure is reflected correctly.",
    }),
  );

  const failCount = checks.filter((item) => item.status === "fail").length;
  const warnCount = checks.filter((item) => item.status === "warn").length;
  const score = clampScore(100 - failCount * 24 - warnCount * 9);
  const status: EvidenceToActionConsistencyQa["status"] = failCount > 0 ? "blocked" : warnCount > 1 ? "review" : "clean";
  const contradictions = checks
    .filter((item) => item.status !== "pass")
    .map((item) => `${item.label}: ${item.detail}`);
  const recommendedFix =
    status === "clean"
      ? "No consistency fix needed. Product, validation and evidence layers agree."
      : status === "review"
        ? "Keep product copy cautious and prefer Watch/Research wording until the warning checks improve."
        : "Downgrade action wording before showing this as a priority recommendation.";

  return {
    status,
    statusLabel: statusLabel(status),
    score,
    summary:
      status === "clean"
        ? "Evidence and action language are aligned."
        : status === "review"
          ? "Some evidence layers are weaker than the product wording. Review before presenting."
          : "At least one evidence layer contradicts the product action. Do not promote this as-is.",
    contradictions: contradictions.slice(0, 6),
    checks,
    recommendedFix,
  };
}
