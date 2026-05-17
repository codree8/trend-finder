"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, RefreshCcw, SlidersHorizontal, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProductStateCard } from "@/components/common/ProductStateCard";
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
} from "@/lib/preferences/product-preferences";
import { productPreferenceScore, sourceWeightMultiplier } from "@/lib/product/apply-product-preferences";
import type { DashboardTrend, DashboardTrendsResponse, DashboardWindow } from "@/lib/trends/types";

const windows: DashboardWindow[] = ["24h", "7d", "30d"];
const sourceRows: Array<{ key: SourceWeightKey; label: string }> = [
  { key: "github", label: "GitHub" },
  { key: "hackerNews", label: "Hacker News" },
  { key: "rss", label: "RSS / Blogs" },
  { key: "reddit", label: "Reddit" },
  { key: "youtube", label: "YouTube" },
  { key: "arxiv", label: "arXiv" },
];

function scoreDeltaLabel(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function sourceKeyLabel(sources: string[]) {
  return sources.length > 0 ? sources.slice(0, 3).join(", ") : "No source label";
}

export function ScoringCalibrationLabView() {
  const [preferences, setPreferences] = useState<ProductPreferences>(defaultProductPreferences);
  const [windowValue, setWindowValue] = useState<DashboardWindow>("7d");
  const [trends, setTrends] = useState<DashboardTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trends?window=${windowValue}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load calibration sample.");
      }
      setTrends((payload as DashboardTrendsResponse).trends.slice(0, 18));
    } catch (loadError) {
      setTrends([]);
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

  const calibratedRows = useMemo(() => {
    return trends
      .map((trend) => {
        const adjustedScore = productPreferenceScore(trend, preferences);
        const multiplier = sourceWeightMultiplier(trend.sources, preferences.sourceWeights);
        return {
          trend,
          adjustedScore: adjustedScore < 0 ? 0 : adjustedScore,
          delta: adjustedScore < 0 ? -trend.trendScore : adjustedScore - trend.trendScore,
          multiplier,
        };
      })
      .sort((a, b) => b.adjustedScore - a.adjustedScore);
  }, [preferences, trends]);

  function patchSourceWeight(key: SourceWeightKey, value: number) {
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

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / Scoring Calibration
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Tune ranking pressure without touching the database.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This lab previews how source weights and the interest profile change product ranking. It does not rewrite snapshots, run scans or mutate historical scores.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {windows.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={windowValue === option ? "secondary" : "outline"}
                onClick={() => setWindowValue(option)}
              >
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
              <SlidersHorizontal className="h-4 w-4" />
              Source quality weighting
            </div>
            <CardTitle>Calibration controls</CardTitle>
            <CardDescription>
              These controls are shared with Settings. Normal is 1.00x, low is 0.50x, high is 1.50x.
            </CardDescription>
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

        {error ? (
          <ProductStateCard variant="error" title="Calibration sample failed" description={error} />
        ) : null}

        {isLoading ? (
          <ProductStateCard variant="loading" title="Loading calibration sample" description="Reading current trend snapshots for a safe ranking preview." />
        ) : null}

        {!isLoading && !error && calibratedRows.length === 0 ? (
          <ProductStateCard
            title="No sample trends available"
            description="Run a scan first or loosen your interest profile so the lab has trends to compare. No calibration can happen on an empty radar. Science is annoying like that."
            secondaryAction={<Link href="/dashboard">Open dashboard</Link>}
          />
        ) : null}

        {calibratedRows.length > 0 ? (
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                <Activity className="h-4 w-4" />
                Ranking preview
              </div>
              <CardTitle>Before / after scoring</CardTitle>
              <CardDescription>
                Adjusted score is product ranking pressure, not the canonical stored trend score.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {calibratedRows.map((row) => (
                <div key={row.trend.id} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{row.trend.topic}</p>
                        <Badge variant="muted">{row.trend.category}</Badge>
                        <Badge variant={row.delta >= 0 ? "secondary" : "accent"}>
                          {scoreDeltaLabel(row.delta)} adjusted
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground/72">
                        {sourceKeyLabel(row.trend.sources)} · source multiplier {row.multiplier.toFixed(2)}x
                      </p>
                    </div>
                    <div className="grid min-w-[220px] grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-border/10 bg-muted/25 p-2">
                        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/55">Stored</p>
                        <p className="text-lg font-semibold text-foreground">{row.trend.trendScore}</p>
                      </div>
                      <div className="rounded-xl border border-border/10 bg-muted/25 p-2">
                        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/55">Product</p>
                        <p className="text-lg font-semibold text-secondary">{row.adjustedScore}</p>
                      </div>
                      <div className="rounded-xl border border-border/10 bg-muted/25 p-2">
                        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/55">Hidden</p>
                        <p className="text-lg font-semibold text-foreground">{row.trend.hiddenGemScore}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              This is a safe product-layer calibration. To change canonical scoring later, do it as a separate scoring model version with explicit migration/testing notes.
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
