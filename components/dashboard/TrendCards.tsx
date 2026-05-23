import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardTrend,
  TrendLifecycleStatus,
  TrendStatus,
} from "@/lib/trends/types";

function lifecycleVariant(status: TrendLifecycleStatus) {
  if (status === "Accelerating") return "secondary" as const;
  if (status === "Emerging") return "accent" as const;
  if (status === "Peaking") return "default" as const;
  if (status === "Cooling") return "danger" as const;
  return "muted" as const;
}

function qualityVariant(
  gateStatus: DashboardTrend["topicQuality"]["gateStatus"],
) {
  if (gateStatus === "pass") return "secondary" as const;
  if (gateStatus === "watch") return "accent" as const;
  return "danger" as const;
}

function statusVariant(status: TrendStatus) {
  if (status === "Hidden Gem") return "accent";
  if (status === "Rising") return "secondary";
  if (status === "Volatile") return "danger";
  if (status === "Mainstream") return "muted";
  return "default";
}

export function TrendCards({
  trends,
  savedTrendKeys,
  selectedWindow = "7d",
  onSavedChange,
  onSelectTrend,
}: {
  trends: DashboardTrend[];
  savedTrendKeys?: ReadonlySet<string>;
  selectedWindow?: string;
  onSavedChange?: (trendKey: string, isSaved: boolean) => void;
  onSelectTrend?: (trend: DashboardTrend) => void;
}) {
  const visible = trends.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Hidden Gems & Early Openings
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground/75">
            Hidden-gem ranking now favors early topics that also pass the
            quality gate, not just low mainstream saturation.
          </p>
        </div>
        <Button variant="outline" className="hidden md:inline-flex">
          View all <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((trend) => (
            <Card key={trend.id} className="relative overflow-hidden">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-primary/10 blur-2xl" />
              <CardHeader>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(trend.status)}>
                      {trend.status}
                    </Badge>
                    <Badge variant={lifecycleVariant(trend.lifecycle.status)}>
                      {trend.lifecycle.status}
                    </Badge>
                    <Badge
                      variant={qualityVariant(trend.topicQuality.gateStatus)}
                    >
                      Quality {trend.topicQuality.score}
                    </Badge>
                    {trend.mergedTopicCount > 1 ? (
                      <Badge variant="muted">
                        {trend.mergedTopicCount} aliases
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-secondary">
                    <Sparkles className="h-3.5 w-3.5" />
                    {trend.creatorOpportunity.score} CO
                  </div>
                </div>
                <CardTitle className="text-lg leading-6">
                  {trend.topic}
                </CardTitle>
                <CardDescription>{trend.summary}</CardDescription>
                {trend.aliases.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground/60">
                    Also seen as: {trend.aliases.slice(0, 3).join(", ")}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <Score label="Gem" value={trend.hiddenGemScore} />
                  <Score label="Fresh" value={trend.lifecycle.freshnessScore} />
                  <Score
                    label="Creator"
                    value={trend.creatorOpportunity.score}
                  />
                  <Score label="Quality" value={trend.topicQuality.score} />
                </div>
                <p className="mt-4 rounded-xl border border-border/10 bg-muted/50 p-3 text-xs leading-5 text-muted-foreground/78">
                  <span className="font-semibold text-foreground">
                    Why now:
                  </span>{" "}
                  {trend.whyNow}
                  <span className="mt-2 block text-muted-foreground/70">
                    {trend.lifecycle.summary}
                  </span>
                  <span className="mt-2 block font-semibold text-secondary">
                    Creator angle: {trend.creatorOpportunity.recommendedTiming}{" "}
                    · {trend.creatorOpportunity.recommendedFormat}
                  </span>
                  {trend.topicQuality.warnings.length > 0 ? (
                    <span className="mt-2 block text-primary/85">
                      Quality note: {trend.topicQuality.warnings[0]}
                    </span>
                  ) : null}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onSelectTrend?.(trend)}
                  >
                    Open intelligence <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                  <WatchlistButton
                    trend={trend}
                    isSaved={Boolean(
                      savedTrendKeys?.has(trend.canonicalKey.toLowerCase()),
                    )}
                    selectedWindow={selectedWindow}
                    onSavedChange={onSavedChange}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm leading-6 text-muted-foreground/75">
            No hidden-gem candidates found for this filter yet. Run{" "}
            <span className="font-semibold text-foreground">
              Scan Trends Now
            </span>{" "}
            and the dashboard will fill this section with early opportunities.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/10 bg-[#160d0d]/38 p-3">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground/65">{label}</p>
    </div>
  );
}
