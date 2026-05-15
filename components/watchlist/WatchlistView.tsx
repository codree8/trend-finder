"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookmarkCheck,
  Clock3,
  Loader2,
  Radar,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendDetailDrawer } from "@/components/dashboard/TrendDetailDrawer";
import type {
  DashboardTrend,
  DashboardWindow,
  SavedTrendWithCurrent,
  WatchlistResponse,
} from "@/lib/trends/types";

const windowOptions: DashboardWindow[] = ["24h", "7d", "30d"];

function formatDate(value: string) {
  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lifecycleVariant(
  status: SavedTrendWithCurrent["currentLifecycleStatus"],
) {
  if (status === "Accelerating") return "secondary" as const;
  if (status === "Emerging") return "accent" as const;
  if (status === "Cooling") return "danger" as const;
  return "muted" as const;
}

function qualityVariant(item: SavedTrendWithCurrent) {
  const gateStatus = item.currentTrend?.topicQuality.gateStatus;

  if (gateStatus === "pass") return "secondary" as const;
  if (gateStatus === "watch") return "accent" as const;
  if (gateStatus === "suppress") return "danger" as const;
  return "muted" as const;
}

function signalAgeLabel(value: number | null) {
  if (value === null) return "No current signal";
  if (value < 1) return "<1h old";
  if (value < 24) return `${Math.round(value)}h old`;
  return `${Math.round(value / 24)}d old`;
}

export function WatchlistView() {
  const [trendWindow, setTrendWindow] = useState<DashboardWindow>("7d");
  const [items, setItems] = useState<SavedTrendWithCurrent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendSlug, setSelectedTrendSlug] = useState<string | null>(
    null,
  );

  const loadWatchlist = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/watchlist?window=${trendWindow}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load watchlist.");
      }

      setItems((payload as WatchlistResponse).items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load watchlist.",
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [trendWindow]);

  useEffect(() => {
    void loadWatchlist();
  }, [loadWatchlist]);

  const selectedTrend = useMemo<DashboardTrend | null>(() => {
    if (!selectedTrendSlug) return null;

    return (
      items.find((item) => item.currentTrend?.slug === selectedTrendSlug)
        ?.currentTrend ?? null
    );
  }, [items, selectedTrendSlug]);

  async function removeTrend(trendKey: string) {
    setError(null);

    try {
      const response = await fetch(
        `/api/watchlist/${encodeURIComponent(trendKey)}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? "Failed to remove saved trend.");
      }

      setItems((current) =>
        current.filter((item) => item.trendKey !== trendKey),
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove saved trend.",
      );
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Saved trend workflow
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Watch the signals you do not want to lose.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Watchlist is the first memory layer: save a canonical trend, keep
              its last seen quality/creator/lifecycle scores, and reopen the
              same intelligence drawer when fresh snapshots exist.
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
              Loading saved trends from the database...
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <Card className="signal-glow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary/15 p-3 text-secondary">
                  <BookmarkCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>No saved trends yet</CardTitle>
                  <CardDescription>
                    Start from Hidden Gems, Creator Mode or the Signal Table and
                    save trends worth monitoring.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">
                  Go to dashboard <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-4">
            {items.map((item) => {
              const current = item.currentTrend;

              return (
                <Card
                  key={item.trendKey}
                  className={current ? "signal-glow" : "border-primary/20"}
                >
                  <CardHeader>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge variant={current ? "secondary" : "muted"}>
                            {current ? "Current snapshot found" : "Saved only"}
                          </Badge>
                          <Badge
                            variant={lifecycleVariant(
                              item.currentLifecycleStatus,
                            )}
                          >
                            {item.currentLifecycleStatus ?? "No lifecycle"}
                          </Badge>
                          <Badge variant={qualityVariant(item)}>
                            Quality {item.currentQualityScore}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl leading-7">
                          {current?.topic ?? item.topic}
                        </CardTitle>
                        <CardDescription>
                          Saved {formatDate(item.savedAt)} · key {item.trendKey}
                        </CardDescription>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
                        <Metric label="Trend" value={item.currentScore} />
                        <Metric
                          label="Creator"
                          value={item.currentCreatorOpportunityScore}
                        />
                        <Metric
                          label="Quality"
                          value={item.currentQualityScore}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground/70">
                        <span className="inline-flex items-center rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
                          <Clock3 className="mr-1.5 h-3.5 w-3.5 text-secondary" />
                          Last signal: {signalAgeLabel(item.lastSignalAgeHours)}
                        </span>
                        {current ? (
                          <span className="inline-flex items-center rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
                            <Radar className="mr-1.5 h-3.5 w-3.5 text-secondary" />
                            {current.mentionCount} mentions ·{" "}
                            {current.sourceCount} sources
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-red-100/80">
                            No matching current dashboard trend in {trendWindow}
                          </span>
                        )}
                        {current ? (
                          <span className="inline-flex items-center rounded-full border border-border/10 bg-muted/45 px-3 py-1.5">
                            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-secondary" />
                            {current.creatorOpportunity.recommendedTiming} ·{" "}
                            {current.creatorOpportunity.recommendedFormat}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={!current}
                          onClick={() =>
                            current && setSelectedTrendSlug(current.slug)
                          }
                        >
                          Open intelligence
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => void removeTrend(item.trendKey)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>

      <TrendDetailDrawer
        slug={selectedTrendSlug}
        selectedWindow={trendWindow}
        initialTrend={selectedTrend}
        savedTrendKeys={new Set(items.map((item) => item.trendKey))}
        onSavedChange={(trendKey, isSaved) => {
          if (!isSaved) {
            setItems((current) =>
              current.filter((item) => item.trendKey !== trendKey),
            );
          } else {
            void loadWatchlist();
          }
        }}
        onClose={() => setSelectedTrendSlug(null)}
        onSelectSlug={setSelectedTrendSlug}
      />
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#160d0d]/45 p-3">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
    </div>
  );
}
