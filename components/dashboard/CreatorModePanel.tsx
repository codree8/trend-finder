import {
  ArrowUpRight,
  Clock3,
  Gauge,
  Lightbulb,
  PlaySquare,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CreatorContentRisk,
  CreatorOpportunityLevel,
  CreatorRecommendedTiming,
  DashboardTrend,
} from "@/lib/trends/types";

type Props = {
  trend?: DashboardTrend | null;
  opportunities?: DashboardTrend[];
  onSelectTrend?: (trend: DashboardTrend) => void;
};

function opportunityVariant(level: CreatorOpportunityLevel) {
  if (level === "High") return "secondary" as const;
  if (level === "Medium") return "accent" as const;
  return "muted" as const;
}

function timingVariant(timing: CreatorRecommendedTiming) {
  if (timing === "Act now") return "secondary" as const;
  if (timing === "Watch") return "accent" as const;
  if (timing === "Too late") return "danger" as const;
  return "muted" as const;
}

function qualityVariant(
  gateStatus: DashboardTrend["topicQuality"]["gateStatus"],
) {
  if (gateStatus === "pass") return "secondary" as const;
  if (gateStatus === "watch") return "accent" as const;
  return "danger" as const;
}

function riskVariant(risk: CreatorContentRisk) {
  if (risk === "low") return "secondary" as const;
  if (risk === "medium") return "accent" as const;
  return "danger" as const;
}

export function CreatorModePanel({
  trend,
  opportunities,
  onSelectTrend,
}: Props) {
  const rankedOpportunities = opportunities?.length
    ? opportunities.slice(0, 5)
    : trend
      ? [trend]
      : [];
  const primary = rankedOpportunities[0] ?? trend ?? null;

  if (!primary) {
    return (
      <Card className="signal-glow">
        <CardHeader>
          <CardTitle>Creator Mode</CardTitle>
          <CardDescription>
            Dedicated creator opportunity space for content angles, hooks and
            evidence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border/10 bg-muted/45 p-4 text-sm leading-6 text-muted-foreground/75">
            No creator opportunity yet. Run a scan and this panel will rank the strongest current ideas for creators, founders and builders.
          </div>
        </CardContent>
      </Card>
    );
  }

  const primaryOpportunity = primary.creatorOpportunity;
  const ideaCards = [
    {
      icon: Lightbulb,
      label: "Best angle",
      value: primaryOpportunity.bestAngle,
    },
    {
      icon: PlaySquare,
      label: "Recommended format",
      value: primaryOpportunity.recommendedFormat,
    },
    {
      icon: Clock3,
      label: "Timing",
      value: primaryOpportunity.recommendedTiming,
    },
    {
      icon: Users,
      label: "Audience fit",
      value: primaryOpportunity.audienceFit.join(", "),
    },
  ];

  return (
    <Card className="signal-glow overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Creator Mode</CardTitle>
            <CardDescription>
              Top creator opportunities ranked by freshness, hidden-gem signal,
              content gap, saturation, source confirmation and topic quality.
            </CardDescription>
          </div>
          <Badge variant={opportunityVariant(primaryOpportunity.level)}>
            {primaryOpportunity.level} opportunity
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.45fr]">
          <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-5">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              <Target className="h-4 w-4" />
              Current creator target
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl">
                  {primary.topic}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant={timingVariant(
                      primaryOpportunity.recommendedTiming,
                    )}
                  >
                    {primaryOpportunity.recommendedTiming}
                  </Badge>
                  <Badge variant="muted">
                    {primaryOpportunity.recommendedFormat}
                  </Badge>
                  <Badge variant={riskVariant(primaryOpportunity.contentRisk)}>
                    {primaryOpportunity.contentRisk} risk
                  </Badge>
                  <Badge
                    variant={qualityVariant(primary.topicQuality.gateStatus)}
                  >
                    Quality {primary.topicQuality.score}
                  </Badge>
                </div>
              </div>
              <div className="w-full rounded-2xl border border-secondary/20 bg-[#160d0d]/45 px-4 py-3 text-center sm:w-auto">
                <p className="text-3xl font-semibold text-secondary">
                  {primaryOpportunity.score}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">
                  Creator score
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground/78">
              {primaryOpportunity.explanation}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3">
              <Metric label="Gem" value={primary.hiddenGemScore} />
              <Metric label="Quality" value={primary.topicQuality.score} />
              <Metric label="Fresh" value={primary.lifecycle.freshnessScore} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ideaCards.map((idea) => (
              <div
                key={idea.label}
                className="rounded-2xl border border-border/10 bg-muted/45 p-4"
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                  <idea.icon className="h-4 w-4" />
                  {idea.label}
                </div>
                <p className="text-sm leading-6 text-foreground/90">
                  {idea.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="rounded-2xl border border-border/10 bg-[#160d0d]/38 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              <Gauge className="h-4 w-4" />
              Top creator opportunities
            </div>
            <div className="space-y-2">
              {rankedOpportunities.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onSelectTrend?.(item)}
                  className="group grid w-full gap-3 rounded-2xl border border-border/10 bg-muted/25 p-3 text-left transition hover:border-secondary/30 hover:bg-muted/45 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-secondary/20 bg-secondary/10 text-xs font-semibold text-secondary">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {item.topic}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground/65">
                      {item.creatorOpportunity.recommendedTiming} ·{" "}
                      {item.creatorOpportunity.recommendedFormat} · Quality{" "}
                      {item.topicQuality.score}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-sm font-semibold text-secondary">
                    {item.creatorOpportunity.score}
                    <ArrowUpRight className="h-4 w-4 opacity-65 transition group-hover:opacity-100" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldAlert className="h-4 w-4" />
              Risk check
            </div>
            <p className="text-sm leading-6 text-red-100/82">
              {[
                ...primaryOpportunity.warnings,
                ...primary.topicQuality.warnings,
              ]
                .slice(0, 3)
                .join(" ") ||
                "No major creator or topic-quality risk detected. The main job is to avoid a generic AI take and keep the angle evidence-led."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => onSelectTrend?.(primary)}
            >
              Open creator intelligence
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {primary.topSignals.length > 0 ? (
          <div className="rounded-2xl border border-border/10 bg-[#160d0d]/38 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              Evidence
            </p>
            <ul className="grid gap-2 text-xs leading-5 text-muted-foreground/78 sm:grid-cols-3">
              {primary.topSignals.slice(0, 3).map((signal) => (
                <li key={`${signal.source}-${signal.url}`}>
                  <span className="font-semibold text-foreground">
                    {signal.source}:
                  </span>{" "}
                  {signal.title}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-card/55 p-3">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-muted-foreground/65">{label}</p>
    </div>
  );
}
