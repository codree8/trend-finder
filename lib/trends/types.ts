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

export type LatestScanStatus = {
  status: string;
  summary: string | null;
  createdAt: string | null;
  totalSignals: number;
  topicClusters: number;
  snapshotsCreated: number;
  failedSources: number;
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
  };
};

export type DashboardTrendsErrorResponse = {
  ok: false;
  message: string;
  error?: string;
};
