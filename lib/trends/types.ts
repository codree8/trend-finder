export type DashboardWindow = "24h" | "7d" | "30d";

export type DashboardMode =
  | "All"
  | "Technical"
  | "Creator"
  | "Startup"
  | "Research";

export type TrendStatus =
  | "High Signal"
  | "Rising"
  | "Hidden Gem"
  | "Mainstream"
  | "Volatile";

export type TrendLifecycleStatus =
  | "Emerging"
  | "Accelerating"
  | "Peaking"
  | "Cooling"
  | "Stale"
  | "Dormant";

export type TrendMomentumDirection = "up" | "flat" | "down";

export type TrendLifecycle = {
  status: TrendLifecycleStatus;
  freshnessScore: number;
  momentumDirection: TrendMomentumDirection;
  stalenessRisk: "low" | "medium" | "high";
  latestSignalAgeHours: number | null;
  summary: string;
};

export type CreatorOpportunityLevel = "High" | "Medium" | "Low";

export type CreatorRecommendedTiming =
  | "Act now"
  | "Watch"
  | "Too early"
  | "Too late";

export type CreatorRecommendedFormat =
  | "Practical explainer"
  | "Short analysis"
  | "Deep dive"
  | "Comparison"
  | "Tutorial"
  | "Founder insight"
  | "LinkedIn post"
  | "Carousel";

export type CreatorAudienceFit =
  | "builders"
  | "founders"
  | "marketers"
  | "researchers"
  | "creators"
  | "product teams";

export type CreatorContentRisk = "low" | "medium" | "high";

export type CreatorOpportunity = {
  score: number;
  level: CreatorOpportunityLevel;
  recommendedTiming: CreatorRecommendedTiming;
  recommendedFormat: CreatorRecommendedFormat;
  bestAngle: string;
  audienceFit: CreatorAudienceFit[];
  contentRisk: CreatorContentRisk;
  explanation: string;
  metrics: {
    freshness: number;
    hiddenGem: number;
    creatorGap: number;
    lowSaturation: number;
    sourceCredibility: number;
    lifecycleFit: number;
    crossSourceConfirmation: number;
    topicClarity: number;
    contentAnglePotential: number;
    stalenessPenalty: number;
  };
  drivers: string[];
  warnings: string[];
};

export type DashboardKpi = {
  label: string;
  value: string;
  helper: string;
  delta: string;
};

export type DashboardTopSignal = {
  title: string;
  source: string;
  url: string;
  engagement: number;
};

export type DashboardTrend = {
  id: string;
  topicId: number;
  slug: string;
  topic: string;
  canonicalKey: string;
  aliases: string[];
  relatedLabels: string[];
  mergedTopicCount: number;
  category: string;
  status: TrendStatus;
  summary: string;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  velocity: number;
  saturation: number;
  creatorGap: number;
  sourceDiversity: number;
  mentionCount: number;
  sourceCount: number;
  totalEngagement: number;
  sources: string[];
  whyNow: string;
  contentHook: string;
  topSignals: DashboardTopSignal[];
  lastSeenAt: string;
  lifecycle: TrendLifecycle;
  creatorOpportunity: CreatorOpportunity;
};

export type SourceBreakdownItem = {
  source: string;
  signals: number;
};

export type TrendTimelinePoint = {
  day: string;
  hot: number;
  trend: number;
  baseline: number;
};

export type TrendRadarPoint = {
  axis: string;
  value: number;
};

export type ScanSourceCoverage = {
  scanned: number;
  successful: number;
  withSignals: number;
  failed: number;
  label: string;
};

export type LatestScanStatus = {
  status: string;
  summary: string | null;
  createdAt: string | null;
  totalSignals: number;
  fetchedSignals: number;
  insertedSignals: number;
  skippedDuplicates: number;
  duplicateRate: number;
  topicClusters: number;
  snapshotsCreated: number;
  failedSources: number;
  sourceCoverage: ScanSourceCoverage;
  warnings: string[];
};

export type DashboardTrendsResponse = {
  ok: true;
  window: DashboardWindow;
  generatedAt: string;
  latestScan: LatestScanStatus | null;
  kpis: DashboardKpi[];
  trends: DashboardTrend[];
  hiddenGems: DashboardTrend[];
  signalTable: DashboardTrend[];
  sourceBreakdown: SourceBreakdownItem[];
  timeline: TrendTimelinePoint[];
  radar: TrendRadarPoint[];
  creatorMode: {
    trend: DashboardTrend | null;
    opportunities: DashboardTrend[];
  };
};

export type DashboardTrendsErrorResponse = {
  ok: false;
  message: string;
  error?: string;
};

export type TrendEvidenceType =
  | "early_signal"
  | "cross_source_confirmation"
  | "content_gap"
  | "saturation_warning"
  | "momentum_shift";

export type TrendEvidenceLevel = "strong" | "medium" | "weak" | "warning";

export type TrendEvidenceMetric = {
  label: string;
  value: string;
};

export type TrendSignalQualityTag =
  | "fresh"
  | "repeated_known"
  | "strong_source"
  | "weak_source"
  | "cross_source_confirmation"
  | "old_signal"
  | "stale_evidence"
  | "alias_variation";

export type TrendDetailSignal = DashboardTopSignal & {
  externalId: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  weight: number;
  qualityScore?: number;
  canonicalTopicKey?: string | null;
  matchedAlias?: string | null;
  evidenceTags?: TrendEvidenceType[];
  qualityTags?: TrendSignalQualityTag[];
};

export type TrendEvidenceItem = {
  id: TrendEvidenceType;
  type: TrendEvidenceType;
  title: string;
  label: string;
  level: TrendEvidenceLevel;
  score: number;
  summary: string;
  whyItMatters: string;
  recommendedAction: string;
  metrics: TrendEvidenceMetric[];
  sources: string[];
  supportingSignals: TrendDetailSignal[];
};

export type TrendDetailSnapshot = {
  window: DashboardWindow;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  velocity: number;
  saturation: number;
  sourceDiversity: number;
  mentionCount: number;
  sourceCount: number;
  totalEngagement: number;
  createdAt: string;
};

export type RelatedTrend = {
  topicId: number;
  slug: string;
  topic: string;
  canonicalKey: string;
  aliases: string[];
  relatedLabels: string[];
  mergedTopicCount: number;
  category: string;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
};

export type TrendScoringTransparencyImpact =
  | "positive"
  | "neutral"
  | "negative";

export type TrendScoringTransparencyConfidence = "High" | "Medium" | "Low";

export type TrendScoringTransparencyBreakdownItem = {
  id: string;
  label: string;
  value: number;
  impact: TrendScoringTransparencyImpact;
  description: string;
};

export type TrendScoringTransparency = {
  confidence: TrendScoringTransparencyConfidence;
  confidenceScore: number;
  explanation: string;
  rawTrendScore: number;
  adjustedTrendScore: number;
  freshnessAdjustment: number;
  positiveDrivers: string[];
  negativeDrivers: string[];
  warnings: string[];
  breakdown: TrendScoringTransparencyBreakdownItem[];
  rankingNotes: string[];
};

export type TrendDetailMovement = {
  currentWindow: DashboardWindow;
  currentTrendScore: number;
  dayTrendScore: number | null;
  weekTrendScore: number | null;
  monthTrendScore: number | null;
  dayVsWeek: number | null;
  weekVsMonth: number | null;
};

export type TrendDetailIntelligence = {
  overview: string;
  whyTrending: string;
  hiddenGemReasoning: string;
  contentOpportunity: string;
  saturationRead: string;
  suggestedAngles: string[];
  evidence: TrendEvidenceItem[];
  signals: TrendDetailSignal[];
  relatedTopics: RelatedTrend[];
  movement: TrendDetailMovement;
  lifecycle: TrendLifecycle;
  topicIdentity: {
    canonicalKey: string;
    aliases: string[];
    relatedLabels: string[];
    mergedTopicCount: number;
  };
  scoringTransparency: TrendScoringTransparency;
  creatorOpportunity: CreatorOpportunity;
  snapshots: TrendDetailSnapshot[];
};

export type TrendDetailResponse = {
  ok: true;
  window: DashboardWindow;
  generatedAt: string;
  trend: DashboardTrend;
  intelligence: TrendDetailIntelligence;
};

export type TrendDetailErrorResponse = {
  ok: false;
  message: string;
  error?: string;
};
