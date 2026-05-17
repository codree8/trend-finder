export type ConnectorReadinessStatus =
  | "active"
  | "configured-disabled"
  | "missing-key"
  | "not-implemented"
  | "optional-token-missing";

export type ConnectorReadinessStage = "active" | "review" | "disabled";

export type ConnectorReadinessItem = {
  id: string;
  name: string;
  category: "code" | "community" | "editorial" | "video" | "social" | "research";
  status: ConnectorReadinessStatus;
  stage: ConnectorReadinessStage;
  active: boolean;
  configured: boolean;
  enabled: boolean;
  modelSupported: boolean;
  implemented: boolean;
  missingEnvVars: string[];
  reliabilityScore: number;
  quotaNote?: string;
  note: string;
};

export type ConnectorReadinessSummary = {
  activeCount: number;
  implementedCount: number;
  configuredCount: number;
  enabledOptionalCount: number;
  missingRequiredConfigCount: number;
  disabledCount: number;
  activeSources: string[];
  inactiveSupportedSources: string[];
  warnings: string[];
  items: ConnectorReadinessItem[];
};

function envFlag(name: string, fallback = false) {
  const value = process.env[name];
  if (value == null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on", "enabled"].includes(
    value.trim().toLowerCase(),
  );
}

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function item(args: Omit<ConnectorReadinessItem, "configured"> & { configured?: boolean }): ConnectorReadinessItem {
  return {
    ...args,
    configured: args.configured ?? args.missingEnvVars.length === 0,
  };
}

export function isYouTubeConnectorEnabled() {
  return envFlag("ENABLE_YOUTUBE_CONNECTOR", false);
}

export function hasYouTubeApiKey() {
  return hasEnv("YOUTUBE_API_KEY");
}

export function shouldUseYouTubeConnector() {
  return isYouTubeConnectorEnabled() && hasYouTubeApiKey();
}

export function getConnectorReadinessItems(): ConnectorReadinessItem[] {
  const githubHasToken = hasEnv("GITHUB_TOKEN");
  const youtubeEnabled = isYouTubeConnectorEnabled();
  const youtubeConfigured = hasYouTubeApiKey();
  const redditEnabled = envFlag("ENABLE_REDDIT_CONNECTOR", false);
  const redditConfigured = hasEnv("REDDIT_CLIENT_ID") && hasEnv("REDDIT_CLIENT_SECRET");

  return [
    item({
      id: "github",
      name: "GitHub",
      category: "code",
      status: githubHasToken ? "active" : "optional-token-missing",
      stage: githubHasToken ? "active" : "review",
      active: true,
      enabled: true,
      modelSupported: true,
      implemented: true,
      missingEnvVars: githubHasToken ? [] : ["GITHUB_TOKEN"],
      reliabilityScore: githubHasToken ? 88 : 74,
      note: githubHasToken
        ? "Active with token-backed GitHub API access."
        : "Active without token, but GitHub may rate-limit harder. Add GITHUB_TOKEN for cleaner scans.",
    }),
    item({
      id: "hacker-news",
      name: "Hacker News",
      category: "community",
      status: "active",
      stage: "active",
      active: true,
      enabled: true,
      modelSupported: true,
      implemented: true,
      missingEnvVars: [],
      reliabilityScore: 82,
      note: "Active through the Algolia HN search API. No local secret required.",
    }),
    item({
      id: "rss",
      name: "RSS",
      category: "editorial",
      status: "active",
      stage: "active",
      active: true,
      enabled: true,
      modelSupported: true,
      implemented: true,
      missingEnvVars: [],
      reliabilityScore: 78,
      note: "Active through configured RSS/blog feeds. Feed availability can vary by publisher.",
    }),
    item({
      id: "youtube",
      name: "YouTube",
      category: "video",
      status: youtubeEnabled
        ? youtubeConfigured
          ? "active"
          : "missing-key"
        : youtubeConfigured
          ? "configured-disabled"
          : "configured-disabled",
      stage: youtubeEnabled && youtubeConfigured ? "active" : "disabled",
      active: youtubeEnabled && youtubeConfigured,
      enabled: youtubeEnabled,
      modelSupported: true,
      implemented: true,
      missingEnvVars: youtubeConfigured ? [] : ["YOUTUBE_API_KEY"],
      reliabilityScore: youtubeEnabled && youtubeConfigured ? 66 : 0,
      quotaNote: "Uses search.list sparingly, then videos.list for stats enrichment.",
      note: youtubeEnabled
        ? youtubeConfigured
          ? "Active. Video search is quota-aware and limited per scan."
          : "Feature flag is on, but YOUTUBE_API_KEY is missing. Scanner will skip YouTube safely."
        : youtubeConfigured
          ? "API key exists, but ENABLE_YOUTUBE_CONNECTOR is not enabled."
          : "Implemented but disabled by default. Add a key and enable the feature flag when ready.",
    }),
    item({
      id: "reddit",
      name: "Reddit",
      category: "social",
      status: redditEnabled && redditConfigured ? "not-implemented" : "not-implemented",
      stage: "disabled",
      active: false,
      enabled: redditEnabled,
      configured: redditConfigured,
      modelSupported: true,
      implemented: false,
      missingEnvVars: redditConfigured
        ? []
        : ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"],
      reliabilityScore: 0,
      note: "Supported by the scoring model but intentionally not active yet. Implement later with read-only OAuth and strict rate limits.",
    }),
    item({
      id: "arxiv",
      name: "arXiv",
      category: "research",
      status: "not-implemented",
      stage: "disabled",
      active: false,
      enabled: false,
      modelSupported: true,
      implemented: false,
      missingEnvVars: [],
      reliabilityScore: 0,
      note: "Supported by the source quality model, but no connector is wired into scan orchestration yet.",
    }),
  ];
}

export function getConnectorReadinessSummary(): ConnectorReadinessSummary {
  const items = getConnectorReadinessItems();
  const activeItems = items.filter((source) => source.active);
  const implementedItems = items.filter((source) => source.implemented);
  const configuredItems = items.filter((source) => source.configured);
  const missingRequiredConfigItems = items.filter(
    (source) => source.enabled && source.implemented && !source.configured,
  );
  const disabledItems = items.filter((source) => !source.active);
  const warnings = [
    ...missingRequiredConfigItems.map(
      (source) => `${source.name} is enabled but missing ${source.missingEnvVars.join(", ")}.`,
    ),
    ...items
      .filter((source) => source.status === "optional-token-missing")
      .map((source) => `${source.name} is active, but optional token configuration would improve reliability.`),
  ];

  return {
    activeCount: activeItems.length,
    implementedCount: implementedItems.length,
    configuredCount: configuredItems.length,
    enabledOptionalCount: items.filter((source) => source.enabled && source.implemented).length,
    missingRequiredConfigCount: missingRequiredConfigItems.length,
    disabledCount: disabledItems.length,
    activeSources: activeItems.map((source) => source.name),
    inactiveSupportedSources: disabledItems
      .filter((source) => source.modelSupported)
      .map((source) => source.name),
    warnings,
    items,
  };
}
