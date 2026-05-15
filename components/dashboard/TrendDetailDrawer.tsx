"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Compass,
  ExternalLink,
  Layers3,
  Lightbulb,
  Link2,
  Loader2,
  Radar,
  Sparkles,
  TrendingUp,
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
import type {
  DashboardTrend,
  DashboardWindow,
  RelatedTrend,
  TrendDetailResponse,
  TrendDetailSignal,
  TrendDetailSnapshot,
  TrendEvidenceItem,
  TrendEvidenceLevel,
  TrendEvidenceType,
  TrendSignalQualityTag,
} from "@/lib/trends/types";

type Props = {
  slug: string | null;
  selectedWindow: DashboardWindow;
  initialTrend?: DashboardTrend | null;
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
  if (tag === "cross_source_confirmation") return "accent" as const;
  return "muted" as const;
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
  onClose,
  onSelectSlug,
}: Props) {
  const [detailState, setDetailState] = useState<DetailState>({
    status: "idle",
    data: null,
    error: null,
  });

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
  const chartData = useMemo(
    () => buildChartData(detail?.intelligence.snapshots ?? []),
    [detail?.intelligence.snapshots],
  );
  const isOpen = Boolean(slug);

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
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground/70">
                {trend ? (
                  <Badge variant="secondary">{trend.category}</Badge>
                ) : null}
                {trend ? <Badge variant="muted">{trend.status}</Badge> : null}
                <span className="rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
                  Window:{" "}
                  <strong className="text-secondary">{selectedWindow}</strong>
                </span>
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
              Loading real trend intelligence from database...
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

              <EvidenceLayerSection evidence={detail.intelligence.evidence} />

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
