"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardTrend } from "@/lib/trends/types";

type AccessRole = "demo" | "admin" | null;

type Props = {
  trend: DashboardTrend;
  isSaved: boolean;
  onSavedChange?: (trendKey: string, isSaved: boolean) => void;
  selectedWindow?: string;
  showLabel?: boolean;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
};

function trendKeyForClient(trend: DashboardTrend) {
  return (trend.canonicalKey || trend.id).trim().toLowerCase();
}

export function WatchlistButton({
  trend,
  isSaved,
  onSavedChange,
  selectedWindow = "7d",
  showLabel = true,
  className,
  variant = "outline",
  size = "sm",
}: Props) {
  const [internalSaved, setInternalSaved] = useState(isSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessRole, setAccessRole] = useState<AccessRole>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const trendKey = trendKeyForClient(trend);
  const currentSaved = internalSaved;
  const Icon = isSaving ? Loader2 : currentSaved ? BookmarkCheck : Bookmark;

  useEffect(() => {
    setInternalSaved(isSaved);
  }, [isSaved, trendKey]);

  useEffect(() => {
    let active = true;

    async function loadAccessRole() {
      try {
        const response = await fetch("/api/access", { cache: "no-store" });
        const data = (await response.json()) as { role?: AccessRole };
        if (active) setAccessRole(data.role ?? null);
      } catch {
        if (active) setAccessRole(null);
      } finally {
        if (active) setAccessLoaded(true);
      }
    }

    loadAccessRole();

    return () => {
      active = false;
    };
  }, []);

  const canMutateWatchlist = accessRole === "admin";

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!canMutateWatchlist) {
      setError("Admin access is required to change the shared watchlist.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = currentSaved
        ? await fetch(`/api/watchlist/${encodeURIComponent(trendKey)}`, {
            method: "DELETE",
            cache: "no-store",
          })
        : await fetch(`/api/watchlist?window=${selectedWindow}`, {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              trendKey,
              trendSlug: trend.slug,
              topic: trend.topic,
              lastSeenScore: trend.trendScore,
              lastSeenCreatorOpportunityScore: trend.creatorOpportunity.score,
              lastSeenQualityScore: trend.topicQuality.score,
              lastSeenLifecycleStatus: trend.lifecycle.status,
              lastSeenMentionCount: trend.mentionCount,
              lastSeenSourceCount: trend.sourceCount,
              lastSeenTotalEngagement: trend.totalEngagement,
              lastSeenAt: trend.lastSeenAt,
              tags: [],
            }),
          });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? "Watchlist action failed.");
      }

      const nextSaved = !currentSaved;
      setInternalSaved(nextSaved);
      onSavedChange?.(trendKey, nextSaved);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Watchlist action failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={currentSaved ? "secondary" : variant}
        size={size}
        className={cn(currentSaved ? "border-secondary/25" : undefined, className)}
        disabled={isSaving || !accessLoaded || !canMutateWatchlist}
        onClick={handleClick}
        title={
          !accessLoaded
            ? "Checking access"
            : canMutateWatchlist
              ? currentSaved
                ? "Remove from watchlist"
                : "Save to watchlist"
              : "Admin access is required to change the shared watchlist"
        }
      >
        <Icon className={cn("h-4 w-4", isSaving && "animate-spin")} />
        {showLabel ? (
          <span className="ml-2">{currentSaved ? "Watching" : "Watch"}</span>
        ) : null}
      </Button>
      {error ? <p className="text-xs text-primary">{error}</p> : null}
    </div>
  );
}
