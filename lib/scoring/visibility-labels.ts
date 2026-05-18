import type {
  TrendVisibilityDecision,
  TrendVisibilityStatus,
} from "@/lib/trends/types";

export function visibilityStatusLabel(status: TrendVisibilityStatus) {
  if (status === "priority") return "Act on this";
  if (status === "strong") return "Strong enough to act on";
  if (status === "watch") return "Watch this";
  if (status === "research_only") return "Research-only, validate first";
  if (status === "suppressed") return "Too noisy for now";
  return "Rejected signal";
}

export function visibilityDecisionLabel(decision: TrendVisibilityDecision) {
  if (decision === "act") return "Act";
  if (decision === "watch") return "Watch";
  if (decision === "research") return "Research";
  return "Hide";
}
