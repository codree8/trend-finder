"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BrainCircuit,
  CheckCircle2,
  RefreshCcw,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProductStateCard } from "@/components/common/ProductStateCard";
import { SuppressedNoiseSummary } from "@/components/admin/SuppressedNoiseSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  defaultProductPreferences,
  productPreferencesChangedEvent,
  readProductPreferences,
  updateProductPreferences,
  type ProductPreferences,
  type SourceWeightKey,
  type SourceWeightPreferences,
} from "@/lib/preferences/product-preferences";
import { productPreferenceScore, sourceWeightMultiplier } from "@/lib/product/apply-product-preferences";
import { buildTrendCalibrationBreakdown } from "@/lib/product/intelligence-scoring";
import type {
  DashboardTrend,
  DashboardTrendsResponse,
  DashboardWindow,
  LatestScanStatus,
  TrendVisibilitySummary,
} from "@/lib/trends/types";

const windows: DashboardWindow[] = ["24h", "7d", "30d"];
const qaNotesStorageKey = "trend-finder-admin-qa-notes-v1";
const qaNoteOptions = [
  "Strong signal",
  "Watch only",
  "Likely noise",
  "Needs more sources",
  "Good creator opportunity",
  "Good startup opportunity",
  "Too saturated",
  "Thin evidence",
] as const;

type QaNote = (typeof qaNoteOptions)[number];
type QaNotesState = Record<string, QaNote>;

const sourceRows: Array<{ key: SourceWeightKey; label: string }> = [
  { key: "github", label: "GitHub" },
  { key: "hackerNews", label: "Hacker News" },
  { key: "rss", label: "RSS / Blogs" },
  { key: "reddit", label: "Reddit" },
  { key: "youtube", label: "YouTube" },
  { key: "arxiv", label: "arXiv" },
];

type CalibrationPreset = {
  id: string;
  label: string;
  detail: string;
  weights: SourceWeightPreferences;
  includeKeywords: string[];
  minimumTrendScore: number;
  prioritizeHiddenGems: boolean;
};

const presets: CalibrationPreset[] = [
  {
    id: "creator",
    label: "Creator",
    detail: "Prioritize creator angles, hidden gems and high-signal communities.",
    weights: { github: 1.05, hackerNews: 1.15, rss: 1, reddit: 1.2, youtube: 1.1, arxiv: 0.9 },
    includeKeywords: ["creator", "video", "workflow", "tutorial", "tool"],
    minimumTrendScore: 35,
    prioritizeHiddenGems: true,
  },
  {
    id: "startup",
    label: "Startup Founder",
    detail: "Push applied product, adoption and builder signals.",
    weights: { github: 1.2, hackerNews: 1.2, rss: 1.05, reddit: 0.95, youtube: 0.85, arxiv: 0.9 },
    includeKeywords: ["agent", "workflow", "api", "automation", "product"],
    minimumTrendScore: 40,
    prioritizeHiddenGems: true,
  },
  {
    id: "researcher",
    label: "Researcher",
    detail: "Increase technical and research-source pressure.",
    weights: { github: 1.15, hackerNews: 1, rss: 1.1, reddit: 0.8, youtube: 0.7, arxiv: 1.5 },
    includeKeywords: ["paper", "benchmark", "model", "evaluation", "dataset"],
    minimumTrendScore: 30,
    prioritizeHiddenGems: false,
  },
  {
    id: "investor",
    label: "Investor",
    detail: "Favor cross-source momentum and market-facing signals.",
    weights: { github: 1.05, hackerNews: 1.25, rss: 1.25, reddit: 0.9, youtube: 0.8, arxiv: 0.8 },
    includeKeywords: ["market", "startup", "platform", "adoption", "revenue"],
    minimumTrendScore: 45,
    prioritizeHiddenGems: true,
  },
  {
    id: "content-strategist",
    label: "Content Strategist",
    detail: "Balance audience pull, novelty and repeatable content formats.",
    weights: { github: 1, hackerNews: 1.1, rss: 1.05, reddit: 1.15, youtube: 1.15, arxiv: 0.8 },
    includeKeywords: ["guide", "comparison", "mistake", "use case", "trend"],
    minimumTrendScore: 35,
    prioritizeHiddenGems: true,
  },
];

function scoreDeltaLabel(value: number) {
  if (value > 0) return `+${Math.round(value)}`;
  return String(Math.round(value));
}

function sourceKeyLabel(sources: string[]) {
  return sources.length > 0 ? sources.slice(0, 3).join(", ") : "No source label";
}

function movementIcon(delta: number) {
  if (delta > 0) return <ArrowUp className="h-4 w-4 text-secondary" />;
  if (delta < 0) return <ArrowDown className="h-4 w-4 text-primary" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function readQaNotes(): QaNotesState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(qaNotesStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) =>
        qaNoteOptions.includes(value as QaNote),
      ),
    ) as QaNotesState;
  } catch {
    return {};
  }
}

function writeQaNotes(nextNotes: QaNotesState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(qaNotesStorageKey, JSON.stringify(nextNotes));
}

function qaNoteVariant(note: QaNote | undefined) {
  if (!note) return "muted" as const;
  if (note === "Strong signal" || note === "Good creator opportunity" || note === "Good startup opportunity") return "secondary" as const;
  if (note === "Likely noise" || note === "Too saturated" || note === "Thin evidence") return "danger" as const;
  return "accent" as const;
}

function scoreBand(value: number) {
  if (value >= 70) return "secondary" as const;
  if (value >= 45) return "accent" as const;
  return "danger" as const;
}

function firstOrFallback(items: string[], fallback: string) {
  return items.length > 0 ? items[0] : fallback;
}

function emptyVisibilitySummary(): TrendVisibilitySummary {
  return {
    totalEvaluated: 0,
    productVisible: 0,
    hiddenFromProduct: 0,
    byStatus: {
      priority: 0,
      strong: 0,
      watch: 0,
      research_only: 0,
      suppressed: 0,
      rejected: 0,
    },
    suppressed: 0,
    rejected: 0,
    researchOnly: 0,
    topSuppressionReasons: [],
  };
}

export function ScoringCalibrationLabView() {
  const [preferences, setPreferences] = useState<ProductPreferences>(defaultProductPreferences);
  const [windowValue, setWindowValue] = useState<DashboardWindow>("7d");
  const [trends, setTrends] = useState<DashboardTrend[]>([]);
  const [visibilitySummary, setVisibilitySummary] =
    useState<TrendVisibilitySummary>(() => emptyVisibilitySummary());
  const [latestScan, setLatestScan] = useState<LatestScanStatus | null>(null);
  const [qaNotes, setQaNotes] = useState<QaNotesState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAppliedPreset, setLastAppliedPreset] = useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/trends?window=${windowValue}&includeSuppressed=1`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load calibration sample.");
      }
      const data = payload as DashboardTrendsResponse;
      setTrends(data.trends.slice(0, 24));
      setVisibilitySummary(data.visibilitySummary);
      setLatestScan(data.latestScan);
    } catch (loadError) {
      setTrends([]);
      setVisibilitySummary(emptyVisibilitySummary());
      setLatestScan(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load calibration sample.");
    } finally {
      setIsLoading(false);
    }
  }, [windowValue]);

  useEffect(() => {
    function handlePreferenceChange() {
      setPreferences(readProductPreferences());
    }

    handlePreferenceChange();
    setQaNotes(readQaNotes());
    window.addEventListener(productPreferencesChangedEvent, handlePreferenceChange);
    window.addEventListener("storage", handlePreferenceChange);
    return () => {
      window.removeEventListener(productPreferencesChangedEvent, handlePreferenceChange);
      window.removeEventListener("storage", handlePreferenceChange);
    };
  }, []);

  useEffect(() => {
    void loadTrends();
  }, [loadTrends]);

  const beforeRows = useMemo(
    () => [...trends].sort((a, b) => b.trendScore - a.trendScore).slice(0, 10),
    [trends],
  );

  const calibratedRows = useMemo(() => {
    return trends
      .map((trend) => {
        const adjustedScore = Math.max(0, productPreferenceScore(trend, preferences));
        const multiplier = sourceWeightMultiplier(trend.sources, preferences.sourceWeights);
        const breakdown = buildTrendCalibrationBreakdown(trend, preferences);
        const beforeRank = beforeRows.findIndex((item) => item.id === trend.id) + 1;

        return {
          trend,
          adjustedScore,
          delta: adjustedScore - trend.trendScore,
          multiplier,
          breakdown,
          beforeRank: beforeRank || null,
        };
      })
      .sort((a, b) => b.adjustedScore - a.adjustedScore || b.trend.trendScore - a.trend.trendScore)
      .slice(0, 10)
      .map((row, index) => ({ ...row, afterRank: index + 1 }));
  }, [beforeRows, preferences, trends]);

  const calibrationNotes = useMemo(() => {
    const notes: string[] = [];
    const boosted = Object.values(preferences.sourceWeights).filter((value) => value > 1.1).length;
    const reduced = Object.values(preferences.sourceWeights).filter((value) => value < 0.9).length;
    if (boosted > 0) notes.push(`${boosted} source groups are boosted above 1.10x.`);
    if (reduced > 0) notes.push(`${reduced} source groups are reduced below 0.90x.`);
    if (preferences.interestProfile.minimumTrendScore > 0) notes.push(`Minimum product score filter is ${preferences.interestProfile.minimumTrendScore}.`);
    if (preferences.interestProfile.includeKeywords.length > 0) notes.push(`Keyword boosts: ${preferences.interestProfile.includeKeywords.join(", ")}.`);
    if (preferences.interestProfile.prioritizeHiddenGems) notes.push("Hidden gems receive additional product ranking pressure.");
    return notes.length > 0 ? notes : ["Using neutral product calibration."];
  }, [preferences]);

  function patchSourceWeight(key: SourceWeightKey, value: number) {
    setLastAppliedPreset(null);
    setPreferences(
      updateProductPreferences((current) => ({
        ...current,
        sourceWeights: {
          ...current.sourceWeights,
          [key]: value,
        },
      })),
    );
  }

  function applyPreset(preset: CalibrationPreset) {
    setLastAppliedPreset(preset.label);
    setPreferences(
      updateProductPreferences((current) => ({
        ...current,
        sourceWeights: preset.weights,
        interestProfile: {
          ...current.interestProfile,
          includeKeywords: preset.includeKeywords,
          minimumTrendScore: preset.minimumTrendScore,
          prioritizeHiddenGems: preset.prioritizeHiddenGems,
        },
      })),
    );
  }

  function applyRecommendedWeights() {
    const preset = preferences.reportTemplate === "research" ? presets[2] : preferences.reportTemplate === "pitch" ? presets[1] : presets[0];
    applyPreset(preset);
  }

  function setTrendQaNote(trend: DashboardTrend, note: QaNote) {
    const key = trend.canonicalKey || trend.id;
    const next = { ...qaNotes, [key]: note };
    setQaNotes(next);
    writeQaNotes(next);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / Scoring Calibration v3
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl md:text-5xl">
              Explain the rank before touching the model.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This lab previews product-layer calibration: source quality, freshness, lifecycle, quality gate, creator opportunity, diversity, penalties and hidden-gem pressure. Stored snapshots are not rewritten.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {windows.map((option) => (
              <Button key={option} size="sm" variant={windowValue === option ? "secondary" : "outline"} onClick={() => setWindowValue(option)}>
                {option}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => void loadTrends()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </section>

        <Card className="border-secondary/15 bg-[#160d0d]/66 signal-glow">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <BrainCircuit className="h-4 w-4" />
              Scoring presets
            </div>
            <CardTitle>Pick the lens you are optimizing for</CardTitle>
            <CardDescription>
              Presets update local source weights and interest keywords only. They do not change database scores.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 text-left transition hover:border-secondary/30 hover:bg-secondary/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{preset.label}</p>
                  {lastAppliedPreset === preset.label ? <CheckCircle2 className="h-4 w-4 text-secondary" /> : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground/70">{preset.detail}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <SlidersHorizontal className="h-4 w-4" />
              Source quality weighting
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Calibration controls</CardTitle>
                <CardDescription>
                  Normal is 1.00x, low is 0.50x, high is 1.50x. Keep it boring unless the data proves otherwise.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={applyRecommendedWeights}>
                Apply recommended weights
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sourceRows.map((source) => (
              <div key={source.key} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{source.label}</p>
                  <Badge variant="muted">{preferences.sourceWeights[source.key].toFixed(2)}x</Badge>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={preferences.sourceWeights[source.key]}
                  onChange={(event) => patchSourceWeight(source.key, Number(event.target.value))}
                  className="mt-4 w-full"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>Current calibration notes</CardTitle>
            <CardDescription>What the current preference layer is doing to ranking.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {calibrationNotes.map((note) => (
              <div key={note} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3 text-sm text-muted-foreground/78">
                {note}
              </div>
            ))}
          </CardContent>
        </Card>

        <SuppressedNoiseSummary summary={visibilitySummary} latestScan={latestScan} />


        {error ? <ProductStateCard variant="error" title="Calibration sample failed" description={error} /> : null}
        {isLoading ? <ProductStateCard variant="loading" title="Loading calibration sample" description="Reading current trend snapshots for a safe ranking preview." /> : null}
        {!isLoading && !error && calibratedRows.length === 0 ? (
          <ProductStateCard
            title="No sample trends available"
            description="Run a scan first or loosen your interest profile so the lab has trends to compare. No calibration can happen on an empty radar. Science is rude like that."
            secondaryAction={<Link href="/dashboard">Open dashboard</Link>}
          />
        ) : null}

        {calibratedRows.length > 0 ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Activity className="h-4 w-4" />
                  Before ranking
                </div>
                <CardTitle>Canonical score order</CardTitle>
                <CardDescription>Stored trend score before product preference pressure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {beforeRows.map((trend, index) => (
                  <div key={trend.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{index + 1}. {trend.topic}</p>
                      <p className="text-xs text-muted-foreground/65">{sourceKeyLabel(trend.sources)}</p>
                    </div>
                    <Badge variant="muted">{trend.trendScore}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-secondary/15 bg-[#160d0d]/72 signal-glow">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Activity className="h-4 w-4" />
                  After ranking
                </div>
                <CardTitle>Product-adjusted order</CardTitle>
                <CardDescription>Preview of how Settings and presets change product ranking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {calibratedRows.map((row) => (
                  <div key={row.trend.id} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{row.afterRank}. {row.trend.topic}</p>
                          <Badge variant={row.delta >= 0 ? "secondary" : "accent"}>{scoreDeltaLabel(row.delta)}</Badge>
                          {row.beforeRank ? <Badge variant="muted">before #{row.beforeRank}</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground/65">{row.breakdown.movementExplanation}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {movementIcon(row.delta)}
                        <Badge variant="secondary">{Math.round(row.adjustedScore)}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground/60">
                      {sourceKeyLabel(row.trend.sources)} · source multiplier {row.multiplier.toFixed(2)}x · stored {row.trend.trendScore}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {calibratedRows.length > 0 ? (
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                <ShieldAlert className="h-4 w-4" />
                Per-trend QA and score breakdown
              </div>
              <CardTitle>Why each trend moved</CardTitle>
              <CardDescription>
                Admin-only notes are stored locally in the browser. Use them to mark quality without touching historical snapshots.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {calibratedRows.map((row) => {
                const noteKey = row.trend.canonicalKey || row.trend.id;
                const selectedNote = qaNotes[noteKey];
                const breakdownItems = [
                  ["Source", row.breakdown.sourceContribution],
                  ["Freshness", row.breakdown.freshnessContribution],
                  ["Signal aging", -row.trend.signalAging.decayPenalty],
                  ["Validation", row.trend.trendValidation.validationScore],
                  ["Consistency", row.trend.actionConsistency.score],
                  ["Lifecycle", row.breakdown.lifecycleContribution],
                  ["Quality gate", row.breakdown.qualityGateContribution],
                  ["Creator", row.breakdown.creatorOpportunityContribution],
                  ["Diversity", row.breakdown.sourceDiversityContribution],
                  ["Research", row.breakdown.researchSignalContribution],
                  ["Research-only", -row.breakdown.researchOnlyPenalty],
                  ["Weak evidence", -row.breakdown.weakEvidencePenalty],
                  ["Noise", -row.breakdown.noiseRiskPenalty],
                  ["Saturation", -row.breakdown.mainstreamSaturationPenalty],
                  ["Hidden gem", row.breakdown.hiddenGemBoost],
                ] as const;

                return (
                  <div key={row.trend.id} className="rounded-3xl border border-border/10 bg-[#0f0808]/35 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="muted">#{row.afterRank}</Badge>
                          <Badge variant={qaNoteVariant(selectedNote)}>{selectedNote ?? "No QA note"}</Badge>
                          <p className="text-sm font-semibold text-foreground">{row.trend.topic}</p>
                        </div>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground/76">
                          {row.breakdown.explanation} {row.breakdown.movementExplanation}
                        </p>
                      </div>
                      <select
                        value={selectedNote ?? ""}
                        onChange={(event) => setTrendQaNote(row.trend, event.target.value as QaNote)}
                        className="rounded-xl border border-border/10 bg-[#160d0d] px-3 py-2 text-sm text-foreground outline-none"
                      >
                        <option value="" disabled>Choose QA note</option>
                        {qaNoteOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                      {breakdownItems.map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-border/10 bg-muted/20 p-3">
                          <p className="text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground/55">{label}</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{value > 0 ? "+" : ""}{Math.round(value)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-border/10 bg-[#160d0d]/50 p-3">
                        <Badge variant={scoreBand(row.trend.sourceQuality.crossSourceConfirmationScore)}>Source contribution</Badge>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground/72">{row.trend.sourceQuality.summary}</p>
                      </div>
                      <div className="rounded-2xl border border-border/10 bg-[#160d0d]/50 p-3">
                        <Badge variant={scoreBand(row.trend.researchSignal.score)}>Research signal</Badge>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground/72">
                          {row.trend.researchSignal.summary} {row.trend.researchSignal.caveat}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/10 bg-[#160d0d]/50 p-3">
                        <Badge variant={row.trend.signalAging.status === "fresh" || row.trend.signalAging.status === "active" ? "secondary" : row.trend.signalAging.status === "stale" ? "danger" : "accent"}>Signal aging</Badge>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground/72">{row.trend.signalAging.summary}</p>
                      </div>
                      <div className="rounded-2xl border border-border/10 bg-[#160d0d]/50 p-3">
                        <Badge variant={row.trend.actionConsistency.status === "clean" ? "secondary" : row.trend.actionConsistency.status === "review" ? "accent" : "danger"}>Action consistency</Badge>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground/72">{row.trend.actionConsistency.summary}</p>
                      </div>
                      <div className="rounded-2xl border border-border/10 bg-[#160d0d]/50 p-3">
                        <Badge variant={scoreBand(row.trend.topicQuality.score)}>Positive driver</Badge>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground/72">
                          {firstOrFallback(row.breakdown.positiveDrivers, "No dominant positive driver yet.")}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/10 bg-[#160d0d]/50 p-3">
                        <Badge variant={row.breakdown.negativePressure.length > 0 ? "accent" : "secondary"}>Calibration action</Badge>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground/72">{row.breakdown.recommendedCalibrationAction}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-primary/15 bg-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <AlertTriangle className="h-4 w-4" />
              Calibration boundary
            </div>
            <CardTitle>No historical rewrite</CardTitle>
            <CardDescription>
              This lab changes local product preferences and browser QA notes only. Canonical scoring changes should be a separate model version with test fixtures and migration notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/settings">Open product settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
