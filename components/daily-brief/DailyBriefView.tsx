"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookmarkCheck,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Layers3,
  Lightbulb,
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
  DailyBriefAvoidSeverity,
  DailyBriefNarrative,
  DailyBriefNarrativeCalibrationStatus,
  DailyBriefQaSummary,
  DailyBriefQaWarning,
  DailyBriefReportDocument,
  DailyBriefResponse,
  DailyBriefTopicToAvoid,
  DashboardTrend,
  DashboardWindow,
  SavedTrendWithCurrent,
  WatchlistStatus,
} from "@/lib/trends/types";

const windowOptions: DashboardWindow[] = ["24h", "7d", "30d"];

const avoidLabels: Record<DailyBriefAvoidSeverity, string> = {
  noise: "Noise",
  stale: "Stale",
  saturated: "Saturated",
  generic: "Generic",
  weak_signal: "Weak signal",
};

function formatDate(value: string | null) {
  if (!value) return "No scan yet";

  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSigned(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function trendKey(trend: Pick<DashboardTrend, "canonicalKey" | "id" | "slug">) {
  return (trend.canonicalKey || trend.id || trend.slug).trim().toLowerCase();
}

function scoreTone(value: number) {
  if (value >= 76) return "text-secondary";
  if (value >= 52) return "text-accent";
  return "text-primary";
}

function priorityVariant(
  priority: ActionQueueItem["actionPriority"],
): BadgeProps["variant"] {
  if (priority === "act_now") return "secondary";
  if (priority === "monitor") return "accent";
  if (priority === "review") return "default";
  return "danger";
}

function urgencyVariant(
  urgency: ActionQueueItem["urgencyLevel"],
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
  if (status === "Cooling" || status === "Stale" || status === "Dormant")
    return "danger";
  return "muted";
}

function qualityVariant(trend: DashboardTrend): BadgeProps["variant"] {
  if (trend.topicQuality.gateStatus === "pass") return "secondary";
  if (trend.topicQuality.gateStatus === "watch") return "accent";
  return "danger";
}

function watchStatusVariant(status: WatchlistStatus): BadgeProps["variant"] {
  if (status === "rising") return "secondary";
  if (status === "stable") return "muted";
  if (status === "cooling") return "accent";
  return "danger";
}

function avoidVariant(
  severity: DailyBriefAvoidSeverity,
): BadgeProps["variant"] {
  if (severity === "noise" || severity === "generic") return "danger";
  if (severity === "stale" || severity === "saturated") return "accent";
  return "muted";
}

function postureVariant(
  posture: DailyBriefResponse["briefPosture"]["posture"],
): BadgeProps["variant"] {
  if (posture === "offensive") return "secondary";
  if (posture === "selective") return "accent";
  return "danger";
}

function narrativeVariant(
  tone: DailyBriefNarrative["tone"],
): BadgeProps["variant"] {
  if (tone === "opportunity") return "secondary";
  if (tone === "monitor") return "accent";
  if (tone === "risk") return "danger";
  return "muted";
}

function qaStatusVariant(
  status: DailyBriefQaSummary["status"],
): BadgeProps["variant"] {
  if (status === "healthy") return "secondary";
  if (status === "review" || status === "too_cautious") return "accent";
  return "danger";
}

function qaWarningVariant(
  severity: DailyBriefQaWarning["severity"],
): BadgeProps["variant"] {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "accent";
  return "muted";
}

function calibrationVariant(
  status: DailyBriefNarrativeCalibrationStatus,
): BadgeProps["variant"] {
  if (status === "clean") return "secondary";
  if (status === "softened" || status === "needs_review") return "accent";
  return "danger";
}

function calibrationLabel(status: DailyBriefNarrativeCalibrationStatus) {
  const labels: Record<DailyBriefNarrativeCalibrationStatus, string> = {
    clean: "QA clean",
    softened: "QA softened",
    downgraded: "QA downgraded",
    needs_review: "QA review",
  };

  return labels[status];
}

function confidenceLabel(value: number) {
  if (value >= 78) return "High confidence";
  if (value >= 58) return "Medium confidence";
  return "Low confidence";
}

function signalAgeLabel(value: number | null) {
  if (value === null) return "No current signal";
  if (value < 1) return "<1h old";
  if (value < 24) return `${Math.round(value)}h old`;
  return `${Math.round(value / 24)}d old`;
}

function collectBriefTrends(brief: DailyBriefResponse | null) {
  if (!brief) return [];

  const trends = [
    ...brief.topPriorityActions.map((item) => item.trend),
    ...brief.hiddenGemsWorthWatching,
    ...brief.creatorOpportunities,
    ...brief.topicsToAvoid.map((item) => item.trend),
    ...brief.watchlistMovement
      .map((item) => item.currentTrend)
      .filter((trend): trend is DashboardTrend => trend !== null),
  ];
  const seen = new Set<string>();
  const output: DashboardTrend[] = [];

  for (const trend of trends) {
    const key = trendKey(trend);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trend);
  }

  return output;
}

function isTrendSaved(
  trend: DashboardTrend,
  savedTrendKeys: ReadonlySet<string>,
) {
  return (
    savedTrendKeys.has(trendKey(trend)) ||
    savedTrendKeys.has(trend.slug.trim().toLowerCase()) ||
    savedTrendKeys.has(trend.id.trim().toLowerCase())
  );
}

export function DailyBriefView() {
  const [trendWindow, setTrendWindow] = useState<DashboardWindow>("7d");
  const [brief, setBrief] = useState<DailyBriefResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendSlug, setSelectedTrendSlug] = useState<string | null>(
    null,
  );

  const loadBrief = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/daily-brief?window=${trendWindow}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load daily brief.");
      }

      setBrief(payload as DailyBriefResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load daily brief.",
      );
      setBrief(null);
    } finally {
      setIsLoading(false);
    }
  }, [trendWindow]);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  const savedTrendKeys = useMemo(
    () => new Set(brief?.savedTrendKeys ?? []),
    [brief],
  );
  const availableTrends = useMemo(() => collectBriefTrends(brief), [brief]);
  const selectedTrend = useMemo<DashboardTrend | null>(() => {
    if (!selectedTrendSlug) return null;
    return (
      availableTrends.find((trend) => trend.slug === selectedTrendSlug) ?? null
    );
  }, [availableTrends, selectedTrendSlug]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Daily Intelligence Brief
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              One report for what matters now.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Manual daily brief built from the existing radar, action queue,
              watchlist delta, creator timing and noise suppression layers. No
              email, no PDF, no cron magic. Just the signal without the
              confetti.
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

        {error ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-red-100">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center p-6 text-sm text-muted-foreground/75">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-secondary" />
              Building the daily brief from current intelligence layers...
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !brief ? (
          <Card className="signal-glow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary/15 p-3 text-secondary">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>No brief available</CardTitle>
                  <CardDescription>
                    Run a scan first or check the API response. The brief needs
                    trend snapshots before it can write anything useful.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        {brief ? (
          <>
            <ExecutiveSummaryCard brief={brief} />
            <DailyBriefQaPanel qa={brief.qa} />
            <ExportReadyStructurePanel document={brief.reportDocument} />
            <IntelligenceNarrativesSection
              narratives={brief.intelligenceNarratives}
              onSelectTrend={(slug) => setSelectedTrendSlug(slug)}
            />
            <RadarStatsGrid brief={brief} />

            {brief.overallWarnings.length > 0 ? (
              <WarningsPanel warnings={brief.overallWarnings} />
            ) : null}

            <PriorityActionsSection
              items={brief.topPriorityActions}
              savedTrendKeys={savedTrendKeys}
              selectedWindow={trendWindow}
              onSavedChange={() => void loadBrief()}
              onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
            />

            <WatchlistMovementSection
              items={brief.watchlistMovement}
              onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
            />

            <div className="grid gap-5 xl:grid-cols-2">
              <TrendCollectionSection
                title="Hidden Gems Worth Watching"
                description="Only quality-gated early openings. No obvious noise, no lazy hype traps. We are trying to run a radar, not a rumor mill."
                icon={Sparkles}
                trends={brief.hiddenGemsWorthWatching}
                empty="No clean hidden gem in this window. Widen the range or scan again."
                savedTrendKeys={savedTrendKeys}
                selectedWindow={trendWindow}
                onSavedChange={() => void loadBrief()}
                onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
              />

              <TrendCollectionSection
                title="Best Creator Opportunities"
                description="Topics with usable timing, format fit and acceptable content risk. Basically: what can become a sharp post instead of AI soup."
                icon={Lightbulb}
                trends={brief.creatorOpportunities}
                empty="No creator opportunity has clean timing yet. Better to wait than post lukewarm soup."
                savedTrendKeys={savedTrendKeys}
                selectedWindow={trendWindow}
                onSavedChange={() => void loadBrief()}
                onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
                creatorMode
              />
            </div>

            <TopicsToAvoidSection
              items={brief.topicsToAvoid}
              onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
            />

            <RecommendedFocusCard brief={brief} />
          </>
        ) : null}
      </div>

      <TrendDetailDrawer
        slug={selectedTrendSlug}
        selectedWindow={trendWindow}
        initialTrend={selectedTrend}
        savedTrendKeys={savedTrendKeys}
        savedTrends={brief?.savedTrends ?? []}
        onSavedChange={() => void loadBrief()}
        onClose={() => setSelectedTrendSlug(null)}
        onSelectSlug={setSelectedTrendSlug}
      />
    </AppShell>
  );
}

function ExecutiveSummaryCard({ brief }: { brief: DailyBriefResponse }) {
  return (
    <Card className="overflow-hidden border-secondary/15 bg-[#160d0d]/72 signal-glow">
      <CardHeader>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <FileText className="h-4 w-4" />
              Executive summary
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={postureVariant(brief.briefPosture.posture)}>
                {brief.briefPosture.label}
              </Badge>
              <Badge variant="muted">
                {brief.briefPosture.confidence}/100 confidence
              </Badge>
            </div>
            <CardTitle className="mt-3 text-2xl leading-8">
              {brief.executiveSummary.headline}
            </CardTitle>
            <CardDescription className="mt-3 max-w-4xl text-base leading-7">
              {brief.executiveSummary.narrative}
            </CardDescription>
          </div>
          <div className="min-w-[250px] rounded-2xl border border-border/10 bg-muted/35 px-4 py-3 text-sm text-muted-foreground/75">
            <p>
              Generated {formatDate(brief.generatedAt)} · {brief.window}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground/62">
              {brief.briefPosture.summary}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {brief.executiveSummary.bullets.map((bullet) => (
            <div
              key={bullet}
              className="rounded-2xl border border-border/10 bg-[#0f0808]/45 p-4 text-sm leading-6 text-muted-foreground/82"
            >
              {bullet}
            </div>
          ))}
        </div>
        <SignalList
          title="Posture drivers"
          items={brief.briefPosture.reasons}
          empty="No posture drivers available."
        />
      </CardContent>
    </Card>
  );
}

function RadarStatsGrid({ brief }: { brief: DailyBriefResponse }) {
  const stats = brief.radarStats;

  return (
    <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
      <StatCard label="Tracked" value={stats.totalTrends} icon={Radar} />
      <StatCard label="Act now" value={stats.actNow} icon={Target} />
      <StatCard label="Monitor" value={stats.monitor} icon={Eye} />
      <StatCard label="Hidden gems" value={stats.hiddenGems} icon={Sparkles} />
      <StatCard
        label="Creator"
        value={stats.creatorOpportunities}
        icon={Lightbulb}
      />
      <StatCard
        label="Moving"
        value={stats.watchlistMoving}
        icon={TrendingUp}
      />
      <StatCard
        label="Attention"
        value={stats.watchlistNeedsAttention}
        icon={ShieldAlert}
      />
      <StatCard label="Avoid" value={stats.topicsToAvoid} icon={XCircle} />
      <div className="rounded-2xl border border-border/10 bg-card/62 p-4 md:col-span-2 xl:col-span-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/62">
          Source coverage
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {stats.sourceCoverageLabel}
        </p>
      </div>
      <div className="rounded-2xl border border-border/10 bg-card/62 p-4 md:col-span-2 xl:col-span-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/62">
          Latest scan
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {formatDate(stats.latestScanAt)}
        </p>
      </div>
    </section>
  );
}

function StatCard({
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

function DailyBriefQaPanel({ qa }: { qa: DailyBriefQaSummary }) {
  const visibleAdjustments = qa.narrativeAdjustments.filter(
    (adjustment) => adjustment.status !== "clean",
  );

  return (
    <Card className="border-accent/15 bg-accent/5">
      <CardHeader>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
              <ShieldAlert className="h-4 w-4" />
              Daily Brief QA & narrative tuning
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={qaStatusVariant(qa.status)}>
                {qa.statusLabel}
              </Badge>
              <Badge variant="muted">
                Avg narrative confidence {qa.averageNarrativeConfidence}/100
              </Badge>
              <Badge variant="muted">
                Evidence density {qa.evidenceDensity}/100
              </Badge>
            </div>
            <CardDescription className="mt-3 max-w-4xl text-sm leading-6">
              This layer checks whether the brief is overclaiming. It tunes
              confidence and narrative tone when evidence, source diversity,
              quality gate or action calibration are not strong enough.
            </CardDescription>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2 text-center sm:grid-cols-3">
            <MiniMetric label="Narratives" value={qa.totalNarratives} />
            <MiniMetric label="Calibrated" value={qa.calibratedNarratives} />
            <MiniMetric label="Aggressive" value={qa.aggressiveNarratives} />
            <MiniMetric
              label="Thin evidence"
              value={qa.lowEvidenceNarratives}
            />
            <MiniMetric
              label="Ungrounded"
              value={qa.ungroundedOpportunityNarratives}
            />
            <MiniMetric label="Actionable" value={qa.actionabilityScore} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {qa.warnings.length > 0 ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {qa.warnings.map((warning) => (
              <div
                key={`${warning.title}-${warning.detail}`}
                className="rounded-2xl border border-border/10 bg-[#0f0808]/40 p-4"
              >
                <Badge variant={qaWarningVariant(warning.severity)}>
                  {warning.severity}
                </Badge>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {warning.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground/78">
                  {warning.detail}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4 text-sm leading-6 text-muted-foreground/82">
            No QA warning was triggered. Narrative tone currently matches the
            available evidence.
          </div>
        )}

        {visibleAdjustments.length > 0 ? (
          <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
              Narrative adjustments
            </p>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {visibleAdjustments.slice(0, 4).map((adjustment) => (
                <div
                  key={adjustment.narrativeId}
                  className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3 text-sm leading-6 text-muted-foreground/80"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={calibrationVariant(adjustment.status)}>
                      {calibrationLabel(adjustment.status)}
                    </Badge>
                    <span>
                      {adjustment.confidenceBefore} →{" "}
                      {adjustment.confidenceAfter}
                    </span>
                  </div>
                  <p className="font-medium text-foreground">
                    {adjustment.narrativeTitle}
                  </p>
                  {adjustment.reasons.length > 0 ? (
                    <p className="mt-1 text-xs leading-5 text-muted-foreground/65">
                      {adjustment.reasons[0]}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <SignalList
          title="Tuning notes"
          items={qa.tuningNotes}
          empty="No tuning notes available."
        />
      </CardContent>
    </Card>
  );
}

function ExportReadyStructurePanel({
  document,
}: {
  document: DailyBriefReportDocument;
}) {
  const validationWarnings = document.integrity.validationWarnings;

  return (
    <Card className="border-secondary/15 bg-[#160d0d]/62">
      <CardHeader>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Layers3 className="h-4 w-4" />
              Export-ready report structure
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{document.schemaVersion}</Badge>
              <Badge variant="muted">
                {document.exportTargets.join(" / ")}
              </Badge>
              <Badge
                variant={validationWarnings.length > 0 ? "accent" : "secondary"}
              >
                {validationWarnings.length > 0
                  ? `${validationWarnings.length} export caution${validationWarnings.length === 1 ? "" : "s"}`
                  : "Export clean"}
              </Badge>
            </div>
            <CardDescription className="mt-3 max-w-4xl text-sm leading-6">
              The brief now exposes a stable report document model for later
              HTML, PDF, email and JSON exports. This is not a download feature
              yet; it is the contract that prevents future exports from scraping
              UI cards like a raccoon in a dashboard dumpster.
            </CardDescription>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2 text-center">
            <MiniMetric
              label="Sections"
              value={document.integrity.sectionCount}
            />
            <MiniMetric label="Blocks" value={document.integrity.blockCount} />
            <MiniMetric
              label="Refs"
              value={document.integrity.trendReferenceCount}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
              Section outline
            </p>
            <div className="mt-3 space-y-2">
              {document.sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {section.title}
                    </p>
                    <Badge variant="muted">
                      {section.blocks.length} block
                      {section.blocks.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground/68">
                    {section.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
              Quick-copy payload
            </p>
            <p className="mt-3 text-sm font-semibold leading-6 text-foreground">
              {document.quickCopy.headline}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground/78">
              {document.quickCopy.summary}
            </p>
            <div className="mt-3 rounded-2xl border border-secondary/15 bg-secondary/10 p-3 text-xs leading-5 text-muted-foreground/72">
              Markdown payload ready · {document.quickCopy.markdown.length}
              characters
            </div>
          </div>
        </div>

        {validationWarnings.length > 0 ? (
          <SignalList
            title="Export cautions"
            items={validationWarnings}
            empty="No export cautions."
            danger
          />
        ) : (
          <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4 text-sm leading-6 text-muted-foreground/82">
            Export structure is clean: sections, blocks, trend references and
            quick-copy payload are present. Future export routes can consume
            <span className="font-semibold text-secondary">
              {" "}
              reportDocument{" "}
            </span>
            directly.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntelligenceNarrativesSection({
  narratives,
  onSelectTrend,
}: {
  narratives: DailyBriefNarrative[];
  onSelectTrend: (slug: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-secondary/15 bg-secondary/5 p-4 shadow-card">
      <SectionTitle
        icon={BrainCircuit}
        title="Intelligence Narratives"
        description="A written readout of what the radar thinks is happening: posture, priority thesis, creator lane, watchlist movement and the strongest reason to say no."
      />
      {narratives.length > 0 ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {narratives.map((narrative) => (
            <NarrativeCard
              key={narrative.id}
              narrative={narrative}
              onSelectTrend={onSelectTrend}
            />
          ))}
        </div>
      ) : (
        <EmptyState text="No narrative could be generated from the current radar state." />
      )}
    </section>
  );
}

function NarrativeCard({
  narrative,
  onSelectTrend,
}: {
  narrative: DailyBriefNarrative;
  onSelectTrend: (slug: string) => void;
}) {
  return (
    <Card className="border-border/10 bg-[#160d0d]/58">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={narrativeVariant(narrative.tone)}>
                {narrative.eyebrow}
              </Badge>
              <Badge variant="muted">
                {confidenceLabel(narrative.confidence)} · {narrative.confidence}
                /100
              </Badge>
              {narrative.calibration ? (
                <Badge
                  variant={calibrationVariant(narrative.calibration.status)}
                >
                  {calibrationLabel(narrative.calibration.status)}
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-lg leading-6">
              {narrative.title}
            </CardTitle>
            <CardDescription className="mt-2">
              {narrative.verdict}
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-border/10 bg-[#0f0808]/45 px-4 py-3 text-center">
            <p
              className={`text-2xl font-semibold ${scoreTone(narrative.confidence)}`}
            >
              {narrative.confidence}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Confidence
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/82">
          {narrative.narrative}
        </p>
        <SignalList
          title="Evidence behind the read"
          items={narrative.evidence}
          empty="No supporting evidence available."
          danger={narrative.tone === "risk"}
        />
        {narrative.calibration ? (
          <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 text-sm leading-6 text-muted-foreground/82">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={calibrationVariant(narrative.calibration.status)}>
                {calibrationLabel(narrative.calibration.status)}
              </Badge>
              <span>
                Confidence {narrative.calibration.confidenceBefore} →{" "}
                {narrative.calibration.confidenceAfter}
              </span>
            </div>
            <p>{narrative.calibration.note}</p>
            {narrative.calibration.reasons.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground/68">
                {narrative.calibration.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4 text-sm leading-6 text-muted-foreground/82">
          <span className="font-semibold text-secondary">
            Recommended move:
          </span>{" "}
          {narrative.recommendedMove}
        </div>
        {narrative.relatedTrendSlug ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectTrend(narrative.relatedTrendSlug!)}
          >
            Open intelligence <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function WarningsPanel({ warnings }: { warnings: string[] }) {
  return (
    <Card className="border-primary/15 bg-primary/10">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4 w-4" />
          Brief warnings
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm leading-6 text-red-100/82 md:grid-cols-2">
          {warnings.map((warning) => (
            <li
              key={warning}
              className="rounded-2xl border border-primary/15 bg-[#0f0808]/35 p-3"
            >
              {warning}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PriorityActionsSection({
  items,
  savedTrendKeys,
  selectedWindow,
  onSavedChange,
  onSelectTrend,
}: {
  items: ActionQueueItem[];
  savedTrendKeys: ReadonlySet<string>;
  selectedWindow: DashboardWindow;
  onSavedChange: () => void;
  onSelectTrend: (trend: DashboardTrend) => void;
}) {
  return (
    <section className="rounded-3xl border border-border/10 bg-card/45 p-4 shadow-card">
      <SectionTitle
        icon={Target}
        title="Today’s Priority Actions"
        description="Best Act Now / Monitor candidates from the tuned Action Queue. The point is fewer decisions, not another wall of maybe."
      />
      {items.length > 0 ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <PriorityActionCard
              key={item.trend.id}
              item={item}
              isSaved={isTrendSaved(item.trend, savedTrendKeys)}
              selectedWindow={selectedWindow}
              onSavedChange={onSavedChange}
              onSelectTrend={onSelectTrend}
            />
          ))}
        </div>
      ) : (
        <EmptyState text="No Act Now / Monitor topic cleared the current tuning layer." />
      )}
    </section>
  );
}

function PriorityActionCard({
  item,
  isSaved,
  selectedWindow,
  onSavedChange,
  onSelectTrend,
}: {
  item: ActionQueueItem;
  isSaved: boolean;
  selectedWindow: DashboardWindow;
  onSavedChange: () => void;
  onSelectTrend: (trend: DashboardTrend) => void;
}) {
  const trend = item.trend;

  return (
    <Card className="border-border/10 bg-[#160d0d]/52">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={priorityVariant(item.actionPriority)}>
                {item.actionPriorityLabel}
              </Badge>
              <Badge variant={urgencyVariant(item.urgencyLevel)}>
                {item.urgencyLevel} urgency
              </Badge>
              <Badge variant={qualityVariant(trend)}>
                Quality {trend.topicQuality.score}
              </Badge>
              <Badge variant={lifecycleVariant(trend.lifecycle.status)}>
                {trend.lifecycle.status}
              </Badge>
              {isSaved ? (
                <Badge variant="secondary">
                  <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" />
                  Saved
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-lg leading-6">{trend.topic}</CardTitle>
            <CardDescription className="mt-2">{item.summary}</CardDescription>
          </div>
          <div className="grid min-w-[210px] grid-cols-3 gap-2 text-center">
            <MiniMetric label="Action" value={item.actionScore} />
            <MiniMetric label="Trend" value={trend.trendScore} />
            <MiniMetric
              label="Creator"
              value={trend.creatorOpportunity.score}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/82">
          <span className="font-semibold text-foreground">Next step:</span>{" "}
          {item.recommendedNextStep}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/70">
          <SignalPill icon={Clock3}>
            {signalAgeLabel(trend.lifecycle.latestSignalAgeHours)}
          </SignalPill>
          <SignalPill icon={Radar}>
            {trend.mentionCount} mentions · {trend.sourceCount} sources
          </SignalPill>
          <SignalPill icon={Sparkles}>
            {trend.creatorOpportunity.recommendedTiming} ·{" "}
            {trend.creatorOpportunity.recommendedFormat}
          </SignalPill>
        </div>
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
            isSaved={isSaved}
            selectedWindow={selectedWindow}
            onSavedChange={onSavedChange}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function WatchlistMovementSection({
  items,
  onSelectTrend,
}: {
  items: SavedTrendWithCurrent[];
  onSelectTrend: (trend: DashboardTrend) => void;
}) {
  return (
    <section className="rounded-3xl border border-border/10 bg-card/45 p-4 shadow-card">
      <SectionTitle
        icon={TrendingUp}
        title="Watchlist Movement"
        description="Saved trends that moved, cooled, gained evidence or started smelling suspicious. Yes, saved trends can betray you."
      />
      {items.length > 0 ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <WatchlistMovementCard
              key={item.trendKey}
              item={item}
              onSelectTrend={onSelectTrend}
            />
          ))}
        </div>
      ) : (
        <EmptyState text="No saved trends yet, or no meaningful movement in this window." />
      )}
    </section>
  );
}

function WatchlistMovementCard({
  item,
  onSelectTrend,
}: {
  item: SavedTrendWithCurrent;
  onSelectTrend: (trend: DashboardTrend) => void;
}) {
  const current = item.currentTrend;

  return (
    <Card className="border-border/10 bg-[#160d0d]/52">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={watchStatusVariant(item.delta.watchStatus)}>
                {item.delta.watchStatusLabel}
              </Badge>
              {item.delta.newSignalsCount > 0 ? (
                <Badge variant="secondary">
                  Evidence +{item.delta.newSignalsCount}
                </Badge>
              ) : null}
              {item.delta.lifecycleChanged ? (
                <Badge variant="accent">Lifecycle changed</Badge>
              ) : null}
              <Badge variant={current ? "secondary" : "danger"}>
                {current ? "Current snapshot" : "Missing snapshot"}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-6">
              {current?.topic ?? item.topic}
            </CardTitle>
            <CardDescription className="mt-2">
              {item.delta.summary}
            </CardDescription>
          </div>
          <div className="grid min-w-[210px] grid-cols-3 gap-2 text-center">
            <DeltaMetric
              label="Trend"
              value={item.currentScore}
              delta={item.delta.scoreDelta}
            />
            <DeltaMetric
              label="Creator"
              value={item.currentCreatorOpportunityScore}
              delta={item.delta.creatorOpportunityDelta}
            />
            <DeltaMetric
              label="Quality"
              value={item.currentQualityScore}
              delta={item.delta.qualityDelta}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/82">
          {item.delta.recommendedAction}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/70">
          <SignalPill icon={Clock3}>
            Last signal: {signalAgeLabel(item.lastSignalAgeHours)}
          </SignalPill>
          <SignalPill icon={Activity}>
            Mentions {item.lastSeenMentionCount} →{" "}
            {current?.mentionCount ?? item.lastSeenMentionCount} (
            {formatSigned(item.delta.mentionDelta)})
          </SignalPill>
          <SignalPill icon={Radar}>
            Sources {item.lastSeenSourceCount} →{" "}
            {current?.sourceCount ?? item.lastSeenSourceCount} (
            {formatSigned(item.delta.sourceDelta)})
          </SignalPill>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!current}
          onClick={() => current && onSelectTrend(current)}
        >
          Open intelligence <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function TrendCollectionSection({
  title,
  description,
  icon,
  trends,
  empty,
  savedTrendKeys,
  selectedWindow,
  onSavedChange,
  onSelectTrend,
  creatorMode = false,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  trends: DashboardTrend[];
  empty: string;
  savedTrendKeys: ReadonlySet<string>;
  selectedWindow: DashboardWindow;
  onSavedChange: () => void;
  onSelectTrend: (trend: DashboardTrend) => void;
  creatorMode?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-border/10 bg-card/45 p-4 shadow-card">
      <SectionTitle icon={icon} title={title} description={description} />
      {trends.length > 0 ? (
        <div className="mt-4 space-y-3">
          {trends.map((trend) => (
            <TrendCollectionCard
              key={trend.id}
              trend={trend}
              isSaved={isTrendSaved(trend, savedTrendKeys)}
              selectedWindow={selectedWindow}
              onSavedChange={onSavedChange}
              onSelectTrend={onSelectTrend}
              creatorMode={creatorMode}
            />
          ))}
        </div>
      ) : (
        <EmptyState text={empty} />
      )}
    </section>
  );
}

function TrendCollectionCard({
  trend,
  isSaved,
  selectedWindow,
  onSavedChange,
  onSelectTrend,
  creatorMode,
}: {
  trend: DashboardTrend;
  isSaved: boolean;
  selectedWindow: DashboardWindow;
  onSavedChange: () => void;
  onSelectTrend: (trend: DashboardTrend) => void;
  creatorMode: boolean;
}) {
  return (
    <Card className="border-border/10 bg-[#160d0d]/52">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={qualityVariant(trend)}>
                Quality {trend.topicQuality.score}
              </Badge>
              <Badge variant={lifecycleVariant(trend.lifecycle.status)}>
                {trend.lifecycle.status}
              </Badge>
              <Badge variant="secondary">
                Creator {trend.creatorOpportunity.score}
              </Badge>
              {creatorMode ? (
                <Badge variant="accent">
                  {trend.creatorOpportunity.recommendedTiming}
                </Badge>
              ) : (
                <Badge variant="accent">Hidden {trend.hiddenGemScore}</Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-6">{trend.topic}</CardTitle>
            <CardDescription className="mt-2">
              {creatorMode ? trend.creatorOpportunity.bestAngle : trend.summary}
            </CardDescription>
          </div>
          <div className="grid min-w-[210px] grid-cols-3 gap-2 text-center">
            <MiniMetric label="Trend" value={trend.trendScore} />
            <MiniMetric label="Gap" value={trend.creatorGap} />
            <MiniMetric label="Sat." value={trend.saturation} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/70">
          <SignalPill icon={Radar}>
            {trend.mentionCount} mentions · {trend.sourceCount} sources
          </SignalPill>
          <SignalPill icon={Sparkles}>
            {trend.creatorOpportunity.recommendedFormat}
          </SignalPill>
          <SignalPill icon={Clock3}>
            {signalAgeLabel(trend.lifecycle.latestSignalAgeHours)}
          </SignalPill>
        </div>
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
            isSaved={isSaved}
            selectedWindow={selectedWindow}
            onSavedChange={onSavedChange}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TopicsToAvoidSection({
  items,
  onSelectTrend,
}: {
  items: DailyBriefTopicToAvoid[];
  onSelectTrend: (trend: DashboardTrend) => void;
}) {
  return (
    <section className="rounded-3xl border border-primary/15 bg-primary/10 p-4 shadow-card">
      <SectionTitle
        icon={XCircle}
        title="Topics To Avoid Today"
        description="The useful part of an intelligence system: it should say no. These topics are noisy, stale, generic, saturated or too thin for priority work."
      />
      {items.length > 0 ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {items.map((item) => (
            <TopicToAvoidCard
              key={item.trend.id}
              item={item}
              onSelectTrend={onSelectTrend}
            />
          ))}
        </div>
      ) : (
        <EmptyState text="No major avoid candidate today. That is rare; enjoy the silence." />
      )}
    </section>
  );
}

function TopicToAvoidCard({
  item,
  onSelectTrend,
}: {
  item: DailyBriefTopicToAvoid;
  onSelectTrend: (trend: DashboardTrend) => void;
}) {
  const trend = item.trend;

  return (
    <Card className="border-primary/15 bg-[#160d0d]/58">
      <CardHeader>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant={avoidVariant(item.severity)}>
            {avoidLabels[item.severity]}
          </Badge>
          <Badge variant={qualityVariant(trend)}>
            Quality {trend.topicQuality.score}
          </Badge>
          <Badge variant={lifecycleVariant(trend.lifecycle.status)}>
            {trend.lifecycle.status}
          </Badge>
          <Badge variant="muted">Saturation {trend.saturation}</Badge>
        </div>
        <CardTitle className="text-lg leading-6">{trend.topic}</CardTitle>
        <CardDescription className="mt-2">{item.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.warnings.length > 0 ? (
          <SignalList
            title="Avoidance pressure"
            items={item.warnings}
            empty="No additional warning."
            danger
          />
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectTrend(trend)}
        >
          Inspect anyway <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function RecommendedFocusCard({ brief }: { brief: DailyBriefResponse }) {
  const focus = brief.recommendedFocus;

  return (
    <Card className="border-secondary/15 bg-[#160d0d]/72 signal-glow">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
          <CheckCircle2 className="h-4 w-4" />
          Recommended focus
        </div>
        <CardTitle className="mt-3 text-2xl leading-8">
          What to do after reading the brief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <FocusBlock title="Focus today" text={focus.focusToday} />
          <FocusBlock title="Monitor" text={focus.monitor} />
          <FocusBlock title="Avoid" text={focus.avoid} danger />
        </div>
        <SignalList
          title="Why this focus"
          items={focus.rationale}
          empty="No rationale available."
        />
      </CardContent>
    </Card>
  );
}

function FocusBlock({
  title,
  text,
  danger = false,
}: {
  title: string;
  text: string;
  danger?: boolean;
}) {
  return (
    <div
      className={
        danger
          ? "rounded-2xl border border-primary/15 bg-primary/10 p-4"
          : "rounded-2xl border border-border/10 bg-muted/30 p-4"
      }
    >
      <p
        className={
          danger
            ? "text-xs font-semibold uppercase tracking-[0.18em] text-primary"
            : "text-xs font-semibold uppercase tracking-[0.18em] text-secondary"
        }
      >
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground/82">{text}</p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
          <Icon className="h-4 w-4" />
          {title}
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground/76">
          {description}
        </p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#0f0808]/45 p-3">
      <p className={`text-lg font-semibold ${scoreTone(value)}`}>{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
    </div>
  );
}

function DeltaMetric({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta: number;
}) {
  const deltaClass =
    delta > 0
      ? "text-secondary"
      : delta < 0
        ? "text-primary"
        : "text-muted-foreground/70";

  return (
    <div className="rounded-2xl border border-border/10 bg-[#0f0808]/45 p-3">
      <p className={`text-lg font-semibold ${scoreTone(value)}`}>{value}</p>
      <p className={deltaClass}>{formatSigned(delta)}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
    </div>
  );
}

function SignalPill({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
      <Icon className="mr-1.5 h-3.5 w-3.5 text-secondary" />
      {children}
    </span>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-border/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground/70">
      {text}
    </div>
  );
}
