"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { TrendFilters } from "@/components/dashboard/TrendFilters";
import { TrendRadar } from "@/components/dashboard/TrendRadar";
import { TrendTimeline } from "@/components/dashboard/TrendTimeline";
import { SourceBreakdown } from "@/components/dashboard/SourceBreakdown";
import { TrendCards } from "@/components/dashboard/TrendCards";
import { TrendTable } from "@/components/dashboard/TrendTable";
import { CreatorModePanel } from "@/components/dashboard/CreatorModePanel";
import { trends } from "@/lib/data/mock-trends";

export type DashboardMode = "All" | "Technical" | "Creator" | "Startup" | "Research";
export type DashboardWindow = "24h" | "7d" | "30d";

export function DashboardView() {
  const [mode, setMode] = useState<DashboardMode>("All");
  const [window, setWindow] = useState<DashboardWindow>("7d");
  const [category, setCategory] = useState("All");

  const filteredTrends = useMemo(() => {
    return trends.filter((trend) => category === "All" || trend.category === category);
  }, [category]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">AI Trend Intelligence</p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Find early AI signals before they become obvious.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Trend Finder separates noise from signal across Reddit, GitHub, YouTube, Hacker News and RSS sources. This starter uses mock data while the UI, scoring language and filter logic are being locked.
            </p>
          </div>
          <TrendFilters
            mode={mode}
            setMode={setMode}
            window={window}
            setWindow={setWindow}
            category={category}
            setCategory={setCategory}
          />
        </section>

        <KpiCards />

        <section id="charts" className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <TrendRadar />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <SourceBreakdown />
            <TrendTimeline />
          </div>
        </section>

        <section id="hidden-gems">
          <TrendCards trends={filteredTrends} />
        </section>

        <section id="signals" className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <TrendTable trends={filteredTrends} />
          <CreatorModePanel trend={filteredTrends[0]} />
        </section>
      </div>
    </AppShell>
  );
}
