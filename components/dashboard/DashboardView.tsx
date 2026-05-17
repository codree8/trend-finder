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
import { ProductExperienceBanner } from "@/components/product/ProductExperienceBanner";
import { ProductOnboardingCard } from "@/components/product/ProductOnboardingCard";
import { ProductStateCard } from "@/components/common/ProductStateCard";
import { Button } from "@/components/ui/button";
import {
  defaultProductPreferences,
  productPreferencesChangedEvent,
  readProductPreferences,
  updateProductPreferences,
  type ProductPreferences,
} from "@/lib/preferences/product-preferences";
import { applyProductTrendPreferences } from "@/lib/product/apply-product-preferences";
import type {
  DashboardMode,
  DashboardTrend,
  DashboardTrendsResponse,
  DashboardWindow,
  SavedTrendWithCurrent,
  WatchlistResponse,
} from "@/lib/trends/types";

const emptyDashboardData = (
  window: DashboardWindow,
): DashboardTrendsResponse => ({
  ok: true,
  window,
  generatedAt: "1970-01-01T00:00:00.000Z",
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
  creatorMode: { trend: null, opportunities: [] },
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
  const [preferences, setPreferences] = useState<ProductPreferences>(
    defaultProductPreferences,
  );
  const [mode, setMode] = useState<DashboardMode>("All");
  const [trendWindow, setTrendWindow] = useState<DashboardWindow>(
    defaultProductPreferences.defaultBriefWindow,
  );
  const [hasHydratedPreferences, setHasHydratedPreferences] = useState(false);
  const [category, setCategory] = useState("All");
  const [data, setData] = useState<DashboardTrendsResponse>(() =>
    emptyDashboardData("7d"),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendSlug, setSelectedTrendSlug] = useState<string | null>(
    null,
  );
  const [savedTrends, setSavedTrends] = useState<SavedTrendWithCurrent[]>([]);

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

  const loadSavedTrendKeys = useCallback(
    async (windowValue: DashboardWindow) => {
      try {
        const response = await fetch(`/api/watchlist?window=${windowValue}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) return;

        setSavedTrends((payload as WatchlistResponse).items);
      } catch {
        setSavedTrends([]);
      }
    },
    [],
  );

  const handleSavedTrendChange = useCallback(
    (trendKey: string, isSaved: boolean) => {
      setSavedTrends((current) => {
        if (isSaved) return current;
        return current.filter((item) => item.trendKey !== trendKey);
      });

      if (isSaved) {
        void loadSavedTrendKeys(trendWindow);
      }
    },
    [loadSavedTrendKeys, trendWindow],
  );

  useEffect(() => {
    const initialPreferences = readProductPreferences();
    setPreferences(initialPreferences);
    setTrendWindow(initialPreferences.defaultBriefWindow);
    setHasHydratedPreferences(true);

    function handlePreferenceChange() {
      setPreferences(readProductPreferences());
    }

    window.addEventListener(productPreferencesChangedEvent, handlePreferenceChange);
    window.addEventListener("storage", handlePreferenceChange);

    return () => {
      window.removeEventListener(
        productPreferencesChangedEvent,
        handlePreferenceChange,
      );
      window.removeEventListener("storage", handlePreferenceChange);
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedPreferences) return;
    void loadDashboardData(trendWindow);
  }, [hasHydratedPreferences, loadDashboardData, trendWindow]);

  useEffect(() => {
    if (!hasHydratedPreferences) return;
    void loadSavedTrendKeys(trendWindow);
  }, [hasHydratedPreferences, loadSavedTrendKeys, trendWindow]);

  useEffect(() => {
    function handleScanCompleted() {
      if (!hasHydratedPreferences) return;
      void loadDashboardData(trendWindow);
      void loadSavedTrendKeys(trendWindow);
    }

    window.addEventListener(TREND_SCAN_COMPLETED_EVENT, handleScanCompleted);
    return () =>
      window.removeEventListener(
        TREND_SCAN_COMPLETED_EVENT,
        handleScanCompleted,
      );
  }, [hasHydratedPreferences, loadDashboardData, loadSavedTrendKeys, trendWindow]);

  const filteredTrends = useMemo(() => {
    const baseTrends = data.trends.filter(
      (trend) =>
        filterByMode(trend, mode) &&
        (category === "All" || trend.category === category),
    );

    return applyProductTrendPreferences(baseTrends, preferences);
  }, [category, data.trends, mode, preferences]);

  const filteredHiddenGems = useMemo(() => {
    const baseTrends = data.hiddenGems.filter(
      (trend) =>
        filterByMode(trend, mode) &&
        (category === "All" || trend.category === category),
    );

    return applyProductTrendPreferences(baseTrends, preferences);
  }, [category, data.hiddenGems, mode, preferences]);

  const creatorOpportunities = useMemo(() => {
    const ranked = data.creatorMode.opportunities.length
      ? data.creatorMode.opportunities
      : filteredTrends
          .slice()
          .sort(
            (a, b) => b.creatorOpportunity.score - a.creatorOpportunity.score,
          );

    return ranked.filter(
      (trend) =>
        trend.topicQuality.gateStatus !== "suppress" &&
        trend.topicQuality.isActionableTrend &&
        filterByMode(trend, mode) &&
        (category === "All" || trend.category === category),
    );
  }, [category, data.creatorMode.opportunities, filteredTrends, mode]);

  const creatorTrend = useMemo(() => {
    return (
      creatorOpportunities[0] ??
      filteredTrends.find(
        (trend) =>
          trend.topicQuality.gateStatus !== "suppress" &&
          trend.creatorOpportunity.score >= 65,
      ) ??
      filteredTrends.find(
        (trend) => trend.topicQuality.gateStatus !== "suppress",
      ) ??
      data.creatorMode.trend
    );
  }, [creatorOpportunities, data.creatorMode.trend, filteredTrends]);

  const selectedTrend = useMemo(() => {
    if (!selectedTrendSlug) return null;

    return (
      data.trends.find((trend) => trend.slug === selectedTrendSlug) ??
      data.hiddenGems.find((trend) => trend.slug === selectedTrendSlug) ??
      data.signalTable.find((trend) => trend.slug === selectedTrendSlug) ??
      null
    );
  }, [data.hiddenGems, data.signalTable, data.trends, selectedTrendSlug]);

  const savedTrendKeySet = useMemo(
    () => new Set(savedTrends.map((item) => item.trendKey)),
    [savedTrends],
  );

  const showChartsSection =
    preferences.dashboardSections.charts ||
    preferences.dashboardSections.sourceBreakdown ||
    preferences.dashboardSections.trendTimeline;
  const showHiddenGems = preferences.dashboardSections.hiddenGems;
  const showCreatorMode = preferences.dashboardSections.creatorMode;
  const showSignals = preferences.dashboardSections.signals;
  const showScanHealth = preferences.dashboardSections.scanHealth;
  const isPitchMode = preferences.experienceMode === "pitch";

  const hasActiveProfileFilter =
    preferences.interestProfile.minimumTrendScore > 0 ||
    preferences.interestProfile.excludeKeywords.length > 0;
  const hasActiveViewFilter = mode !== "All" || category !== "All";

  function resetVisibleTrendFilters() {
    setMode("All");
    setCategory("All");

    if (hasActiveProfileFilter) {
      setPreferences(
        updateProductPreferences((current) => ({
          ...current,
          interestProfile: {
            ...defaultProductPreferences.interestProfile,
            preferredCategories: current.interestProfile.preferredCategories,
            includeKeywords: current.interestProfile.includeKeywords,
          },
        })),
      );
    }
  }

  const emptyFilteredTitle =
    category !== "All"
      ? `No ${category} signals in this scan`
      : mode !== "All"
        ? `No ${mode.toLowerCase()} signals in this view`
        : "No trends visible with the current settings";

  const emptyFilteredDescription = hasActiveViewFilter
    ? "The radar has trends, but this filter is too narrow for the current scan. Switch back to All to see the full signal set."
    : hasActiveProfileFilter
      ? "Your score threshold or excluded keywords are hiding the current signal set. Show all trends resets only the local filters, not the saved data."
      : "The radar has data, but the current view is hiding it. Show all trends returns to the default product view.";

  return (
    <AppShell>
      <div className="space-y-6">
        <ProductOnboardingCard />
        <ProductExperienceBanner compact />

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
              {isPitchMode
                ? "A clean product radar for showing what is rising, what is worth acting on, and what should stay out of the content queue."
                : "Trend Finder turns real source signals into simple decisions: act on this, watch it, research it first, or avoid it for now."}
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
                  {data.latestScan.fetchedSignals} signals found ·{" "}
                  {data.latestScan.insertedSignals} new ·{" "}
                  {data.latestScan.skippedDuplicates} duplicates filtered
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
          <ProductStateCard
            variant="error"
            title="Dashboard data could not be loaded"
            description={error}
            secondaryAction={<a href="/settings">Review settings</a>}
          />
        ) : null}

        {isLoading ? (
          <ProductStateCard
            variant="loading"
            title="Loading trend radar"
            description="Reading the latest signal set, source mix and movement timeline."
          />
        ) : null}

        <KpiCards kpis={data.kpis} />

        {!isLoading && !error && data.trends.length > 0 ? (
          <section className="rounded-[1.75rem] border border-border/10 bg-card/62 p-4 shadow-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Recommended flow
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground/76">
                  Open a trend, save what matters, then move to the queue, brief and reports when you are ready to act or share the readout.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a className="rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 font-medium text-secondary transition hover:bg-secondary/15" href="/action-queue">
                  Open Action Queue
                </a>
                <a className="rounded-full border border-border/10 bg-muted/35 px-4 py-2 font-medium text-foreground transition hover:bg-muted/50" href="/daily-brief">
                  Open Daily Brief
                </a>
                <a className="rounded-full border border-border/10 bg-muted/35 px-4 py-2 font-medium text-foreground transition hover:bg-muted/50" href="/reports">
                  Build Report
                </a>
              </div>
            </div>
          </section>
        ) : null}

        {!isLoading && !error && data.trends.length === 0 ? (
          <ProductStateCard
            title="No trends yet"
            description="Run a scan first. Then this page will show ranked topics, hidden gems, source coverage and creator opportunities."
            secondaryAction={<a href="/settings">Check product setup</a>}
          />
        ) : null}

        {!isLoading && !error && data.trends.length > 0 && filteredTrends.length === 0 ? (
          <ProductStateCard
            title={emptyFilteredTitle}
            description={emptyFilteredDescription}
            action={
              <Button type="button" size="sm" variant="secondary" onClick={resetVisibleTrendFilters}>
                Show all trends
              </Button>
            }
            secondaryAction={<a href="/settings">Open settings</a>}
          />
        ) : null}

        {showScanHealth ? (
          <ScanHealthPanel
            latestScan={data.latestScan}
            sourceBreakdown={data.sourceBreakdown}
          />
        ) : null}

        {showChartsSection ? (
          <section
            id="charts"
            className="scroll-mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"
          >
            {preferences.dashboardSections.charts ? (
              <TrendRadar data={data.radar} />
            ) : null}
            {preferences.dashboardSections.sourceBreakdown ||
            preferences.dashboardSections.trendTimeline ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                {preferences.dashboardSections.sourceBreakdown ? (
                  <SourceBreakdown data={data.sourceBreakdown} />
                ) : null}
                {preferences.dashboardSections.trendTimeline ? (
                  <TrendTimeline data={data.timeline} />
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {showHiddenGems ? (
          <section id="hidden-gems" className="scroll-mt-6">
            <TrendCards
              trends={filteredHiddenGems}
              savedTrendKeys={savedTrendKeySet}
              selectedWindow={trendWindow}
              onSavedChange={handleSavedTrendChange}
              onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
            />
          </section>
        ) : null}

        {showCreatorMode ? (
          <section id="creator-mode" className="scroll-mt-6">
            <CreatorModePanel
              trend={creatorTrend}
              opportunities={creatorOpportunities}
              onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
            />
          </section>
        ) : null}

        {showSignals ? (
          <section id="signals" className="scroll-mt-6">
            <TrendTable
              trends={filteredTrends}
              onSelectTrend={(trend) => setSelectedTrendSlug(trend.slug)}
            />
          </section>
        ) : null}
      </div>
      <TrendDetailDrawer
        slug={selectedTrendSlug}
        selectedWindow={trendWindow}
        initialTrend={selectedTrend}
        savedTrendKeys={savedTrendKeySet}
        savedTrends={savedTrends}
        onSavedChange={handleSavedTrendChange}
        onClose={() => setSelectedTrendSlug(null)}
        onSelectSlug={setSelectedTrendSlug}
      />
    </AppShell>
  );
}
