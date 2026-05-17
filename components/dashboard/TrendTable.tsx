import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardTrend } from "@/lib/trends/types";

function qualityVariant(
  gateStatus: DashboardTrend["topicQuality"]["gateStatus"],
) {
  if (gateStatus === "pass") return "secondary" as const;
  if (gateStatus === "watch") return "accent" as const;
  return "danger" as const;
}

function noiseVariant(noiseRisk: DashboardTrend["topicQuality"]["noiseRisk"]) {
  if (noiseRisk === "low") return "secondary" as const;
  if (noiseRisk === "medium") return "accent" as const;
  return "danger" as const;
}

export function TrendTable({
  trends,
  onSelectTrend,
}: {
  trends: DashboardTrend[];
  onSelectTrend?: (trend: DashboardTrend) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Signal Table</CardTitle>
        <CardDescription>
          Transparent score view. The dashboard should always explain why a
          topic is considered signal, hidden gem or noise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground/60">
              <tr className="border-b border-border/10">
                <th className="pb-3 font-medium">Topic</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Lifecycle</th>
                <th className="pb-3 font-medium">Trend</th>
                <th className="pb-3 font-medium">Hidden Gem</th>
                <th className="pb-3 font-medium">Content</th>
                <th className="pb-3 font-medium">Creator</th>
                <th className="pb-3 font-medium">Quality</th>
                <th className="pb-3 font-medium">Velocity</th>
                <th className="pb-3 font-medium">Saturation</th>
                <th className="pb-3 font-medium">Sources</th>
                <th className="pb-3 font-medium">Intel</th>
              </tr>
            </thead>
            <tbody>
              {trends.length > 0 ? (
                trends.map((trend) => (
                  <tr
                    key={trend.id}
                    className={
                      trend.topicQuality.gateStatus === "suppress"
                        ? "border-b border-primary/15 bg-primary/5 last:border-0"
                        : "border-b border-border/10 last:border-0"
                    }
                  >
                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => onSelectTrend?.(trend)}
                        className="text-left transition hover:text-secondary"
                      >
                        <p className="font-medium text-foreground">
                          {trend.topic}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/65">
                          {trend.category} · {trend.mentionCount} mentions ·{" "}
                          {trend.totalEngagement} engagement
                        </p>
                        {trend.aliases.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground/55">
                            Canonical: {trend.canonicalKey} ·{" "}
                            {trend.aliases.length} aliases
                          </p>
                        ) : null}
                        {trend.topicQuality.warnings.length > 0 ? (
                          <p className="mt-1 text-xs text-primary/80">
                            Quality warning: {trend.topicQuality.warnings[0]}
                          </p>
                        ) : null}
                      </button>
                    </td>
                    <td className="py-4">
                      <Badge variant="muted">{trend.status}</Badge>
                    </td>
                    <td className="py-4">
                      <div className="space-y-1">
                        <Badge
                          variant={
                            trend.lifecycle.status === "Accelerating"
                              ? "secondary"
                              : trend.lifecycle.status === "Emerging"
                                ? "accent"
                                : trend.lifecycle.status === "Cooling"
                                  ? "danger"
                                  : "muted"
                          }
                        >
                          {trend.lifecycle.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground/60">
                          Fresh {trend.lifecycle.freshnessScore}/100
                        </p>
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-primary">
                      {trend.trendScore}
                    </td>
                    <td className="py-4 font-semibold text-secondary">
                      {trend.hiddenGemScore}
                    </td>
                    <td className="py-4 font-semibold text-foreground">
                      {trend.contentScore}
                    </td>
                    <td className="py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-secondary">
                          {trend.creatorOpportunity.score}
                        </p>
                        <Badge variant="muted">
                          {trend.creatorOpportunity.recommendedTiming}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {trend.topicQuality.score}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge
                            variant={qualityVariant(
                              trend.topicQuality.gateStatus,
                            )}
                          >
                            {trend.topicQuality.gateStatus}
                          </Badge>
                          <Badge
                            variant={noiseVariant(trend.topicQuality.noiseRisk)}
                          >
                            {trend.topicQuality.noiseRisk} noise
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-muted-foreground/80">
                      {trend.velocity}
                    </td>
                    <td className="py-4 text-muted-foreground/80">
                      {trend.saturation}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {trend.sources.length > 0 ? (
                          trend.sources.map((source) => (
                            <span
                              key={source}
                              className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground/75"
                            >
                              {source}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground/60">
                            No sources
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectTrend?.(trend)}
                      >
                        Open <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={12}
                    className="py-8 text-center text-sm text-muted-foreground/70"
                  >
                    No trend rows yet. Run a scan first, then this table will show the strongest current signals.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
