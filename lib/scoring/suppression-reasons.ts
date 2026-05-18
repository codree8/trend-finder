import type { TrendVisibilityReasonCode } from "@/lib/trends/types";

export const trendVisibilityReasonLabels: Record<
  TrendVisibilityReasonCode,
  string
> = {
  strong_composite_signal: "Strong composite signal",
  priority_signal: "Priority signal",
  watchable_signal: "Watchable signal",
  research_only_signal: "Research-only signal",
  early_hidden_gem_exception: "Early hidden-gem exception",
  low_composite_score: "Low composite score",
  weak_source_coverage: "Weak source coverage",
  weak_topic_quality: "Weak topic quality",
  high_noise_risk: "High noise risk",
  quality_gate_suppressed: "Quality gate suppressed it",
  stale_or_dormant: "Stale or dormant signal",
  too_saturated: "Too saturated for early action",
  evidence_action_blocked: "Evidence-to-action blocked",
  validation_ignored: "Validation ignored it",
  no_usable_evidence: "No usable evidence",
  generic_or_vague_topic: "Generic or vague topic",
};

export function reasonLabel(code: TrendVisibilityReasonCode) {
  return trendVisibilityReasonLabels[code];
}
