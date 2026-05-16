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

export type TopicQualityNoiseRisk = "low" | "medium" | "high";

export type TopicQualityClarity = "clear" | "needs_review" | "vague";

export type TopicQualitySourceTrustLevel = "strong" | "mixed" | "weak";

export type TopicQualityGateStatus = "pass" | "watch" | "suppress";

export type TopicQuality = {
  score: number;
  gateStatus: TopicQualityGateStatus;
  noiseRisk: TopicQualityNoiseRisk;
  topicClarity: TopicQualityClarity;
  isGenericTopic: boolean;
  isActionableTrend: boolean;
  sourceTrustLevel: TopicQualitySourceTrustLevel;
  explanation: string;
  metrics: {
    titleSpecificity: number;
    sourceTrust: number;
    crossSourceConfirmation: number;
    signalQuality: number;
    actionability: number;
    freshness: number;
    genericPenalty: number;
    contentPatternPenalty: number;
    singleSourcePenalty: number;
    saturationNoisePenalty: number;
    stalenessPenalty: number;
  };
  positiveSignals: string[];
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
  topicQuality: TopicQuality;
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

export type SavedTrend = {
  id: number;
  trendKey: string;
  trendSlug: string;
  topic: string;
  savedAt: string;
  lastSeenScore: number;
  lastSeenCreatorOpportunityScore: number;
  lastSeenQualityScore: number;
  lastSeenLifecycleStatus: TrendLifecycleStatus | string | null;
  lastSeenMentionCount: number;
  lastSeenSourceCount: number;
  lastSeenTotalEngagement: number;
  lastSeenAt: string | null;
  note: string | null;
  tags: string[];
};

export type WatchlistStatus =
  | "rising"
  | "stable"
  | "cooling"
  | "attention"
  | "stale";

export type WatchlistDelta = {
  scoreDelta: number;
  creatorOpportunityDelta: number;
  qualityDelta: number;
  mentionDelta: number;
  sourceDelta: number;
  engagementDelta: number;
  newSignalsCount: number;
  hasEvidenceBaseline: boolean;
  lifecycleChanged: boolean;
  previousLifecycleStatus: TrendLifecycleStatus | string | null;
  currentLifecycleStatus: TrendLifecycleStatus | string | null;
  lastSeenChangedAt: string | null;
  watchStatus: WatchlistStatus;
  watchStatusLabel: string;
  summary: string;
  recommendedAction: string;
  drivers: string[];
  warnings: string[];
};

export type SavedTrendWithCurrent = SavedTrend & {
  currentTrend: DashboardTrend | null;
  currentScore: number;
  currentCreatorOpportunityScore: number;
  currentQualityScore: number;
  currentLifecycleStatus: TrendLifecycleStatus | string | null;
  lastSignalAgeHours: number | null;
  delta: WatchlistDelta;
};

export type WatchlistResponse = {
  ok: true;
  window: DashboardWindow;
  generatedAt: string;
  items: SavedTrendWithCurrent[];
};

export type WatchlistMutationResponse = {
  ok: true;
  item?: SavedTrendWithCurrent;
  trendKey?: string;
};

export type WatchlistErrorResponse = {
  ok: false;
  message: string;
  error?: string;
};

export type TrendActionPriority = "act_now" | "monitor" | "review" | "ignore";

export type TrendActionUrgencyLevel = "high" | "medium" | "low";

export type TrendActionConfidence = "high" | "medium" | "low";

export type TrendActionScoreBand =
  | "strong"
  | "qualified"
  | "borderline"
  | "weak";

export type TrendActionCalibration = {
  scoreBand: TrendActionScoreBand;
  decisionConfidence: TrendActionConfidence;
  isBlockedFromActNow: boolean;
  actNowBlockers: string[];
  promotionSignals: string[];
  demotionSignals: string[];
  tuningNotes: string[];
};

export type TrendActionRecommendation = {
  actionPriority: TrendActionPriority;
  actionPriorityLabel: string;
  actionScore: number;
  urgencyLevel: TrendActionUrgencyLevel;
  summary: string;
  recommendedNextStep: string;
  reasons: string[];
  warnings: string[];
  calibration: TrendActionCalibration;
};

export type ActionQueueItem = TrendActionRecommendation & {
  trend: DashboardTrend;
  isSaved: boolean;
  watchlistItem: SavedTrendWithCurrent | null;
};

export type ActionQueueSummary = {
  actNow: number;
  monitor: number;
  review: number;
  ignore: number;
  highUrgency: number;
};

export type ActionQueueQaStatus = "healthy" | "review" | "too_aggressive";

export type ActionQueueQaWarning = {
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
};

export type ActionQueueQaSummary = {
  status: ActionQueueQaStatus;
  statusLabel: string;
  generatedAt: string;
  totalItems: number;
  actNowShare: number;
  reviewShare: number;
  ignoreShare: number;
  averageActionScore: number;
  averageConfidenceScore: number;
  highConfidenceCount: number;
  blockedActNowCandidates: number;
  highRiskActNowCount: number;
  singleSourceActNowCount: number;
  savedItemsCount: number;
  risingSavedItemsCount: number;
  warnings: ActionQueueQaWarning[];
  tuningNotes: string[];
};

export type ActionQueueResponse = {
  ok: true;
  window: DashboardWindow;
  generatedAt: string;
  summary: ActionQueueSummary;
  qa: ActionQueueQaSummary;
  items: ActionQueueItem[];
};

export type ActionQueueErrorResponse = {
  ok: false;
  message: string;
  error?: string;
};

export type DailyBriefExecutiveSummary = {
  headline: string;
  narrative: string;
  bullets: string[];
};

export type DailyBriefRadarStats = {
  totalTrends: number;
  actNow: number;
  monitor: number;
  hiddenGems: number;
  creatorOpportunities: number;
  watchlistMoving: number;
  watchlistNeedsAttention: number;
  topicsToAvoid: number;
  sourceCoverageLabel: string;
  latestScanAt: string | null;
};

export type DailyBriefAvoidSeverity =
  | "noise"
  | "stale"
  | "saturated"
  | "generic"
  | "weak_signal";

export type DailyBriefTopicToAvoid = {
  trend: DashboardTrend;
  severity: DailyBriefAvoidSeverity;
  reason: string;
  warnings: string[];
};

export type DailyBriefRecommendedFocus = {
  focusToday: string;
  monitor: string;
  avoid: string;
  rationale: string[];
};

export type DailyBriefResponse = {
  ok: true;
  window: DashboardWindow;
  generatedAt: string;
  executiveSummary: DailyBriefExecutiveSummary;
  radarStats: DailyBriefRadarStats;
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGemsWorthWatching: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
  overallWarnings: string[];
  recommendedFocus: DailyBriefRecommendedFocus;
  savedTrendKeys: string[];
  savedTrends: SavedTrendWithCurrent[];
};

export type DailyBriefErrorResponse = {
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
  topicQuality: TopicQuality;
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
