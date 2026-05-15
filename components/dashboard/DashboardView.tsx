"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { TrendFilters } from "@/components/dashboard/TrendFilters";
import { TrendRadar } from "@/components/dashboard/TrendRadar";
import { TrendTimeline } from "@/components/dashboard/TrendTimeline";
import { SourceBreakdown } from "@/components/dashboard/SourceBreakdown";
import { TrendCards } from "@/components/dashboard/TrendCards";
import { TrendTable } from "@/components/dashboard/TrendTable";
import { CreatorModePanel } from "@/components/dashboard/CreatorModePanel";
import { ScanHealthPanel } from "@/components/dashboard/ScanHealthPanel";
import { TrendDetailDrawer } from "@/components/dashboard/TrendDetailDrawer";
import { TREND_SCAN_COMPLETED_EVENT } from "@/components/dashboard/ScanButton";
import type {
  DashboardMode,
  DashboardTrend,
  DashboardTrendsResponse,
  DashboardWindow,
} from "@/lib/trends/types";

const emptyDashboardData = (
  window: DashboardWindow,
): DashboardTrendsResponse => ({
  ok: true,
  window,
  generatedAt: new Date().toISOString(),
  latestScan: null,
  kpis: [
    {
      label: "Top Trend Score",
      value: "0",
      helper: "Highest current composite signal from stored snapshots.",
      delta: window,
    },
    {
      label: "Hidden Gems",
      value: "0",
      helper: "High hidden-gem score with lower saturation.",
      delta: "0 mentions",
    },
    {
      label: "Tracked Sources",
      value: "0",
      helper: "Sources with fresh raw signals in this window.",
      delta: "no scan yet",
    },
    {
      label: "Content Gaps",
      value: "0",
      helper: "Strong content score with room before mainstream saturation.",
      delta: "+ opportunity",
    },
  ],
  trends: [],
  hiddenGems: [],
  signalTable: [],
  sourceBreakdown: [],
  timeline: [],
  radar: [],
  creatorMode: { trend: null },
});

const modeCategoryMap: Record<Exclude<DashboardMode, "All">, string[]> = {
  Technical: [
    "Agents",
    "Coding",
    "Open Source",
    "Local LLM",
    "Automation",
    "Security",
    "Robotics",
    "General AI",
  ],
  Creator: [
    "Video",
    "Image",
    "Audio",
    "Marketing",
    "Education",
    "Automation",
    "Business",
  ],
  Startup: [
    "Business",
    "Automation",
    "Agents",
    "Security",
    "Marketing",
    "General AI",
  ],
  Research: [
    "Research",
    "Local LLM",
    "Robotics",
    "Security",
    "Open Source",
    "General AI",
  ],
};

function filterByMode(trend: DashboardTrend, mode: DashboardMode) {
  if (mode === "All") return true;
  return modeCategoryMap[mode].includes(trend.category);
}

function formatScanDate(value: string | null | undefined) {
  if (!value) return "No scan stored yet";

  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardView() {
  const [mode, setMode] = useState<DashboardMode>("All");
  const [trendWindow, setTrendWindow] = useState<DashboardWindow>("7d");
  const [category, setCategory] = useState("All");
  const [data, setData] = useState<DashboardTrendsResponse>(() =>
    emptyDashboardData("7d"),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendSlug, setSelectedTrendSlug] = useState<string | null>(
    null,
  );

  const loadDashboardData = useCallback(
    async (windowValue: DashboardWindow) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/trends?window=${windowValue}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message ?? "Failed to load dashboard data.");
        }

        setData(payload as DashboardTrendsResponse);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load dashboard data.",
        );
        setData(emptyDashboardData(windowValue));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDashboardData(trendWindow);
  }, [loadDashboardData, trendWindow]);

  useEffect(() => {
    function handleScanCompleted() {
      void loadDashboardData(trendWindow);
    }

    window.addEventListener(TREND_SCAN_COMPLETED_EVENT, handleScanCompleted);
    return () =>
      window.removeEventListener(
        TREND_SCAN_COMPLETED_EVENT,
        handleScanCompleted,
      );
  }, [loadDashboardData, trendWindow]);

  const filteredTrends = useMemo(() => {
    return data.trends.filter(
      (trend) =>
        filterByMode(trend, mode) &&
        (category === "All" || trend.category === category),
    );
  }, [category, data.trends, mode]);

  const creatorTrend = useMemo(() => {
    return (
      filteredTrends.find((trend) => trend.contentScore >= 78) ??
      filteredTrends[0] ??
      data.creatorMode.trend
    );
  }, [data.creatorMode.trend, filteredTrends]);

  const selectedTrend = useMemo(() => {
    if (!selectedTrendSlug) return null;

    return (
      data.trends.find((trend) => trend.slug === selectedTrendSlug) ??
      data.hiddenGems.find((trend) => trend.slug === selectedTrendSlug) ??
      data.signalTable.find((trend) => trend.slug === selectedTrendSlug) ??
      null
    );
  }, [data.hiddenGems, data.signalTable, data.trends, selectedTrendSlug]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section
          id="dashboard-overview"
          className="scroll-mt-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"
        >
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              AI Trend Intelligence
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Find early AI signals before they become obvious.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Trend Finder now reads real snapshots from Postgres: raw signals
              become topic clusters, clusters become scored trend snapshots, and
              lifecycle logic separates fresh acceleration from stale stored
              noise.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground/70">
              <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">
                Window:{" "}
                <span className="font-semibold text-secondary">
                  {data.window}
                </span>
              </span>
              <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">
                Latest scan:{" "}
                <span className="font-semibold text-foreground">
                  {formatScanDate(data.latestScan?.createdAt)}
                </span>
              </span>
              {data.latestScan ? (
                <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">
                  {data.latestScan.fetchedSignals} fetched ·{" "}
                  {data.latestScan.insertedSignals} inserted ·{" "}
                  {data.latestScan.skippedDuplicates} duplicates skipped
                </span>
              ) : null}
            </div>
          </div>
          <TrendFilters
            mode={mode}
            setMode={setMode}
            window={trendWindow}
            setWindow={setTrendWindow}
            category={category}
            setCategory={setCategory}
          />
        </section>

        {error ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-red-100">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-border/10 bg-card/70 p-5 text-sm text-muted-foreground/75">
            Loading real trend data from the database...
          </div>
        ) : null}

        <KpiCards kpis={data.kpis} />

        <ScanHealthPanel
          latestScan={data.latestScan}
          sourceBreakdown={data.sourceBreakdown}
        />

        <section
          id="charts"
          className="scroll-mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"
        >
          <TrendRadar data={data.radar} />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <SourceBreakdown data={data.sourceBreakdown} />
            <TrendTimeline data={data.timeline} />
          </div>
        </section>

        <section id="hidden-gems" className="scroll-mt-6">
          <TrendCards
            trends={filteredTrends}
            onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
          />
        </section>

        <section id="creator-mode" className="scroll-mt-6">
          <CreatorModePanel trend={creatorTrend} />
        </section>

        <section id="signals" className="scroll-mt-6">
          <TrendTable
            trends={filteredTrends}
            onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
          />
        </section>
      </div>
      <TrendDetailDrawer
        slug={selectedTrendSlug}
        selectedWindow={trendWindow}
        initialTrend={selectedTrend}
        onClose={() => setSelectedTrendSlug(null)}
        onSelectSlug={setSelectedTrendSlug}
      />
    </AppShell>
  );
}
