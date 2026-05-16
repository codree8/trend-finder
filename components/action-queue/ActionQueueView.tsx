"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Radar,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TrendDetailDrawer } from "@/components/dashboard/TrendDetailDrawer";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ActionQueueItem,
  ActionQueueQaStatus,
  ActionQueueQaSummary,
  ActionQueueResponse,
  DashboardTrend,
  DashboardWindow,
  SavedTrendWithCurrent,
  TrendActionConfidence,
  TrendActionPriority,
  TrendActionScoreBand,
  TrendActionUrgencyLevel,
} from "@/lib/trends/types";

const windowOptions: DashboardWindow[] = ["24h", "7d", "30d"];

const groupMeta: Record<
  TrendActionPriority,
  {
    title: string;
    description: string;
    icon: LucideIcon;
  }
> = {
  act_now: {
    title: "Act Now",
    description: "Strong enough to deserve attention before the window closes.",
    icon: Target,
  },
  monitor: {
    title: "Monitor",
    description:
      "Real signal, but it needs more confirmation or better timing.",
    icon: Eye,
  },
  review: {
    title: "Review",
    description:
      "Promising on paper, but quality/noise pressure needs inspection.",
    icon: ShieldAlert,
  },
  ignore: {
    title: "Ignore",
    description: "Too stale, noisy or weak to deserve current attention.",
    icon: XCircle,
  },
};

const orderedPriorities: TrendActionPriority[] = [
  "act_now",
  "monitor",
  "review",
  "ignore",
];

function priorityVariant(priority: TrendActionPriority): BadgeProps["variant"] {
  if (priority === "act_now") return "secondary";
  if (priority === "monitor") return "accent";
  if (priority === "review") return "default";
  return "danger";
}

function urgencyVariant(
  urgency: TrendActionUrgencyLevel,
): BadgeProps["variant"] {
  if (urgency === "high") return "danger";
  if (urgency === "medium") return "accent";
  return "muted";
}

function lifecycleVariant(
  status: DashboardTrend["lifecycle"]["status"],
): BadgeProps["variant"] {
  if (status === "Accelerating") return "secondary";
  if (status === "Emerging" || status === "Peaking") return "accent";
  if (status === "Cooling" || status === "Stale" || status === "Dormant") {
    return "danger";
  }
  return "muted";
}

function qualityVariant(trend: DashboardTrend): BadgeProps["variant"] {
  if (trend.topicQuality.gateStatus === "pass") return "secondary";
  if (trend.topicQuality.gateStatus === "watch") return "accent";
  return "danger";
}

function qaVariant(status: ActionQueueQaStatus): BadgeProps["variant"] {
  if (status === "healthy") return "secondary";
  if (status === "review") return "accent";
  return "danger";
}

function confidenceVariant(
  confidence: TrendActionConfidence,
): BadgeProps["variant"] {
  if (confidence === "high") return "secondary";
  if (confidence === "medium") return "accent";
  return "danger";
}

function scoreBandLabel(band: TrendActionScoreBand) {
  const labels: Record<TrendActionScoreBand, string> = {
    strong: "Strong band",
    qualified: "Qualified band",
    borderline: "Borderline band",
    weak: "Weak band",
  };

  return labels[band];
}

function signalAgeLabel(value: number | null) {
  if (value === null) return "No current signal age";
  if (value < 1) return "<1h old";
  if (value < 24) return `${Math.round(value)}h old`;
  return `${Math.round(value / 24)}d old`;
}

function scoreTone(value: number) {
  if (value >= 76) return "text-secondary";
  if (value >= 52) return "text-accent";
  return "text-primary";
}

function signed(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function savedTrendItems(items: ActionQueueItem[]) {
  const seen = new Set<string>();
  const saved: SavedTrendWithCurrent[] = [];

  for (const item of items) {
    if (!item.watchlistItem || seen.has(item.watchlistItem.trendKey)) continue;
    seen.add(item.watchlistItem.trendKey);
    saved.push(item.watchlistItem);
  }

  return saved;
}

function emptyGroups(): Record<TrendActionPriority, ActionQueueItem[]> {
  return {
    act_now: [],
    monitor: [],
    review: [],
    ignore: [],
  };
}

export function ActionQueueView() {
  const [trendWindow, setTrendWindow] = useState<DashboardWindow>("7d");
  const [items, setItems] = useState<ActionQueueItem[]>([]);
  const [qaSummary, setQaSummary] = useState<ActionQueueQaSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendSlug, setSelectedTrendSlug] = useState<string | null>(
    null,
  );

  const loadActionQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/action-queue?window=${trendWindow}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load action queue.");
      }

      const queuePayload = payload as ActionQueueResponse;
      setItems(queuePayload.items);
      setQaSummary(queuePayload.qa);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load action queue.",
      );
      setItems([]);
      setQaSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [trendWindow]);

  useEffect(() => {
    void loadActionQueue();
  }, [loadActionQueue]);

  const savedTrends = useMemo(() => savedTrendItems(items), [items]);
  const savedTrendKeys = useMemo(
    () => new Set(savedTrends.map((item) => item.trendKey)),
    [savedTrends],
  );

  const selectedTrend = useMemo<DashboardTrend | null>(() => {
    if (!selectedTrendSlug) return null;
    return (
      items.find((item) => item.trend.slug === selectedTrendSlug)?.trend ?? null
    );
  }, [items, selectedTrendSlug]);

  const groups = useMemo(() => {
    const nextGroups = emptyGroups();

    for (const item of items) {
      nextGroups[item.actionPriority].push(item);
    }

    return nextGroups;
  }, [items]);

  const summary = useMemo(
    () => ({
      actNow: groups.act_now.length,
      monitor: groups.monitor.length,
      review: groups.review.length,
      ignore: groups.ignore.length,
      highUrgency: items.filter((item) => item.urgencyLevel === "high").length,
    }),
    [groups, items],
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Action Queue / Priority Radar
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Decide what deserves attention now.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This layer ranks trends by timing, creator opportunity, quality,
              lifecycle, freshness and watchlist movement. Less dashboard
              staring, more decision-making. Revolutionary stuff, allegedly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-border/10 bg-card/70 p-2">
            {windowOptions.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={trendWindow === option ? "secondary" : "ghost"}
                onClick={() => setTrendWindow(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-5">
          <SummaryCard label="Act now" value={summary.actNow} icon={Target} />
          <SummaryCard label="Monitor" value={summary.monitor} icon={Eye} />
          <SummaryCard
            label="Review"
            value={summary.review}
            icon={ShieldAlert}
          />
          <SummaryCard label="Ignore" value={summary.ignore} icon={XCircle} />
          <SummaryCard
            label="High urgency"
            value={summary.highUrgency}
            icon={AlertTriangle}
          />
        </section>

        {qaSummary ? <PriorityQaPanel qa={qaSummary} /> : null}

        {error ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-red-100">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center p-6 text-sm text-muted-foreground/75">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-secondary" />
              Building the priority radar from current trend snapshots...
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <Card className="signal-glow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary/15 p-3 text-secondary">
                  <Radar className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>No action candidates yet</CardTitle>
                  <CardDescription>
                    Run a scan or widen the time window. The queue needs trend
                    snapshots before it can rank anything.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <div className="grid gap-5 2xl:grid-cols-2">
            {orderedPriorities.map((priority) => (
              <ActionGroup
                key={priority}
                priority={priority}
                items={groups[priority]}
                savedTrendKeys={savedTrendKeys}
                selectedWindow={trendWindow}
                onSavedChange={() => void loadActionQueue()}
                onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <TrendDetailDrawer
        slug={selectedTrendSlug}
        selectedWindow={trendWindow}
        initialTrend={selectedTrend}
        savedTrendKeys={savedTrendKeys}
        savedTrends={savedTrends}
        onSavedChange={() => void loadActionQueue()}
        onClose={() => setSelectedTrendSlug(null)}
        onSelectSlug={setSelectedTrendSlug}
      />
    </AppShell>
  );
}

function PriorityQaPanel({ qa }: { qa: ActionQueueQaSummary }) {
  return (
    <Card className="border-border/10 bg-card/70 shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <ShieldAlert className="h-4 w-4" />
              Priority QA & tuning
            </div>
            <CardTitle className="mt-3 text-xl">{qa.statusLabel}</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Calibration checks whether Act Now is rare enough, whether risky
              candidates are being held back and whether review pressure is
              getting too heavy.
            </CardDescription>
          </div>
          <Badge variant={qaVariant(qa.status)}>{qa.statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <QaMetric label="Act Now share" value={`${qa.actNowShare}%`} />
          <QaMetric
            label="Blocked candidates"
            value={String(qa.blockedActNowCandidates)}
          />
          <QaMetric
            label="Avg action score"
            value={String(qa.averageActionScore)}
          />
          <QaMetric
            label="Avg confidence"
            value={`${qa.averageConfidenceScore}/100`}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
              Tuning notes
            </div>
            <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground/76">
              {qa.tuningNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              QA warnings
            </div>
            {qa.warnings.length > 0 ? (
              <ul className="space-y-2 text-sm leading-6 text-red-100/82">
                {qa.warnings.map((warning) => (
                  <li key={`${warning.title}-${warning.detail}`}>
                    <span className="font-semibold text-foreground">
                      {warning.title}:
                    </span>{" "}
                    {warning.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground/72">
                No calibration warnings. The queue is conservative enough for
                now.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QaMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#0f0808]/45 p-3">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-card/62 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <Icon className="h-4 w-4 text-secondary" />
      </div>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground/62">
        {label}
      </p>
    </div>
  );
}

function ActionGroup({
  priority,
  items,
  savedTrendKeys,
  selectedWindow,
  onSavedChange,
  onSelectTrend,
}: {
  priority: TrendActionPriority;
  items: ActionQueueItem[];
  savedTrendKeys: ReadonlySet<string>;
  selectedWindow: DashboardWindow;
  onSavedChange: () => void;
  onSelectTrend: (trend: DashboardTrend) => void;
}) {
  const meta = groupMeta[priority];
  const Icon = meta.icon;

  return (
    <section className="rounded-3xl border border-border/10 bg-card/45 p-4 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Icon className="h-4 w-4" />
            {meta.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/72">
            {meta.description}
          </p>
        </div>
        <Badge variant={priorityVariant(priority)}>{items.length}</Badge>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <ActionCard
              key={item.trend.id}
              item={item}
              savedTrendKeys={savedTrendKeys}
              selectedWindow={selectedWindow}
              onSavedChange={onSavedChange}
              onSelectTrend={onSelectTrend}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/70">
          No trends in this lane for the selected window.
        </div>
      )}
    </section>
  );
}

function ActionCard({
  item,
  savedTrendKeys,
  selectedWindow,
  onSavedChange,
  onSelectTrend,
}: {
  item: ActionQueueItem;
  savedTrendKeys: ReadonlySet<string>;
  selectedWindow: DashboardWindow;
  onSavedChange: () => void;
  onSelectTrend: (trend: DashboardTrend) => void;
}) {
  const trend = item.trend;
  const PriorityIcon = groupMeta[item.actionPriority].icon;

  return (
    <Card className="overflow-hidden border-border/10 bg-[#160d0d]/50">
      <CardHeader>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={priorityVariant(item.actionPriority)}>
                <PriorityIcon className="mr-1.5 h-3.5 w-3.5" />
                {item.actionPriorityLabel}
              </Badge>
              <Badge variant={urgencyVariant(item.urgencyLevel)}>
                {item.urgencyLevel} urgency
              </Badge>
              <Badge variant={lifecycleVariant(trend.lifecycle.status)}>
                {trend.lifecycle.status}
              </Badge>
              <Badge variant={qualityVariant(trend)}>
                Quality {trend.topicQuality.score}
              </Badge>
              <Badge
                variant={confidenceVariant(item.calibration.decisionConfidence)}
              >
                {item.calibration.decisionConfidence} confidence
              </Badge>
              <Badge variant="muted">
                {scoreBandLabel(item.calibration.scoreBand)}
              </Badge>
              {item.calibration.isBlockedFromActNow ? (
                <Badge variant="accent">Act Now blocked</Badge>
              ) : null}
              {item.isSaved ? (
                <Badge variant="secondary">
                  <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" />
                  Saved
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-lg leading-6">{trend.topic}</CardTitle>
            <CardDescription className="mt-2">{item.summary}</CardDescription>
          </div>

          <div className="grid min-w-[230px] grid-cols-3 gap-2 text-center">
            <MiniMetric
              label="Action"
              value={item.actionScore}
              tone={scoreTone(item.actionScore)}
            />
            <MiniMetric
              label="Creator"
              value={trend.creatorOpportunity.score}
              tone={scoreTone(trend.creatorOpportunity.score)}
            />
            <MiniMetric
              label="Trend"
              value={trend.trendScore}
              tone={scoreTone(trend.trendScore)}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/82">
          <span className="font-semibold text-foreground">Next step:</span>{" "}
          {item.recommendedNextStep}
          {item.calibration.tuningNotes.length > 0 ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground/65">
              Calibration: {item.calibration.tuningNotes[0]}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/70">
          <span className="inline-flex items-center rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
            <Clock3 className="mr-1.5 h-3.5 w-3.5 text-secondary" />
            {signalAgeLabel(trend.lifecycle.latestSignalAgeHours)}
          </span>
          <span className="inline-flex items-center rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
            <Radar className="mr-1.5 h-3.5 w-3.5 text-secondary" />
            {trend.mentionCount} mentions · {trend.sourceCount} sources
          </span>
          <span className="inline-flex items-center rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-secondary" />
            {trend.creatorOpportunity.recommendedTiming} ·{" "}
            {trend.creatorOpportunity.recommendedFormat}
          </span>
          {item.watchlistItem ? (
            <span className="inline-flex items-center rounded-full border border-secondary/15 bg-secondary/10 px-3 py-1.5 text-secondary">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Watchlist {item.watchlistItem.delta.watchStatusLabel} · score{" "}
              {signed(item.watchlistItem.delta.scoreDelta)}
            </span>
          ) : null}
        </div>

        {item.reasons.length > 0 || item.warnings.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <SignalList
              title="Why it is here"
              items={item.reasons}
              empty="No strong positive driver was detected."
            />
            <SignalList
              title="Pressure"
              items={item.warnings}
              empty="No major pressure detected."
              danger
            />
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectTrend(trend)}
          >
            Open intelligence <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          <WatchlistButton
            trend={trend}
            isSaved={Boolean(
              savedTrendKeys.has(trend.canonicalKey.toLowerCase()),
            )}
            selectedWindow={selectedWindow}
            onSavedChange={onSavedChange}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#0f0808]/45 p-3">
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
    </div>
  );
}

function SignalList({
  title,
  items,
  empty,
  danger = false,
}: {
  title: string;
  items: string[];
  empty: string;
  danger?: boolean;
}) {
  return (
    <div
      className={
        danger
          ? "rounded-2xl border border-primary/15 bg-primary/10 p-4"
          : "rounded-2xl border border-secondary/15 bg-secondary/10 p-4"
      }
    >
      <div
        className={
          danger
            ? "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
            : "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary"
        }
      >
        {danger ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {title}
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground/78">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground/68">{empty}</p>
      )}
    </div>
  );
}
