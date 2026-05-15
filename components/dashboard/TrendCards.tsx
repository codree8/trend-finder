import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function statusVariant(status: TrendStatus) {
  if (status === "Hidden Gem") return "accent";
  if (status === "Rising") return "secondary";
  if (status === "Volatile") return "danger";
  if (status === "Mainstream") return "muted";
  return "default";
}

export function TrendCards({
  trends,
  onSelectTrend,
}: {
  trends: DashboardTrend[];
  onSelectTrend?: (trend: DashboardTrend) => void;
}) {
  const visible = trends.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Top Emerging Trends
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground/75">
            Emerging trends are topics with fast recent growth, strong source
            diversity and visible discussion momentum.
          </p>
        </div>
        <Button variant="outline" className="hidden md:inline-flex">
          View all <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {visible.map((trend) => (
            <Card key={trend.id} className="relative overflow-hidden">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-primary/10 blur-2xl" />
              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(trend.status)}>
                      {trend.status}
                    </Badge>
                    <Badge variant={lifecycleVariant(trend.lifecycle.status)}>
                      {trend.lifecycle.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-secondary">
                    <Sparkles className="h-3.5 w-3.5" /> {trend.hiddenGemScore}{" "}
                    HG
                  </div>
                </div>
                <CardTitle className="text-lg leading-6">
                  {trend.topic}
                </CardTitle>
                <CardDescription>{trend.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Score label="Trend" value={trend.trendScore} />
                  <Score label="Fresh" value={trend.lifecycle.freshnessScore} />
                  <Score label="Gap" value={trend.creatorGap} />
                </div>
                <p className="mt-4 rounded-xl border border-border/10 bg-muted/50 p-3 text-xs leading-5 text-muted-foreground/78">
                  <span className="font-semibold text-foreground">
                    Why now:
                  </span>{" "}
                  {trend.whyNow}
                  <span className="mt-2 block text-muted-foreground/70">
                    {trend.lifecycle.summary}
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => onSelectTrend?.(trend)}
                >
                  Open intelligence <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm leading-6 text-muted-foreground/75">
            No trend snapshots found for this filter yet. Run{" "}
            <span className="font-semibold text-foreground">
              Scan Trends Now
            </span>{" "}
            and the dashboard will switch from empty state to real database
            data.
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
