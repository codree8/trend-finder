import type { ConnectorReadinessItem } from "@/lib/scan/connector-readiness";

export type ConnectorRegressionQaStatus = "pass" | "review" | "blocked";

export type ConnectorRegressionQaCheck = {
  id: string;
  label: string;
  status: ConnectorRegressionQaStatus;
  detail: string;
};

export type ConnectorRegressionQaSummary = {
  status: ConnectorRegressionQaStatus;
  statusLabel: string;
  score: number;
  generatedAt: string;
  checks: ConnectorRegressionQaCheck[];
  warnings: string[];
  recommendedActions: string[];
};

function check(args: ConnectorRegressionQaCheck): ConnectorRegressionQaCheck {
  return args;
}

function statusLabel(status: ConnectorRegressionQaStatus) {
  if (status === "pass") return "Pass";
  if (status === "review") return "Review";
  return "Blocked";
}

function hasItem(items: ConnectorReadinessItem[], id: string) {
  return items.find((item) => item.id === id);
}

export function buildConnectorRegressionQa(items: ConnectorReadinessItem[]): ConnectorRegressionQaSummary {
  const github = hasItem(items, "github");
  const hn = hasItem(items, "hacker-news");
  const rss = hasItem(items, "rss");
  const youtube = hasItem(items, "youtube");
  const reddit = hasItem(items, "reddit");
  const arxiv = hasItem(items, "arxiv");
  const checks: ConnectorRegressionQaCheck[] = [];

  checks.push(
    check({
      id: "core_connectors_active",
      label: "Core connectors active",
      status: github?.active && hn?.active && rss?.active ? "pass" : "blocked",
      detail: github?.active && hn?.active && rss?.active
        ? "GitHub, Hacker News and RSS are active scanner sources."
        : "One of the core scanner sources is not active.",
    }),
  );

  checks.push(
    check({
      id: "youtube_feature_flag_boundary",
      label: "YouTube feature flag boundary",
      status: youtube?.enabled && !youtube.configured ? "blocked" : "pass",
      detail: youtube?.active
        ? "YouTube is active with API key and feature flag."
        : youtube?.enabled && !youtube.configured
          ? "YouTube flag is on but API key is missing; scanner must skip it safely."
          : "YouTube is disabled unless both feature flag and API key are present.",
    }),
  );

  checks.push(
    check({
      id: "arxiv_keyless_boundary",
      label: "arXiv keyless boundary",
      status: arxiv?.implemented ? "pass" : "blocked",
      detail: arxiv?.active
        ? "arXiv is active without a local secret and is treated as research evidence."
        : "arXiv is implemented and can be disabled with ENABLE_ARXIV_CONNECTOR=false.",
    }),
  );

  checks.push(
    check({
      id: "reddit_not_claimed_active",
      label: "Reddit not claimed active",
      status: reddit?.active ? "blocked" : "pass",
      detail: reddit?.active
        ? "Reddit is marked active even though the connector is not implemented."
        : "Reddit remains model-supported but not active. Good: no fake source claim.",
    }),
  );

  const activeMissingConfig = items.filter((item) => item.active && item.status === "missing-key");
  checks.push(
    check({
      id: "no_active_missing_config",
      label: "No active connector missing required config",
      status: activeMissingConfig.length ? "blocked" : "pass",
      detail: activeMissingConfig.length
        ? `${activeMissingConfig.map((item) => item.name).join(", ")} active but missing required config.`
        : "No active connector is missing a required local secret. Optional tokens stay advisory.",
    }),
  );

  const optionalTokenWarnings = items.filter((item) => item.status === "optional-token-missing");
  checks.push(
    check({
      id: "optional_tokens_explained",
      label: "Optional tokens explained",
      status: optionalTokenWarnings.length ? "review" : "pass",
      detail: optionalTokenWarnings.length
        ? `${optionalTokenWarnings.map((item) => item.name).join(", ")} can run without token but may be less reliable.`
        : "No optional-token warning is present.",
    }),
  );

  const implementedButDisabled = items.filter((item) => item.implemented && item.modelSupported && !item.active && item.id !== "reddit");
  checks.push(
    check({
      id: "implemented_disabled_explicit",
      label: "Disabled implemented sources explicit",
      status: implementedButDisabled.every((item) => item.stage === "disabled") ? "pass" : "review",
      detail: implementedButDisabled.length
        ? `${implementedButDisabled.map((item) => item.name).join(", ")} implemented but disabled intentionally. UI should label this clearly.`
        : "Every implemented supported source is active.",
    }),
  );

  const blockedCount = checks.filter((item) => item.status === "blocked").length;
  const reviewCount = checks.filter((item) => item.status === "review").length;
  const score = Math.max(0, Math.round(100 - blockedCount * 28 - reviewCount * 10));
  const status: ConnectorRegressionQaStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "pass";
  const warnings = checks
    .filter((item) => item.status !== "pass")
    .map((item) => `${item.label}: ${item.detail}`);
  const recommendedActions = [
    blockedCount > 0 ? "Fix blocked connector boundaries before trusting scan health." : "",
    optionalTokenWarnings.length ? "Add optional tokens only if rate limits become a real problem." : "",
    youtube?.enabled && !youtube.configured ? "Either add YOUTUBE_API_KEY or turn ENABLE_YOUTUBE_CONNECTOR=false." : "",
    "After changing connector flags, restart the dev server and run a manual scan.",
  ].filter(Boolean);

  return {
    status,
    statusLabel: statusLabel(status),
    score,
    generatedAt: new Date().toISOString(),
    checks,
    warnings,
    recommendedActions,
  };
}
