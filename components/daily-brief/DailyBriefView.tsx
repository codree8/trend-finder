"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookmarkCheck,
  Clipboard,
  Download,
  Eye,
  FileJson,
  FileText,
  Loader2,
  Printer,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProductExperienceBanner } from "@/components/product/ProductExperienceBanner";
import { ProductStateCard } from "@/components/common/ProductStateCard";
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
import {
  defaultProductPreferences,
  parseDashboardWindow,
  productPreferencesChangedEvent,
  readProductPreferences,
  type ProductPreferences,
} from "@/lib/preferences/product-preferences";
import {
  buildDailyBriefHtmlExportUrl,
  buildDailyBriefJsonExportUrl,
  buildDailyBriefPdfExportUrl,
  buildDailyBriefPdfPrepUrl,
} from "@/lib/trends/daily-brief-export-links";
import {
  buildTemplateMarkdown,
  getReportTemplate,
  getTemplateHeroBlocks,
} from "@/lib/reports/report-templates";
import type {
  ActionQueueItem,
  DailyBriefResponse,
  DailyBriefTopicToAvoid,
  DashboardTrend,
  DashboardWindow,
} from "@/lib/trends/types";

const windowOptions: DashboardWindow[] = ["24h", "7d", "30d"];

type CopyState = "idle" | "copied" | "failed";

function getInitialWindow() {
  return parseDashboardWindow(defaultProductPreferences.defaultBriefWindow);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No scan yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function postureVariant(posture: DailyBriefResponse["briefPosture"]["posture"]): BadgeProps["variant"] {
  if (posture === "offensive") return "secondary";
  if (posture === "selective") return "accent";
  return "danger";
}

function actionVariant(priority: ActionQueueItem["actionPriority"]): BadgeProps["variant"] {
  if (priority === "act_now") return "secondary";
  if (priority === "monitor") return "accent";
  if (priority === "review") return "muted";
  return "danger";
}

function avoidVariant(item: DailyBriefTopicToAvoid): BadgeProps["variant"] {
  if (item.severity === "noise" || item.severity === "generic") return "danger";
  if (item.severity === "saturated" || item.severity === "stale") return "accent";
  return "muted";
}

async function copyText(value: string) {
  if (!navigator.clipboard) throw new Error("Clipboard is not available.");
  await navigator.clipboard.writeText(value);
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <Card className="border-border/10 bg-[#160d0d]/62">
      <CardHeader>
        <p className="text-3xl font-semibold tracking-[-0.05em] text-foreground">{value}</p>
        <CardTitle className="text-sm">{label}</CardTitle>
        <CardDescription>{helper}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function TrendMiniCard({ trend, selectedWindow, onOpen }: { trend: DashboardTrend; selectedWindow: DashboardWindow; onOpen: (trend: DashboardTrend) => void }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{trend.topic}</p>
            <Badge variant="muted">{trend.category}</Badge>
            <Badge variant={trend.status === "Hidden Gem" ? "secondary" : "accent"}>{trend.status}</Badge>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground/76">{trend.summary}</p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            Score {trend.trendScore} · Hidden gem {trend.hiddenGemScore} · {trend.sources.slice(0, 3).join(", ") || "No source label"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <WatchlistButton trend={trend} isSaved={false} selectedWindow={selectedWindow} size="sm" variant="outline" />
          <Button type="button" size="sm" variant="ghost" onClick={() => onOpen(trend)}>
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DailyBriefView() {
  const [preferences, setPreferences] = useState<ProductPreferences>(defaultProductPreferences);
  const [selectedWindow, setSelectedWindow] = useState<DashboardWindow>(getInitialWindow);
  const [brief, setBrief] = useState<DailyBriefResponse | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<DashboardTrend | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const template = getReportTemplate(preferences.reportTemplate);

  const loadBrief = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/daily-brief?window=${selectedWindow}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Daily Brief could not be loaded.");
      }
      setBrief(payload as DailyBriefResponse);
    } catch (loadError) {
      setBrief(null);
      setError(loadError instanceof Error ? loadError.message : "Daily Brief could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedWindow]);

  useEffect(() => {
    function syncPreferences() {
      const next = readProductPreferences();
      setPreferences(next);
      setSelectedWindow((current) => current || parseDashboardWindow(next.defaultBriefWindow));
    }

    syncPreferences();
    window.addEventListener(productPreferencesChangedEvent, syncPreferences);
    window.addEventListener("storage", syncPreferences);
    return () => {
      window.removeEventListener(productPreferencesChangedEvent, syncPreferences);
      window.removeEventListener("storage", syncPreferences);
    };
  }, []);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  const markdown = useMemo(() => {
    if (!brief) return "";
    return buildTemplateMarkdown(brief.reportDocument, preferences.reportTemplate);
  }, [brief, preferences.reportTemplate]);

  const heroBlocks = useMemo(() => {
    if (!brief) return [];
    return getTemplateHeroBlocks(brief.reportDocument, preferences.reportTemplate, 4);
  }, [brief, preferences.reportTemplate]);

  const memoCards = useMemo(() => {
    if (!brief) return [];

    const topAction = brief.topPriorityActions[0] ?? null;
    const bestCreator = brief.creatorOpportunities[0] ?? null;
    const bestGem = brief.hiddenGemsWorthWatching[0] ?? null;
    const bestResearch = brief.researchSignals[0] ?? null;
    const avoid = brief.topicsToAvoid[0] ?? null;

    return [
      {
        label: "Today’s best move",
        value: topAction
          ? topAction.recommendedNextStep
          : brief.recommendedFocus.focusToday,
      },
      {
        label: "What changed",
        value:
          brief.watchlistMovement[0]?.delta.summary ??
          brief.intelligenceNarratives.find((item) => item.id === "market-posture")?.verdict ??
          "No major saved-trend movement yet. Use the current scan as the baseline.",
      },
      {
        label: "Act on now",
        value: topAction
          ? `${topAction.trend.topic}: ${topAction.summary}`
          : "No topic cleared the Act Now bar. That is a result, not a failure.",
      },
      {
        label: "Watch",
        value: bestGem
          ? `${bestGem.topic}: ${bestGem.productIntelligence.classificationLabel}`
          : brief.recommendedFocus.monitor,
      },
      {
        label: "Avoid",
        value: avoid
          ? `${avoid.trend.topic}: ${avoid.reason}`
          : brief.recommendedFocus.avoid,
      },
      {
        label: "Best creator opportunity",
        value: bestCreator
          ? `${bestCreator.topic}: ${bestCreator.creatorOpportunity.bestAngle}`
          : "No clean creator lane yet. Better silence than content soup.",
      },
      {
        label: "Best research signal",
        value: bestResearch
          ? `${bestResearch.topic}: ${bestResearch.researchSignal.summary}`
          : "No arXiv-backed candidate is changing today's focus yet.",
      },
      {
        label: "Best startup/research angle",
        value: (topAction?.trend ?? bestResearch ?? bestGem)?.productIntelligence.startupAngle ??
          "Wait for stronger evidence before framing a startup or research thesis.",
      },
      {
        label: "Confidence + caveat",
        value: `${brief.briefPosture.confidence}/100 confidence. ${brief.overallWarnings[0] ?? "No major caveat beyond normal source validation."}`,
      },
    ];
  }, [brief]);

  const exportLinks = useMemo(
    () => [
      {
        label: "Open PDF",
        href: buildDailyBriefPdfExportUrl(selectedWindow),
        icon: FileText,
        primary: preferences.defaultExport === "pdf",
      },
      {
        label: "Print-ready",
        href: buildDailyBriefPdfPrepUrl(selectedWindow),
        icon: Printer,
        primary: preferences.defaultExport === "markdown",
      },
      {
        label: "Open HTML",
        href: buildDailyBriefHtmlExportUrl(selectedWindow),
        icon: Eye,
        primary: preferences.defaultExport === "html",
      },
      {
        label: "Download JSON",
        href: buildDailyBriefJsonExportUrl(selectedWindow, { download: true }),
        icon: FileJson,
        primary: preferences.defaultExport === "json",
      },
    ],
    [preferences.defaultExport, selectedWindow],
  );

  async function handleCopySummary() {
    if (!markdown) return;
    setCopyState("idle");
    try {
      await copyText(markdown);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <ProductExperienceBanner />

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Product / Daily Brief
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Today&apos;s useful signals, without the diagnostics fog.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              A simplified decision brief for what to act on, watch, turn into content, or avoid. Technical checks live in Admin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {windowOptions.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={selectedWindow === option ? "secondary" : "outline"}
                onClick={() => setSelectedWindow(option)}
              >
                {option}
              </Button>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => void loadBrief()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </section>

        {error ? (
          <ProductStateCard
            variant="error"
            title="Daily Brief could not be loaded"
            description={error}
            action={<button type="button" onClick={() => void loadBrief()}>Try again</button>}
          />
        ) : null}

        {isLoading ? (
          <ProductStateCard
            variant="loading"
            title="Building Daily Brief"
            description="Reading the latest trend, watchlist and action queue signals."
          />
        ) : null}

        {!isLoading && !error && !brief ? (
          <ProductStateCard
            title="No Daily Brief yet"
            description="Run a scan first, then return here. The brief needs current trend snapshots before it can say anything useful."
            action={<Link href="/dashboard">Open dashboard</Link>}
          />
        ) : null}

        {brief ? (
          <>
            <Card className="border-secondary/15 bg-[#160d0d]/70 signal-glow">
              <CardHeader>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={postureVariant(brief.briefPosture.posture)}>{brief.briefPosture.label}</Badge>
                      <Badge variant="muted">{template.label}</Badge>
                      <Badge variant="muted">Latest scan: {formatDate(brief.radarStats.latestScanAt)}</Badge>
                    </div>
                    <CardTitle className="mt-4 text-3xl tracking-[-0.045em] md:text-4xl">
                      {brief.executiveSummary.headline}
                    </CardTitle>
                    <CardDescription className="mt-3 max-w-4xl text-base leading-7">
                      {brief.executiveSummary.narrative}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exportLinks.map((link) => (
                      <Button key={link.label} asChild size="sm" variant={link.primary ? "secondary" : "outline"}>
                        <a href={link.href} target="_blank" rel="noreferrer">
                          <link.icon className="mr-2 h-4 w-4" />
                          {link.label}
                        </a>
                      </Button>
                    ))}
                    <Button type="button" size="sm" variant="ghost" onClick={() => void handleCopySummary()}>
                      <Clipboard className="mr-2 h-4 w-4" />
                      {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy summary"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Priority actions" value={brief.radarStats.actNow} helper="Items worth acting on now." />
              <MetricCard label="Hidden gems" value={brief.radarStats.hiddenGems} helper="Early signals with room before saturation." />
              <MetricCard label="Creator opportunities" value={brief.radarStats.creatorOpportunities} helper="Topics with content timing upside." />
              <MetricCard label="Research signals" value={brief.radarStats.researchSignals} helper="arXiv-backed candidates to validate." />
              <MetricCard label="Avoid" value={brief.radarStats.topicsToAvoid} helper="Noisy, weak or over-saturated topics." />
            </section>

            <Card className="border-secondary/15 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Target className="h-4 w-4" />
                  Intelligence memo
                </div>
                <CardTitle>What matters now, not every metric the system knows.</CardTitle>
                <CardDescription>
                  A product-facing readout shaped by source quality, trend quality, watchlist movement and the active report template.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {memoCards.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/88">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Target className="h-4 w-4" />
                  Recommended focus
                </div>
                <CardTitle>{brief.recommendedFocus.focusToday}</CardTitle>
                <CardDescription>{brief.recommendedFocus.monitor}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">Do now</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{brief.recommendedFocus.focusToday}</p>
                </div>
                <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">Monitor</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{brief.recommendedFocus.monitor}</p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">Avoid</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{brief.recommendedFocus.avoid}</p>
                </div>
              </CardContent>
            </Card>

            {preferences.reportTemplate === "pitch" || preferences.experienceMode === "pitch" ? (
              <Card className="border-secondary/15 bg-secondary/10">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                    <Sparkles className="h-4 w-4" />
                    Pitch mode
                  </div>
                  <CardTitle>{template.headline}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {brief.topPriorityActions.length > 0 ? (
              <Card className="border-border/10 bg-[#160d0d]/62">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                    <TrendingUp className="h-4 w-4" />
                    Priority actions
                  </div>
                  <CardTitle>What deserves attention first</CardTitle>
                  <CardDescription>Actionable topics only. Admin scoring details stay out of this view.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brief.topPriorityActions.slice(0, 5).map((item) => (
                    <div key={item.trend.id} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{item.trend.topic}</p>
                            <Badge variant={actionVariant(item.actionPriority)}>{item.actionPriorityLabel}</Badge>
                            <Badge variant="muted">Score {item.actionScore}</Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground/76">{item.summary}</p>
                          <p className="mt-2 text-sm text-secondary">{item.recommendedNextStep}</p>
                        </div>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setSelectedTrend(item.trend); setSelectedSlug(item.trend.slug); }}>
                          Details <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <section className="grid gap-4 xl:grid-cols-2">
              <Card className="border-border/10 bg-[#160d0d]/62">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                    <Sparkles className="h-4 w-4" />
                    Hidden gems
                  </div>
                  <CardTitle>Early signals worth watching</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brief.hiddenGemsWorthWatching.length > 0 ? (
                    brief.hiddenGemsWorthWatching.slice(0, 5).map((trend) => (
                      <TrendMiniCard key={trend.id} trend={trend} selectedWindow={selectedWindow} onOpen={(nextTrend) => { setSelectedTrend(nextTrend); setSelectedSlug(nextTrend.slug); }} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground/72">No strong hidden gems in this window.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/10 bg-[#160d0d]/62">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                    <BookmarkCheck className="h-4 w-4" />
                    Watchlist movement
                  </div>
                  <CardTitle>Saved topics that changed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brief.watchlistMovement.length > 0 ? (
                    brief.watchlistMovement.slice(0, 5).map((item) => (
                      <div key={item.trendKey} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{item.topic}</p>
                          <Badge variant="muted">{item.delta.watchStatusLabel}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground/76">{item.delta.summary}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground/72">No saved trend movement yet.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            {brief.creatorOpportunities.length > 0 ? (
              <Card className="border-border/10 bg-[#160d0d]/62">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                    <Sparkles className="h-4 w-4" />
                    Creator opportunities
                  </div>
                  <CardTitle>Content angles with timing upside</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 xl:grid-cols-2">
                  {brief.creatorOpportunities.slice(0, 6).map((trend) => (
                    <TrendMiniCard key={trend.id} trend={trend} selectedWindow={selectedWindow} onOpen={(nextTrend) => { setSelectedTrend(nextTrend); setSelectedSlug(nextTrend.slug); }} />
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {brief.topicsToAvoid.length > 0 ? (
              <Card className="border-primary/15 bg-primary/10">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <XCircle className="h-4 w-4" />
                    Topics to avoid
                  </div>
                  <CardTitle>Not every signal deserves a microphone</CardTitle>
                  <CardDescription>These topics look noisy, weak, stale or too saturated for clean action.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brief.topicsToAvoid.slice(0, 5).map((item) => (
                    <div key={item.trend.id} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.trend.topic}</p>
                        <Badge variant={avoidVariant(item)}>{item.severity.replace("_", " ")}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground/76">{item.reason}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Download className="h-4 w-4" />
                  Report-ready structure
                </div>
                <CardTitle>{template.label}</CardTitle>
                <CardDescription>{template.bestFor}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {heroBlocks.map((block) => (
                  <div key={block.id} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                    <Badge variant={block.tone === "danger" ? "danger" : block.tone === "warning" ? "accent" : "muted"}>
                      {block.type.replace("_", " ")}
                    </Badge>
                    <p className="mt-3 text-sm font-semibold text-foreground">{block.title}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground/68">
                      {block.body ?? block.description ?? "Ready for export."}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <TrendDetailDrawer
        slug={selectedSlug}
        selectedWindow={selectedWindow}
        initialTrend={selectedTrend}
        onClose={() => { setSelectedTrend(null); setSelectedSlug(null); }}
        onSelectSlug={(slug) => setSelectedSlug(slug)}
      />
    </AppShell>
  );
}
