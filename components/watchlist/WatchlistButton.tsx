"use client";

import { useState, type MouseEvent } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardTrend } from "@/lib/trends/types";

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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trendKey = trendKeyForClient(trend);
  const Icon = isSaving ? Loader2 : isSaved ? BookmarkCheck : Bookmark;

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setIsSaving(true);
    setError(null);

    try {
      const response = isSaved
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
              tags: [],
            }),
          });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? "Watchlist action failed.");
      }

      onSavedChange?.(trendKey, !isSaved);
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
        variant={isSaved ? "secondary" : variant}
        size={size}
        className={cn(isSaved ? "border-secondary/25" : undefined, className)}
        disabled={isSaving}
        onClick={handleClick}
        title={isSaved ? "Remove from watchlist" : "Save to watchlist"}
      >
        <Icon className={cn("h-4 w-4", isSaving && "animate-spin")} />
        {showLabel ? (
          <span className="ml-2">{isSaved ? "Watching" : "Watch"}</span>
        ) : null}
      </Button>
      {error ? <p className="text-xs text-primary">{error}</p> : null}
    </div>
  );
}
