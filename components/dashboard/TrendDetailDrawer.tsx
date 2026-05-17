"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  Compass,
  ExternalLink,
  Gauge,
  Layers3,
  Lightbulb,
  Link2,
  Loader2,
  Radar,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import {
  productPreferencesChangedEvent,
  readPreferredWorkspaceView,
  type WorkspaceView,
} from "@/lib/preferences/product-preferences";
import { buildTrendActionRecommendation } from "@/lib/trends/action-priority";
import type {
  CreatorContentRisk,
  CreatorOpportunity,
  CreatorOpportunityLevel,
  CreatorRecommendedTiming,
  DashboardTrend,
  DashboardWindow,
  RelatedTrend,
  SavedTrendWithCurrent,
  TopicQuality,
  TrendActionConfidence,
  TrendActionPriority,
  TrendActionRecommendation,
  TrendActionScoreBand,
  TrendActionUrgencyLevel,
  TrendDetailResponse,
  TrendDetailSignal,
  TrendDetailSnapshot,
  TrendEvidenceItem,
  TrendEvidenceLevel,
  TrendEvidenceType,
  TrendScoringTransparency,
  TrendScoringTransparencyBreakdownItem,
  TrendScoringTransparencyConfidence,
  TrendScoringTransparencyImpact,
  TrendSignalQualityTag,
  TrendSourceEvidenceGroup,
  TrendSourceEvidenceInspector,
  TrendSourceEvidenceSignal,
  TrendSourceEvidenceVerdict,
  WatchlistStatus,
} from "@/lib/trends/types";

type Props = {
  slug: string | null;
  selectedWindow: DashboardWindow;
  initialTrend?: DashboardTrend | null;
  savedTrendKeys?: ReadonlySet<string>;
  savedTrends?: SavedTrendWithCurrent[];
  onSavedChange?: (trendKey: string, isSaved: boolean) => void;
  onClose: () => void;
  onSelectSlug: (slug: string) => void;
};

type DetailState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: TrendDetailResponse; error: null }
  | { status: "error"; data: null; error: string };

const evidenceLabels: Record<TrendEvidenceType, string> = {
  early_signal: "Early",
  cross_source_confirmation: "Confirmed",
  content_gap: "Content gap",
  saturation_warning: "Saturation",
  momentum_shift: "Momentum",
};

const qualityLabels: Record<TrendSignalQualityTag, string> = {
  fresh: "Fresh",
  repeated_known: "Known",
  strong_source: "Strong source",
  weak_source: "Weak source",
  cross_source_confirmation: "Cross-source",
  old_signal: "Old",
  stale_evidence: "Stale",
  alias_variation: "Alias",
};

function evidenceTone(level: TrendEvidenceLevel) {
  if (level === "warning") {
    return {
      badge: "danger" as const,
      border: "border-primary/35",
      text: "text-red-100",
      icon: AlertTriangle,
    };
  }

  if (level === "strong") {
    return {
      badge: "secondary" as const,
      border: "border-secondary/30",
      text: "text-secondary",
      icon: CheckCircle2,
    };
  }

  if (level === "medium") {
    return {
      badge: "accent" as const,
      border: "border-accent/20",
      text: "text-accent",
      icon: Compass,
    };
  }

  return {
    badge: "muted" as const,
    border: "border-border/10",
    text: "text-muted-foreground",
    icon: Radar,
  };
}

function evidenceLabel(tag: TrendEvidenceType) {
  return evidenceLabels[tag] ?? tag;
}

function qualityLabel(tag: TrendSignalQualityTag) {
  return qualityLabels[tag] ?? tag;
}

function qualityVariant(tag: TrendSignalQualityTag) {
  if (tag === "fresh" || tag === "strong_source") return "secondary" as const;
  if (tag === "weak_source" || tag === "stale_evidence")
    return "danger" as const;
  if (tag === "cross_source_confirmation" || tag === "alias_variation")
    return "accent" as const;
  return "muted" as const;
}

function watchlistStatusVariant(status: WatchlistStatus) {
  if (status === "rising") return "secondary" as const;
  if (status === "stable") return "muted" as const;
  if (status === "cooling") return "accent" as const;
  return "danger" as const;
}

function watchlistStatusIcon(status: WatchlistStatus) {
  if (status === "rising") return TrendingUp;
  if (status === "cooling") return AlertTriangle;
  if (status === "attention") return ShieldAlert;
  if (status === "stale") return Clock3;
  return Gauge;
}

function actionPriorityVariant(priority: TrendActionPriority) {
  if (priority === "act_now") return "secondary" as const;
  if (priority === "monitor") return "accent" as const;
  if (priority === "review") return "default" as const;
  return "danger" as const;
}

function actionUrgencyVariant(urgency: TrendActionUrgencyLevel) {
  if (urgency === "high") return "danger" as const;
  if (urgency === "medium") return "accent" as const;
  return "muted" as const;
}

function actionConfidenceVariant(confidence: TrendActionConfidence) {
  if (confidence === "high") return "secondary" as const;
  if (confidence === "medium") return "accent" as const;
  return "danger" as const;
}

function actionScoreBandLabel(band: TrendActionScoreBand) {
  const labels: Record<TrendActionScoreBand, string> = {
    strong: "Strong band",
    qualified: "Qualified band",
    borderline: "Borderline band",
    weak: "Weak band",
  };

  return labels[band];
}

function actionPriorityIcon(priority: TrendActionPriority) {
  if (priority === "act_now") return Target;
  if (priority === "monitor") return Radar;
  if (priority === "review") return ShieldAlert;
  return AlertTriangle;
}

function formatSignedDelta(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function confidenceVariant(confidence: TrendScoringTransparencyConfidence) {
  if (confidence === "High") return "secondary" as const;
  if (confidence === "Medium") return "accent" as const;
  return "danger" as const;
}

function confidenceTone(confidence: TrendScoringTransparencyConfidence) {
  if (confidence === "High") return "text-secondary";
  if (confidence === "Medium") return "text-accent";
  return "text-primary";
}

function impactVariant(impact: TrendScoringTransparencyImpact) {
  if (impact === "positive") return "secondary" as const;
  if (impact === "negative") return "danger" as const;
  return "muted" as const;
}

function impactLabel(impact: TrendScoringTransparencyImpact) {
  if (impact === "positive") return "+ driver";
  if (impact === "negative") return "- pressure";
  return "neutral";
}

function impactBarClass(impact: TrendScoringTransparencyImpact) {
  if (impact === "positive") return "bg-secondary";
  if (impact === "negative") return "bg-primary";
  return "bg-muted-foreground/45";
}

function formatDate(value: string | null) {
  if (!value) return "Stored signal";

  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMovement(value: number | null) {
  if (value === null) return "n/a";
  if (value > 0) return `+${value}`;
  return String(value);
}

function movementTone(value: number | null) {
  if (value === null) return "text-muted-foreground/65";
  if (value > 0) return "text-secondary";
  if (value < 0) return "text-primary";
  return "text-muted-foreground/75";
}

function scoreTone(value: number) {
  if (value >= 78) return "text-secondary";
  if (value >= 60) return "text-foreground";
  return "text-muted-foreground/75";
}

function opportunityVariant(level: CreatorOpportunityLevel) {
  if (level === "High") return "secondary" as const;
  if (level === "Medium") return "accent" as const;
  return "muted" as const;
}

function timingVariant(timing: CreatorRecommendedTiming) {
  if (timing === "Act now") return "secondary" as const;
  if (timing === "Watch") return "accent" as const;
  if (timing === "Too late") return "danger" as const;
  return "muted" as const;
}

function riskVariant(risk: CreatorContentRisk) {
  if (risk === "low") return "secondary" as const;
  if (risk === "medium") return "accent" as const;
  return "danger" as const;
}

function topicQualityGateVariant(gateStatus: TopicQuality["gateStatus"]) {
  if (gateStatus === "pass") return "secondary" as const;
  if (gateStatus === "watch") return "accent" as const;
  return "danger" as const;
}

function topicNoiseVariant(noiseRisk: TopicQuality["noiseRisk"]) {
  if (noiseRisk === "low") return "secondary" as const;
  if (noiseRisk === "medium") return "accent" as const;
  return "danger" as const;
}

function topicQualityTone(quality: TopicQuality) {
  if (quality.gateStatus === "pass") return "text-secondary";
  if (quality.gateStatus === "watch") return "text-accent";
  return "text-primary";
}

function buildChartData(snapshots: TrendDetailSnapshot[]) {
  return snapshots.slice(-18).map((snapshot) => ({
    label: new Date(snapshot.createdAt).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    window: snapshot.window,
    trend: snapshot.trendScore,
    hiddenGem: snapshot.hiddenGemScore,
    content: snapshot.contentScore,
  }));
}

function fallbackTrendTitle(initialTrend: DashboardTrend | null | undefined) {
  return initialTrend?.topic ?? "Trend intelligence";
}

function SignalLink({ signal }: { signal: TrendDetailSignal }) {
  return (
    <a
      href={signal.url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-2xl border border-border/10 bg-muted/35 p-4 transition hover:border-secondary/35 hover:bg-muted/55"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="muted">{signal.source}</Badge>
          {signal.qualityTags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant={qualityVariant(tag)} className="px-2">
              {qualityLabel(tag)}
            </Badge>
          ))}
          {signal.evidenceTags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="px-2">
              {evidenceLabel(tag)}
            </Badge>
          ))}
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/55 transition group-hover:text-secondary" />
      </div>
      <p className="text-sm font-medium leading-6 text-foreground">
        {signal.title}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground/65">
        <span>{signal.engagement} engagement</span>
        <span>·</span>
        <span>{formatDate(signal.publishedAt ?? signal.createdAt)}</span>
        {signal.matchedAlias ? (
          <>
            <span>·</span>
            <span>alias: {signal.matchedAlias}</span>
          </>
        ) : null}
      </div>
    </a>
  );
}

function RelatedTopicButton({
  topic,
  onSelect,
}: {
  topic: RelatedTrend;
  onSelect: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(topic.slug)}
      className="w-full rounded-2xl border border-border/10 bg-[#160d0d]/38 p-4 text-left transition hover:border-secondary/35 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold leading-5 text-foreground">
            {topic.topic}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/65">
            {topic.category}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-secondary" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <span className="rounded-xl bg-muted/45 px-2 py-2">
          <strong className="block text-foreground">{topic.trendScore}</strong>
          Trend
        </span>
        <span className="rounded-xl bg-muted/45 px-2 py-2">
          <strong className="block text-secondary">
            {topic.hiddenGemScore}
          </strong>
          Gem
        </span>
        <span className="rounded-xl bg-muted/45 px-2 py-2">
          <strong className="block text-foreground">
            {topic.contentScore}
          </strong>
          Content
        </span>
      </div>
    </button>
  );
}

export function TrendDetailDrawer({
  slug,
  selectedWindow,
  initialTrend,
  savedTrendKeys,
  savedTrends = [],
  onSavedChange,
  onClose,
  onSelectSlug,
}: Props) {
  const [detailState, setDetailState] = useState<DetailState>({
    status: "idle",
    data: null,
    error: null,
  });
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("product");

  useEffect(() => {
    function handlePreferenceChange() {
      setWorkspaceView(readPreferredWorkspaceView());
    }

    handlePreferenceChange();
    window.addEventListener(productPreferencesChangedEvent, handlePreferenceChange);
    window.addEventListener("storage", handlePreferenceChange);
    return () => {
      window.removeEventListener(productPreferencesChangedEvent, handlePreferenceChange);
      window.removeEventListener("storage", handlePreferenceChange);
    };
  }, []);

  useEffect(() => {
    if (!slug) {
      setDetailState({ status: "idle", data: null, error: null });
      return;
    }

    const activeSlug = slug;
    let cancelled = false;

    async function loadDetail() {
      setDetailState({ status: "loading", data: null, error: null });

      try {
        const response = await fetch(
          `/api/trends/${encodeURIComponent(activeSlug)}?window=${selectedWindow}`,
          { cache: "no-store" },
        );
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message ?? "Failed to load trend detail.");
        }

        if (!cancelled) {
          setDetailState({
            status: "success",
            data: payload as TrendDetailResponse,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setDetailState({
            status: "error",
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load trend detail.",
          });
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedWindow, slug]);

  useEffect(() => {
    if (!slug) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, slug]);

  const detail = detailState.status === "success" ? detailState.data : null;
  const trend = detail?.trend ?? initialTrend ?? null;
  const watchlistItem = useMemo(() => {
    if (!trend) return null;

    const trendKey = (trend.canonicalKey || trend.id).toLowerCase();
    return (
      savedTrends.find(
        (item) =>
          item.trendKey === trendKey ||
          item.trendSlug === trend.slug ||
          item.currentTrend?.slug === trend.slug,
      ) ?? null
    );
  }, [savedTrends, trend]);
  const actionRecommendation = useMemo(() => {
    if (!trend) return null;

    return buildTrendActionRecommendation({
      trend,
      watchlistItem,
    });
  }, [trend, watchlistItem]);
  const chartData = useMemo(
    () => buildChartData(detail?.intelligence.snapshots ?? []),
    [detail?.intelligence.snapshots],
  );
  const isOpen = Boolean(slug);
  const showAdminDiagnostics = workspaceView === "admin";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close trend intelligence drawer"
        className="absolute inset-0 bg-[#080404]/72 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-border/10 bg-[#1b1010] shadow-[0_0_80px_rgba(0,0,0,0.55)] md:rounded-l-[2rem]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(166,13,14,0.22),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(221,169,54,0.12),transparent_30%)]" />

        <header className="relative border-b border-border/10 bg-card/58 p-5 backdrop-blur md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
                Trend Intelligence View
              </p>
              <h2 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.03em] text-foreground md:text-3xl">
                {trend?.topic ?? fallbackTrendTitle(initialTrend)}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/70">
                {trend ? (
                  <Badge variant="secondary">{trend.category}</Badge>
                ) : null}
                {trend ? <Badge variant="muted">{trend.status}</Badge> : null}
                <span className="rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
                  Window:{" "}
                  <strong className="text-secondary">{selectedWindow}</strong>
                </span>
                {trend ? (
                  <WatchlistButton
                    trend={trend}
                    isSaved={Boolean(
                      savedTrendKeys?.has(trend.canonicalKey.toLowerCase()),
                    )}
                    selectedWindow={selectedWindow}
                    onSavedChange={onSavedChange}
                    size="sm"
                  />
                ) : null}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto p-5 md:p-6">
          {detailState.status === "loading" ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-border/10 bg-card/50 text-sm text-muted-foreground/75">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-secondary" />
              Loading trend intelligence...
            </div>
          ) : null}

          {detailState.status === "error" ? (
            <div className="rounded-3xl border border-primary/30 bg-primary/10 p-5 text-sm leading-6 text-red-100">
              {detailState.error}
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-5">
              <section className="grid gap-3 md:grid-cols-4">
                <ScoreCard
                  label="Trend"
                  value={detail.trend.trendScore}
                  icon={TrendingUp}
                />
                <ScoreCard
                  label="Hidden Gem"
                  value={detail.trend.hiddenGemScore}
                  icon={Sparkles}
                />
                <ScoreCard
                  label="Content"
                  value={detail.trend.contentScore}
                  icon={Lightbulb}
                />
                <ScoreCard
                  label="Velocity"
                  value={detail.trend.velocity}
                  icon={Radar}
                />
              </section>

              {watchlistItem ? (
                <WatchlistDeltaSection item={watchlistItem} />
              ) : null}

              {actionRecommendation ? (
                <ActionPrioritySection
                  recommendation={actionRecommendation}
                  trend={detail.trend}
                />
              ) : null}

              <SignalAgingSection trend={detail.trend} showAdminDiagnostics={showAdminDiagnostics} />

              <ValidationConsistencySection trend={detail.trend} showAdminDiagnostics={showAdminDiagnostics} />

              <ProductTrendDecisionSection trend={detail.trend} showAdminDiagnostics={showAdminDiagnostics} />

              <SourceEvidenceInspectorSection
                inspector={detail.intelligence.sourceEvidenceInspector}
                showAdminDiagnostics={showAdminDiagnostics}
              />

              <section className="rounded-3xl border border-border/10 bg-card/72 p-5 shadow-card">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Compass className="h-4 w-4" />
                  Trend lifecycle & freshness
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <MovementCard
                    label="Lifecycle"
                    value={detail.intelligence.lifecycle.status}
                    helper="current phase"
                  />
                  <MovementCard
                    label="Freshness"
                    value={String(detail.intelligence.lifecycle.freshnessScore)}
                    helper="fresh signal score"
                  />
                  <MovementCard
                    label="Momentum"
                    value={detail.intelligence.lifecycle.momentumDirection}
                    helper="direction"
                    className={
                      detail.intelligence.lifecycle.momentumDirection === "up"
                        ? "text-secondary"
                        : detail.intelligence.lifecycle.momentumDirection ===
                            "down"
                          ? "text-primary"
                          : "text-muted-foreground/80"
                    }
                  />
                  <MovementCard
                    label="Stale risk"
                    value={detail.intelligence.lifecycle.stalenessRisk}
                    helper="priority risk"
                    className={
                      detail.intelligence.lifecycle.stalenessRisk === "high"
                        ? "text-primary"
                        : detail.intelligence.lifecycle.stalenessRisk ===
                            "medium"
                          ? "text-accent"
                          : "text-secondary"
                    }
                  />
                </div>
                <p className="mt-4 rounded-2xl border border-border/10 bg-muted/35 p-4 text-sm leading-6 text-muted-foreground/78">
                  {detail.intelligence.lifecycle.summary}
                </p>
              </section>

              {showAdminDiagnostics ? (
                <TopicQualitySection quality={detail.intelligence.topicQuality} />
              ) : null}

              <CreatorOpportunitySection
                opportunity={detail.intelligence.creatorOpportunity}
              />

              {showAdminDiagnostics ? (
                <TopicIdentitySection
                  canonicalKey={detail.intelligence.topicIdentity.canonicalKey}
                  aliases={detail.intelligence.topicIdentity.aliases}
                  relatedLabels={detail.intelligence.topicIdentity.relatedLabels}
                  mergedTopicCount={
                    detail.intelligence.topicIdentity.mergedTopicCount
                  }
                  signalCount={detail.intelligence.signals.length}
                />
              ) : null}

              <EvidenceLayerSection evidence={detail.intelligence.evidence} />

              {showAdminDiagnostics ? (
                <ScoringTransparencySection
                  transparency={detail.intelligence.scoringTransparency}
                />
              ) : null}

              <section className="rounded-3xl border border-border/10 bg-card/72 p-5 shadow-card">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-secondary">
                  <BarChart3 className="h-4 w-4" />
                  Signal movement
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <MovementCard
                    label="Current"
                    value={String(
                      detail.intelligence.movement.currentTrendScore,
                    )}
                    helper={detail.intelligence.movement.currentWindow}
                  />
                  <MovementCard
                    label="24h vs 7d"
                    value={formatMovement(
                      detail.intelligence.movement.dayVsWeek,
                    )}
                    helper="hot signal delta"
                    className={movementTone(
                      detail.intelligence.movement.dayVsWeek,
                    )}
                  />
                  <MovementCard
                    label="7d vs 30d"
                    value={formatMovement(
                      detail.intelligence.movement.weekVsMonth,
                    )}
                    helper="trend vs baseline"
                    className={movementTone(
                      detail.intelligence.movement.weekVsMonth,
                    )}
                  />
                  <MovementCard
                    label="Mentions"
                    value={String(detail.trend.mentionCount)}
                    helper={`${detail.trend.sourceCount} sources`}
                  />
                </div>

                {chartData.length > 1 ? (
                  <div className="mt-5 h-[220px] rounded-2xl border border-border/10 bg-[#160d0d]/45 p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#f3e7e2", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#f3e7e2", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#2c1a1a",
                            border: "1px solid rgba(231,210,203,.16)",
                            borderRadius: 14,
                            color: "#fff8f5",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="trend"
                          stroke="#a60d0e"
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="hiddenGem"
                          stroke="#dda936"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="content"
                          stroke="#fbecc2"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <IntelligenceBlock
                  title="Overview"
                  body={detail.intelligence.overview}
                />
                <IntelligenceBlock
                  title="Why it is trending"
                  body={detail.intelligence.whyTrending}
                />
                <IntelligenceBlock
                  title="Hidden gem reasoning"
                  body={detail.intelligence.hiddenGemReasoning}
                />
                <IntelligenceBlock
                  title="Content opportunity"
                  body={detail.intelligence.contentOpportunity}
                />
              </section>

              <section className="rounded-3xl border border-border/10 bg-card/72 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Lightbulb className="h-4 w-4" />
                  Suggested content angles
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {detail.intelligence.suggestedAngles.map((angle) => (
                    <div
                      key={angle}
                      className="rounded-2xl border border-border/10 bg-muted/35 p-4 text-sm leading-6 text-foreground/88"
                    >
                      {angle}
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-2xl border border-secondary/15 bg-secondary/10 p-4 text-sm leading-6 text-accent/90">
                  {detail.intelligence.saturationRead}
                </p>
              </section>

              <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-3xl border border-border/10 bg-card/72 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                      <Link2 className="h-4 w-4" />
                      Signals behind this trend
                    </div>
                    <span className="text-xs text-muted-foreground/65">
                      {detail.intelligence.signals.length} signals
                    </span>
                  </div>

                  {detail.intelligence.signals.length > 0 ? (
                    <div className="space-y-3">
                      {detail.intelligence.signals.map((signal) => (
                        <SignalLink
                          key={`${signal.source}-${signal.url}`}
                          signal={signal}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-border/10 bg-muted/35 p-4 text-sm leading-6 text-muted-foreground/75">
                      No individual signal rows were found for this window. The
                      trend may be coming from stored snapshot metadata.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-border/10 bg-card/72 p-5">
                  <div className="mb-4 text-sm font-semibold text-secondary">
                    Related topics
                  </div>
                  {detail.intelligence.relatedTopics.length > 0 ? (
                    <div className="space-y-3">
                      {detail.intelligence.relatedTopics.map((topic) => (
                        <RelatedTopicButton
                          key={topic.slug}
                          topic={topic}
                          onSelect={onSelectSlug}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-border/10 bg-muted/35 p-4 text-sm leading-6 text-muted-foreground/75">
                      No related topic snapshot found in the same category yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function ActionPrioritySection({
  recommendation,
  trend,
}: {
  recommendation: TrendActionRecommendation;
  trend: DashboardTrend;
}) {
  const PriorityIcon = actionPriorityIcon(recommendation.actionPriority);

  return (
    <section className="rounded-3xl border border-secondary/18 bg-card/72 p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Target className="h-4 w-4" />
            Recommended action
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/75">
            Priority radar combines score, creator timing, quality, lifecycle,
            freshness and watchlist movement into one action call.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={actionPriorityVariant(recommendation.actionPriority)}>
            <PriorityIcon className="mr-1.5 h-3.5 w-3.5" />
            {recommendation.actionPriorityLabel}
          </Badge>
          <Badge variant={actionUrgencyVariant(recommendation.urgencyLevel)}>
            {recommendation.urgencyLevel} urgency
          </Badge>
          <Badge
            variant={actionConfidenceVariant(
              recommendation.calibration.decisionConfidence,
            )}
          >
            {recommendation.calibration.decisionConfidence} confidence
          </Badge>
          <Badge variant="muted">
            {actionScoreBandLabel(recommendation.calibration.scoreBand)}
          </Badge>
          {recommendation.calibration.isBlockedFromActNow ? (
            <Badge variant="accent">Act Now blocked</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MovementCard
          label="Action score"
          value={String(recommendation.actionScore)}
          helper="priority score"
          className={scoreTone(recommendation.actionScore)}
        />
        <MovementCard
          label="Creator"
          value={String(trend.creatorOpportunity.score)}
          helper={trend.creatorOpportunity.recommendedTiming}
          className={scoreTone(trend.creatorOpportunity.score)}
        />
        <MovementCard
          label="Quality"
          value={String(trend.topicQuality.score)}
          helper={trend.topicQuality.gateStatus}
          className={scoreTone(trend.topicQuality.score)}
        />
        <MovementCard
          label="Lifecycle"
          value={trend.lifecycle.status}
          helper="timing window"
          className={
            trend.lifecycle.status === "Emerging" ||
            trend.lifecycle.status === "Accelerating"
              ? "text-secondary"
              : trend.lifecycle.status === "Cooling" ||
                  trend.lifecycle.status === "Stale" ||
                  trend.lifecycle.status === "Dormant"
                ? "text-primary"
                : "text-accent"
          }
        />
      </div>

      <div className="mt-4 rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/78">
        <p>
          {recommendation.summary} {recommendation.recommendedNextStep}
        </p>
        {recommendation.calibration.tuningNotes.length > 0 ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground/65">
            Why this is not automatic: {recommendation.calibration.tuningNotes[0]}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
            <CheckCircle2 className="h-4 w-4" />
            Priority drivers
          </div>
          {recommendation.reasons.length > 0 ? (
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground/78">
              {recommendation.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground/72">
              No strong positive driver was detected for this priority call.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <AlertTriangle className="h-4 w-4" />
            Priority pressure
          </div>
          {recommendation.warnings.length > 0 ? (
            <ul className="space-y-2 text-sm leading-6 text-red-100/82">
              {recommendation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground/72">
              No major warning pressure detected for this priority call.
            </p>
          )}
        </div>
      </div>

      {recommendation.calibration.actNowBlockers.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <ShieldAlert className="h-4 w-4" />
            Act Now blockers
          </div>
          <ul className="space-y-2 text-sm leading-6 text-muted-foreground/78">
            {recommendation.calibration.actNowBlockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function WatchlistDeltaSection({ item }: { item: SavedTrendWithCurrent }) {
  const delta = item.delta;
  const StatusIcon = watchlistStatusIcon(delta.watchStatus);

  return (
    <section className="rounded-3xl border border-secondary/18 bg-card/72 p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <BookmarkCheck className="h-4 w-4" />
            Watchlist movement
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/75">
            Saved baseline compared with the current snapshot for this window.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={watchlistStatusVariant(delta.watchStatus)}>
            <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
            {delta.watchStatusLabel}
          </Badge>
          {delta.newSignalsCount > 0 ? (
            <Badge variant="secondary">
              New evidence +{delta.newSignalsCount}
            </Badge>
          ) : null}
          {!delta.hasEvidenceBaseline ? (
            <Badge variant="accent">Baseline incomplete</Badge>
          ) : null}
          {delta.lifecycleChanged ? (
            <Badge variant="accent">
              {delta.previousLifecycleStatus ?? "unknown"} →{" "}
              {delta.currentLifecycleStatus ?? "unknown"}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MovementCard
          label="Trend score"
          value={`${item.lastSeenScore} → ${item.currentScore}`}
          helper={formatSignedDelta(delta.scoreDelta)}
          className={movementTone(delta.scoreDelta)}
        />
        <MovementCard
          label="Creator"
          value={`${item.lastSeenCreatorOpportunityScore} → ${item.currentCreatorOpportunityScore}`}
          helper={formatSignedDelta(delta.creatorOpportunityDelta)}
          className={movementTone(delta.creatorOpportunityDelta)}
        />
        <MovementCard
          label="Quality"
          value={`${item.lastSeenQualityScore} → ${item.currentQualityScore}`}
          helper={formatSignedDelta(delta.qualityDelta)}
          className={movementTone(delta.qualityDelta)}
        />
        <MovementCard
          label="Mentions"
          value={
            delta.hasEvidenceBaseline
              ? `${item.lastSeenMentionCount} → ${
                  item.currentTrend?.mentionCount ?? item.lastSeenMentionCount
                }`
              : String(item.currentTrend?.mentionCount ?? 0)
          }
          helper={
            delta.hasEvidenceBaseline
              ? formatSignedDelta(delta.mentionDelta)
              : "re-save baseline"
          }
          className={
            delta.hasEvidenceBaseline
              ? movementTone(delta.mentionDelta)
              : "text-accent"
          }
        />
      </div>

      <p className="mt-4 rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/78">
        {delta.summary} {delta.recommendedAction}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
            <TrendingUp className="h-4 w-4" />
            Positive movement
          </div>
          {delta.drivers.length > 0 ? (
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground/78">
              {delta.drivers.map((driver) => (
                <li key={driver}>{driver}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground/72">
              No major positive movement since this trend was saved.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <AlertTriangle className="h-4 w-4" />
            Watch pressure
          </div>
          {delta.warnings.length > 0 ? (
            <ul className="space-y-2 text-sm leading-6 text-red-100/82">
              {delta.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground/72">
              No major warning pressure detected for this saved trend.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}


function productDecisionVariant(classification: DashboardTrend["productIntelligence"]["classification"]) {
  if (classification === "Act") return "secondary" as const;
  if (classification === "Watch") return "accent" as const;
  return "danger" as const;
}

function researchSignalVariant(impact: DashboardTrend["researchSignal"]["confidenceImpact"]) {
  if (impact === "boost") return "secondary" as const;
  if (impact === "caution") return "accent" as const;
  return "muted" as const;
}

function sourceEvidenceVariant(verdict: TrendSourceEvidenceVerdict) {
  if (verdict === "supports") return "secondary" as const;
  if (verdict === "watch") return "accent" as const;
  if (verdict === "caution") return "danger" as const;
  return "muted" as const;
}

function sourceEvidenceTone(verdict: TrendSourceEvidenceVerdict) {
  if (verdict === "supports") return "text-secondary";
  if (verdict === "watch") return "text-accent";
  if (verdict === "caution") return "text-primary";
  return "text-muted-foreground/70";
}

function sourceGroupBorder(verdict: TrendSourceEvidenceVerdict) {
  if (verdict === "supports") return "border-secondary/20";
  if (verdict === "watch") return "border-accent/20";
  if (verdict === "caution") return "border-primary/25";
  return "border-border/10";
}

function sourceGroupIcon(verdict: TrendSourceEvidenceVerdict) {
  if (verdict === "supports") return CheckCircle2;
  if (verdict === "watch") return Radar;
  if (verdict === "caution") return AlertTriangle;
  return ShieldAlert;
}

function SourceEvidenceInspectorSection({
  inspector,
  showAdminDiagnostics,
}: {
  inspector: TrendSourceEvidenceInspector;
  showAdminDiagnostics: boolean;
}) {
  return (
    <section className="rounded-3xl border border-secondary/15 bg-card/76 p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Link2 className="h-4 w-4" />
            Source evidence inspector
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
            Which sources are actually carrying this trend?
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground/78">
            {inspector.summary}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant={sourceEvidenceVariant(inspector.verdict)}>
            {inspector.verdictLabel}
          </Badge>
          <Badge variant="muted">{inspector.overallScore}/100 evidence</Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MovementCard
          label="Sources"
          value={String(inspector.sourceCount)}
          helper="confirmed groups"
        />
        <MovementCard
          label="Signals"
          value={String(inspector.signalCount)}
          helper="visible evidence"
        />
        <MovementCard
          label="Strongest"
          value={inspector.strongestSource ?? "n/a"}
          helper="largest contribution"
          className="text-secondary"
        />
        <MovementCard
          label="Confidence"
          value={inspector.confidenceDriver}
          helper="ranking context"
          className={sourceEvidenceTone(inspector.verdict)}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <EvidenceMemoCard title="Adoption evidence" body={inspector.adoptionEvidence} />
        <EvidenceMemoCard title="Research evidence" body={inspector.researchEvidence} />
        <EvidenceMemoCard title="Creator evidence" body={inspector.creatorEvidence} />
      </div>

      <div className="mt-4 rounded-2xl border border-border/10 bg-muted/25 p-4 text-sm leading-6 text-muted-foreground/78">
        <strong className="text-foreground">Cross-source read:</strong> {inspector.crossSourceSummary}
      </div>

      {inspector.warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <AlertTriangle className="h-4 w-4" />
            Evidence caveats
          </div>
          <div className="flex flex-wrap gap-2">
            {inspector.warnings.map((warning) => (
              <Badge key={warning} variant="danger">
                {warning}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {inspector.groups.slice(0, showAdminDiagnostics ? 8 : 4).map((group) => (
          <SourceEvidenceGroupCard
            key={group.source}
            group={group}
            showAdminDiagnostics={showAdminDiagnostics}
          />
        ))}
      </div>
    </section>
  );
}

function EvidenceMemoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#160d0d]/38 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/90">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground/78">{body}</p>
    </div>
  );
}

function SourceEvidenceGroupCard({
  group,
  showAdminDiagnostics,
}: {
  group: TrendSourceEvidenceGroup;
  showAdminDiagnostics: boolean;
}) {
  const GroupIcon = sourceGroupIcon(group.verdict);

  return (
    <article
      className={`rounded-3xl border ${sourceGroupBorder(group.verdict)} bg-[#160d0d]/42 p-4`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-border/10 bg-muted/30 p-2">
            <GroupIcon className={`h-4 w-4 ${sourceEvidenceTone(group.verdict)}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">
                {group.source}
              </h4>
              <Badge variant={sourceEvidenceVariant(group.verdict)}>
                {group.verdictLabel}
              </Badge>
              <Badge variant="muted">{group.roleLabel}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground/78">
              {group.summary}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-semibold ${scoreTone(group.contributionScore)}`}>
            {group.contributionScore}
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55">
            contribution
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <span className="rounded-xl border border-border/10 bg-muted/25 px-2 py-2">
          <strong className="block text-foreground">{group.signalCount}</strong>
          Signals
        </span>
        <span className="rounded-xl border border-border/10 bg-muted/25 px-2 py-2">
          <strong className="block text-foreground">{group.trustScore}</strong>
          Trust
        </span>
        <span className="rounded-xl border border-border/10 bg-muted/25 px-2 py-2">
          <strong className="block text-foreground">{group.share}%</strong>
          Share
        </span>
      </div>

      {group.warnings.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {group.warnings.map((warning) => (
            <Badge key={`${group.source}-${warning}`} variant="accent">
              {warning}
            </Badge>
          ))}
        </div>
      ) : null}

      {showAdminDiagnostics ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            Signal impact
          </p>
          {group.signals.slice(0, 3).map((signal) => (
            <SourceEvidenceSignalRow
              key={`${group.source}-${signal.url}`}
              signal={signal}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SourceEvidenceSignalRow({
  signal,
}: {
  signal: TrendSourceEvidenceSignal;
}) {
  return (
    <a
      href={signal.url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-2xl border border-border/10 bg-muted/25 p-3 transition hover:border-secondary/30 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant={sourceEvidenceVariant(signal.impact)}>
              {signal.impactLabel}
            </Badge>
            <Badge variant="muted">{signal.sourceEvidenceScore}/100</Badge>
            {signal.qualityScore ? (
              <Badge variant="muted">quality {signal.qualityScore}</Badge>
            ) : null}
          </div>
          <p className="text-sm font-medium leading-5 text-foreground/90">
            {signal.title}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground/65">
            {signal.reason}
          </p>
        </div>
        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-secondary" />
      </div>
    </a>
  );
}


function signalAgingVariant(status: DashboardTrend["signalAging"]["status"]) {
  if (status === "fresh" || status === "active") return "secondary" as const;
  if (status === "resurfacing" || status === "cooling") return "accent" as const;
  return "danger" as const;
}

function validationDecisionVariant(decision: DashboardTrend["trendValidation"]["decision"]) {
  if (decision === "act") return "secondary" as const;
  if (decision === "watch" || decision === "research") return "accent" as const;
  return "danger" as const;
}

function consistencyVariant(status: DashboardTrend["actionConsistency"]["status"]) {
  if (status === "clean") return "secondary" as const;
  if (status === "review") return "accent" as const;
  return "danger" as const;
}

function SignalAgingSection({
  trend,
  showAdminDiagnostics,
}: {
  trend: DashboardTrend;
  showAdminDiagnostics: boolean;
}) {
  const aging = trend.signalAging;

  return (
    <section className="rounded-3xl border border-border/10 bg-card/72 p-5 shadow-card">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant={signalAgingVariant(aging.status)}>{aging.statusLabel}</Badge>
            <Badge variant="muted">Decay {aging.decayPenalty}</Badge>
            <Badge variant="muted">Recent confirmation {aging.recentConfirmationScore}</Badge>
          </div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            Signal aging: {aging.recommendedAction}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground/78">
            {aging.summary}
          </p>
        </div>
        <div className="grid min-w-[250px] grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded-2xl border border-border/10 bg-muted/35 p-3">
            <strong className="block text-lg text-secondary">{aging.overallFreshnessScore}</strong>
            Freshness
          </span>
          <span className="rounded-2xl border border-border/10 bg-muted/35 p-3">
            <strong className="block text-lg text-secondary">{aging.freshSignalCount + aging.activeSignalCount}</strong>
            Fresh/active
          </span>
          <span className="rounded-2xl border border-border/10 bg-muted/35 p-3">
            <strong className="block text-lg text-secondary">{aging.staleSignalCount}</strong>
            Stale
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <MovementCard label="Latest" value={aging.latestSignalAgeHours === null ? "—" : `${aging.latestSignalAgeHours}h`} helper="newest signal" />
        <MovementCard label="Median" value={aging.medianSignalAgeHours === null ? "—" : `${aging.medianSignalAgeHours}h`} helper="middle signal age" />
        <MovementCard label="Old pressure" value={String(aging.oldSourcePressure)} helper="old-source drag" />
        <MovementCard label="Boost" value={String(aging.freshnessBoost)} helper="freshness lift" />
      </div>

      {aging.warnings.length ? (
        <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/10 p-4 text-sm leading-6 text-accent/90">
          {aging.warnings.join(" ")}
        </div>
      ) : null}

      {showAdminDiagnostics ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {aging.sourceContributions.slice(0, 4).map((source) => (
            <div key={source.source} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{source.source}</p>
                <Badge variant={signalAgingVariant(source.band)}>{source.band}</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground/70">{source.summary}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground/65">
                <span className="rounded-xl border border-border/10 bg-muted/20 p-2">{source.freshnessScore}<br />fresh</span>
                <span className="rounded-xl border border-border/10 bg-muted/20 p-2">{source.decayFactor}<br />decay</span>
                <span className="rounded-xl border border-border/10 bg-muted/20 p-2">{source.contributionScore}<br />score</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ValidationConsistencySection({
  trend,
  showAdminDiagnostics,
}: {
  trend: DashboardTrend;
  showAdminDiagnostics: boolean;
}) {
  const validation = trend.trendValidation;
  const consistency = trend.actionConsistency;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-secondary/15 bg-card/72 p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={validationDecisionVariant(validation.decision)}>{validation.decisionLabel}</Badge>
          <Badge variant="muted">{validation.statusLabel}</Badge>
          <Badge variant="muted">{validation.validationScore}/100</Badge>
        </div>
        <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
          Validation state: {validation.recommendedAction}
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground/78">{validation.summary}</p>
        <p className="mt-3 rounded-2xl border border-border/10 bg-muted/25 p-3 text-sm leading-6 text-muted-foreground/72">
          <strong className="text-foreground">Main reason:</strong> {validation.primaryReason}
        </p>
        {showAdminDiagnostics ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Positive</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground/78">
                {(validation.positiveSignals.length ? validation.positiveSignals : ["No decisive positive signal yet."]).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Blockers / warnings</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-red-100/82">
                {([...validation.blockers, ...validation.warnings].length ? [...validation.blockers, ...validation.warnings] : ["No major blocker detected."]).slice(0, 6).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-border/10 bg-card/72 p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={consistencyVariant(consistency.status)}>{consistency.statusLabel}</Badge>
          <Badge variant="muted">{consistency.score}/100</Badge>
        </div>
        <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
          Evidence-to-action check
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground/78">{consistency.summary}</p>
        <p className="mt-3 rounded-2xl border border-border/10 bg-muted/25 p-3 text-sm leading-6 text-muted-foreground/72">
          {consistency.recommendedFix}
        </p>
        {showAdminDiagnostics ? (
          <div className="mt-4 space-y-2">
            {consistency.checks.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground/68">{item.detail}</p>
                </div>
                <Badge variant={item.status === "pass" ? "secondary" : item.status === "warn" ? "accent" : "danger"}>{item.status}</Badge>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProductTrendDecisionSection({
  trend,
  showAdminDiagnostics,
}: {
  trend: DashboardTrend;
  showAdminDiagnostics: boolean;
}) {
  const intelligence = trend.productIntelligence;
  const sourceQuality = trend.sourceQuality;
  const researchSignal = trend.researchSignal;
  const primarySource = sourceQuality.contribution[0];

  return (
    <section className="rounded-3xl border border-secondary/15 bg-card/76 p-5 shadow-card signal-glow">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant={productDecisionVariant(intelligence.classification)}>
              {intelligence.classificationLabel}
            </Badge>
            <Badge variant="muted">{intelligence.classification}</Badge>
          </div>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
            Product read: {intelligence.recommendedNextAction}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground/78">
            {intelligence.whyItMatters}
          </p>
        </div>
        <div className="grid min-w-[220px] grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded-2xl border border-border/10 bg-muted/35 p-3">
            <strong className="block text-lg text-secondary">{intelligence.signalStrength}</strong>
            Signal
          </span>
          <span className="rounded-2xl border border-border/10 bg-muted/35 p-3">
            <strong className="block text-lg text-secondary">{intelligence.evidenceQuality}</strong>
            Evidence
          </span>
          <span className="rounded-2xl border border-border/10 bg-muted/35 p-3">
            <strong className="block text-lg text-secondary">{intelligence.sourceConfidence}</strong>
            Sources
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <MovementCard label="Why now?" value="Fresh movement" helper={intelligence.whyNow} />
        <MovementCard label="Creator angle" value="Good creator angle" helper={intelligence.creatorAngle} />
        <MovementCard label="Startup angle" value="Research angle" helper={intelligence.startupAngle} />
        <MovementCard label="Risk check" value={intelligence.noiseRisk} helper={`${intelligence.saturationRisk}. ${intelligence.evidenceQualitySummary}`} />
      </div>

      <div className="mt-4 rounded-2xl border border-border/10 bg-muted/25 p-4 text-sm leading-6 text-muted-foreground/78">
        <strong className="text-foreground">Source contribution:</strong> {intelligence.sourceContributionSummary}
        {primarySource ? ` Primary source group: ${primarySource.source} (${primarySource.signalCount} signal${primarySource.signalCount === 1 ? "" : "s"}).` : ""}
      </div>

      <div className="mt-4 rounded-2xl border border-secondary/10 bg-[#0f0808]/35 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={researchSignalVariant(researchSignal.confidenceImpact)}>Research signal</Badge>
          <Badge variant="muted">{researchSignal.score}/100</Badge>
          <Badge variant="muted">{researchSignal.evidenceLevel.replace(/_/g, " ")}</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground/78">
          {intelligence.researchSummary} {intelligence.researchCaveat}
        </p>
        {researchSignal.recommendedUse ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground/62">
            {researchSignal.recommendedUse}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/10 bg-muted/25 p-4 text-sm leading-6 text-muted-foreground/78">
          <strong className="text-foreground">Validation:</strong> {trend.trendValidation.summary}
        </div>
        <div className="rounded-2xl border border-border/10 bg-muted/25 p-4 text-sm leading-6 text-muted-foreground/78">
          <strong className="text-foreground">Signal timing:</strong> {trend.signalAging.summary}
        </div>
      </div>

      {showAdminDiagnostics ? (
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <MovementCard label="Trust" value={String(sourceQuality.sourceTrustScore)} helper="source trust" />
          <MovementCard label="Diversity" value={String(sourceQuality.sourceDiversityScore)} helper="source spread" />
          <MovementCard label="Connector" value={String(sourceQuality.connectorReliabilityScore)} helper="reliability" />
          <MovementCard label="Research share" value={`${researchSignal.researchSourceShare}%`} helper="arXiv/research pressure" />
          <MovementCard label="Single-source risk" value={sourceQuality.singleSourceRisk} helper="admin-only check" />
        </div>
      ) : null}
    </section>
  );
}

function TopicQualitySection({ quality }: { quality: TopicQuality }) {
  const penaltyRows = [
    { label: "Generic", value: quality.metrics.genericPenalty },
    { label: "Content pattern", value: quality.metrics.contentPatternPenalty },
    { label: "Single source", value: quality.metrics.singleSourcePenalty },
    { label: "Saturation", value: quality.metrics.saturationNoisePenalty },
    { label: "Staleness", value: quality.metrics.stalenessPenalty },
  ];

  return (
    <section className="rounded-3xl border border-border/10 bg-card/72 p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <ShieldAlert className="h-4 w-4" />
            Topic quality gate
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/75">
            Noise suppression checks whether this is a real trend candidate or a
            broad/tutorial/repo-shaped signal that should not be promoted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={topicQualityGateVariant(quality.gateStatus)}>
            {quality.gateStatus}
          </Badge>
          <Badge variant={topicNoiseVariant(quality.noiseRisk)}>
            {quality.noiseRisk} noise
          </Badge>
          <Badge variant="muted">{quality.topicClarity}</Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <MovementCard
          label="Quality"
          value={String(quality.score)}
          helper="gate score"
          className={topicQualityTone(quality)}
        />
        <MovementCard
          label="Clarity"
          value={String(quality.metrics.titleSpecificity)}
          helper={quality.topicClarity}
        />
        <MovementCard
          label="Source trust"
          value={String(quality.metrics.sourceTrust)}
          helper={quality.sourceTrustLevel}
        />
        <MovementCard
          label="Confirmation"
          value={String(quality.metrics.crossSourceConfirmation)}
          helper="cross-source"
        />
        <MovementCard
          label="Actionable"
          value={quality.isActionableTrend ? "yes" : "no"}
          helper={quality.isGenericTopic ? "generic label" : "usable label"}
          className={
            quality.isActionableTrend ? "text-secondary" : "text-primary"
          }
        />
      </div>

      <p className="mt-4 rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/78">
        {quality.explanation}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <AlertTriangle className="h-4 w-4" />
            Noise pressure
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {penaltyRows.map((penalty) => (
              <div
                key={penalty.label}
                className="rounded-xl border border-border/10 bg-[#160d0d]/35 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground/65">
                    {penalty.label}
                  </span>
                  <span className="text-sm font-semibold text-red-100">
                    {penalty.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
              <CheckCircle2 className="h-4 w-4" />
              Why it passed
            </div>
            {quality.positiveSignals.length > 0 ? (
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground/78">
                {quality.positiveSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground/72">
                No strong positive quality driver yet. This should stay in watch
                mode until the topic becomes clearer.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-primary/15 bg-[#160d0d]/35 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldAlert className="h-4 w-4" />
              Warnings
            </div>
            {quality.warnings.length > 0 ? (
              <ul className="space-y-2 text-sm leading-6 text-red-100/82">
                {quality.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground/72">
                No major noise warning. The topic is clean enough for ranking.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CreatorOpportunitySection({
  opportunity,
}: {
  opportunity: CreatorOpportunity;
}) {
  const metricRows = [
    {
      label: "Freshness",
      value: opportunity.metrics.freshness,
      helper: "fresh signal",
    },
    {
      label: "Creator gap",
      value: opportunity.metrics.creatorGap,
      helper: "room left",
    },
    {
      label: "Credibility",
      value: opportunity.metrics.sourceCredibility,
      helper: "source quality",
    },
    {
      label: "Topic clarity",
      value: opportunity.metrics.topicClarity,
      helper: "angle clarity",
    },
  ];

  return (
    <section className="rounded-3xl border border-secondary/18 bg-card/72 p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Target className="h-4 w-4" />
            Creator opportunity
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/75">
            Separate creator score for deciding whether this is worth turning
            into a post, video, founder note, explainer or deep-dive.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={opportunityVariant(opportunity.level)}>
            {opportunity.level} opportunity
          </Badge>
          <Badge variant={timingVariant(opportunity.recommendedTiming)}>
            {opportunity.recommendedTiming}
          </Badge>
          <Badge variant={riskVariant(opportunity.contentRisk)}>
            {opportunity.contentRisk} risk
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <MovementCard
          label="Creator score"
          value={String(opportunity.score)}
          helper={opportunity.level}
          className={scoreTone(opportunity.score)}
        />
        <MovementCard
          label="Timing"
          value={opportunity.recommendedTiming}
          helper="publish window"
        />
        <MovementCard
          label="Format"
          value={opportunity.recommendedFormat}
          helper="best package"
        />
        <MovementCard
          label="Risk"
          value={opportunity.contentRisk}
          helper="content risk"
          className={
            opportunity.contentRisk === "low"
              ? "text-secondary"
              : opportunity.contentRisk === "medium"
                ? "text-accent"
                : "text-primary"
          }
        />
        <MovementCard
          label="Audience"
          value={opportunity.audienceFit.slice(0, 2).join(", ")}
          helper="primary fit"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-secondary/15 bg-secondary/10 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          <Lightbulb className="h-4 w-4" />
          Best angle
        </div>
        <p className="text-sm leading-6 text-foreground/90">
          {opportunity.bestAngle}
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            <Gauge className="h-4 w-4" />
            Score ingredients
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {metricRows.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-border/10 bg-[#160d0d]/35 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground/65">
                    {metric.label}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {metric.value}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/50">
                  {metric.helper}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            <Users className="h-4 w-4" />
            Audience + risk
          </div>
          <div className="flex flex-wrap gap-2">
            {opportunity.audienceFit.map((audience) => (
              <Badge key={audience} variant="muted">
                {audience}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground/75">
            {opportunity.explanation}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-secondary/15 bg-[#160d0d]/35 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
            <Clock3 className="h-4 w-4" />
            Positive drivers
          </div>
          {opportunity.drivers.length > 0 ? (
            <ul className="space-y-2 text-sm leading-6 text-muted-foreground/78">
              {opportunity.drivers.map((driver) => (
                <li key={driver}>{driver}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground/70">
              No dominant positive driver yet. Watch for stronger freshness,
              clearer source confirmation or a better content gap.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldAlert className="h-4 w-4" />
            Negative pressure
          </div>
          {opportunity.warnings.length > 0 ? (
            <ul className="space-y-2 text-sm leading-6 text-red-100/82">
              {opportunity.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-red-100/75">
              No major risk marker. Still, do not publish a generic AI take -
              the dashboard hates filler and so does the internet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function TopicIdentitySection({
  canonicalKey,
  aliases,
  relatedLabels,
  mergedTopicCount,
  signalCount,
}: {
  canonicalKey: string;
  aliases: string[];
  relatedLabels: string[];
  mergedTopicCount: number;
  signalCount: number;
}) {
  return (
    <section className="rounded-3xl border border-border/10 bg-card/72 p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Layers3 className="h-4 w-4" />
            Topic identity
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/75">
            Canonical topic key keeps nearby labels merged instead of letting
            the dashboard count the same idea three times with different
            haircuts.
          </p>
        </div>
        <Badge variant="muted">{canonicalKey}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MovementCard
          label="Canonical key"
          value={canonicalKey}
          helper="stable slug"
          className="text-secondary"
        />
        <MovementCard
          label="Alias merge"
          value={String(mergedTopicCount)}
          helper="known variations"
        />
        <MovementCard
          label="Merged signals"
          value={String(signalCount)}
          helper="current window"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            Known aliases
          </p>
          <div className="flex flex-wrap gap-2">
            {aliases.length > 0 ? (
              aliases.slice(0, 12).map((alias) => (
                <Badge key={alias} variant="accent">
                  {alias}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground/70">
                No alias variations recorded yet.
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            Related labels
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedLabels.length > 0 ? (
              relatedLabels.slice(0, 10).map((label) => (
                <Badge key={label} variant="muted">
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground/70">
                No related labels recorded yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoringTransparencySection({
  transparency,
}: {
  transparency: TrendScoringTransparency;
}) {
  const positive = transparency.positiveDrivers.slice(0, 6);
  const negative = transparency.negativeDrivers.slice(0, 6);

  return (
    <section className="rounded-3xl border border-accent/18 bg-card/72 p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <BarChart3 className="h-4 w-4" />
            Scoring transparency
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/75">
            Why this trend is ranked this way. This admin-only view keeps scoring reasons visible without mixing them into the product pages.
          </p>
        </div>
        <Badge variant={confidenceVariant(transparency.confidence)}>
          {transparency.confidence} confidence
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MovementCard
          label="Confidence"
          value={String(transparency.confidenceScore)}
          helper={transparency.confidence}
          className={confidenceTone(transparency.confidence)}
        />
        <MovementCard
          label="Base score"
          value={String(transparency.rawTrendScore)}
          helper="before adjustments"
        />
        <MovementCard
          label="Adjusted"
          value={String(transparency.adjustedTrendScore)}
          helper="visible score"
          className={scoreTone(transparency.adjustedTrendScore)}
        />
        <MovementCard
          label="Freshness adj."
          value={
            transparency.freshnessAdjustment > 0
              ? `+${transparency.freshnessAdjustment}`
              : String(transparency.freshnessAdjustment)
          }
          helper="lifecycle effect"
          className={
            transparency.freshnessAdjustment > 0
              ? "text-secondary"
              : transparency.freshnessAdjustment < 0
                ? "text-primary"
                : "text-muted-foreground/80"
          }
        />
      </div>

      <p className="mt-4 rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/82">
        {transparency.explanation}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DriverList title="Positive drivers" items={positive} tone="positive" />
        <DriverList
          title="Negative pressure"
          items={negative}
          tone="negative"
        />
      </div>

      {transparency.warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-100">
            <AlertTriangle className="h-4 w-4" />
            Ranking warnings
          </div>
          <div className="flex flex-wrap gap-2">
            {transparency.warnings.map((warning) => (
              <Badge key={warning} variant="danger">
                {warning}
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-sm leading-6 text-accent/90">
          No major ranking warnings detected in this window.
        </div>
      )}

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {transparency.breakdown.map((item) => (
          <ScoringBreakdownCard key={item.id} item={item} />
        ))}
      </div>

      {transparency.rankingNotes.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-border/10 bg-muted/25 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            Ranking notes
          </p>
          <div className="space-y-2">
            {transparency.rankingNotes.map((note) => (
              <p
                key={note}
                className="text-sm leading-6 text-muted-foreground/78"
              >
                {note}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DriverList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "negative";
}) {
  const Icon = tone === "positive" ? CheckCircle2 : AlertTriangle;
  const textClass = tone === "positive" ? "text-secondary" : "text-primary";
  const emptyText =
    tone === "positive"
      ? "No strong positive driver dominates yet."
      : "No major negative pressure detected.";

  return (
    <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
      <div
        className={`mb-3 flex items-center gap-2 text-sm font-semibold ${textClass}`}
      >
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item}
              variant={tone === "positive" ? "secondary" : "danger"}
            >
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground/70">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function ScoringBreakdownCard({
  item,
}: {
  item: TrendScoringTransparencyBreakdownItem;
}) {
  return (
    <article className="rounded-2xl border border-border/10 bg-[#160d0d]/38 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{item.label}</p>
          <Badge variant={impactVariant(item.impact)} className="mt-2">
            {impactLabel(item.impact)}
          </Badge>
        </div>
        <p className={`text-2xl font-semibold ${scoreTone(item.value)}`}>
          {item.value}
        </p>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted/45">
        <div
          className={`h-full rounded-full ${impactBarClass(item.impact)}`}
          style={{ width: `${Math.max(4, Math.min(100, item.value))}%` }}
        />
      </div>
      <p className="text-sm leading-6 text-muted-foreground/75">
        {item.description}
      </p>
    </article>
  );
}

function EvidenceLayerSection({ evidence }: { evidence: TrendEvidenceItem[] }) {
  return (
    <section className="rounded-3xl border border-secondary/15 bg-card/72 p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Layers3 className="h-4 w-4" />
            Evidence layer
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/75">
            The drawer now reads the trend like an intelligence brief: what
            proves the trend is early, confirmed, under-covered or already
            crowded.
          </p>
        </div>
        <Badge variant="muted">{evidence.length} evidence checks</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {evidence.map((item) => (
          <EvidenceCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function EvidenceCard({ item }: { item: TrendEvidenceItem }) {
  const tone = evidenceTone(item.level);
  const Icon = tone.icon;

  return (
    <article
      className={`rounded-3xl border ${tone.border} bg-[#160d0d]/42 p-4 transition hover:border-secondary/35`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-border/10 bg-muted/35 p-2">
            <Icon className={`h-4 w-4 ${tone.text}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {item.title}
              </h3>
              <Badge variant={tone.badge}>{item.label}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground/82">
              {item.summary}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-semibold ${tone.text}`}>{item.score}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55">
            score
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {item.metrics.map((metric) => (
          <div
            key={`${item.id}-${metric.label}`}
            className="rounded-2xl border border-border/10 bg-muted/30 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">
              {metric.label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border/10 bg-muted/25 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/90">
          Why this matters
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground/78">
          {item.whyItMatters}
        </p>
        <p className="mt-3 text-sm leading-6 text-accent/88">
          <strong>Action:</strong> {item.recommendedAction}
        </p>
      </div>

      {item.sources.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.sources.map((source) => (
            <Badge key={`${item.id}-${source}`} variant="muted">
              {source}
            </Badge>
          ))}
        </div>
      ) : null}

      {item.supportingSignals.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            Supporting signals
          </p>
          {item.supportingSignals.slice(0, 3).map((signal) => (
            <a
              key={`${item.id}-${signal.source}-${signal.url}`}
              href={signal.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start justify-between gap-3 rounded-2xl border border-border/10 bg-muted/25 p-3 transition hover:border-secondary/25 hover:bg-muted/40"
            >
              <span className="min-w-0 text-sm leading-5 text-foreground/88">
                {signal.title}
                {signal.qualityTags?.length ? (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {signal.qualityTags.slice(0, 3).map((tag) => (
                      <Badge
                        key={`${item.id}-${signal.url}-${tag}`}
                        variant={qualityVariant(tag)}
                        className="px-2 text-[10px]"
                      >
                        {qualityLabel(tag)}
                      </Badge>
                    ))}
                  </span>
                ) : null}
              </span>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-secondary" />
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ScoreCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-card/72 p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/65">
          {label}
        </span>
        <Icon className="h-4 w-4 text-secondary" />
      </div>
      <p
        className={`text-3xl font-semibold tracking-tight ${scoreTone(value)}`}
      >
        {value}
      </p>
    </div>
  );
}

function MovementCard({
  label,
  value,
  helper,
  className = "text-foreground",
}: {
  label: string;
  value: string;
  helper: string;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#160d0d]/38 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${className}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground/65">{helper}</p>
    </div>
  );
}

function IntelligenceBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-border/10 bg-card/72 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
        {title}
      </p>
      <p className="text-sm leading-7 text-muted-foreground/82">{body}</p>
    </div>
  );
}
