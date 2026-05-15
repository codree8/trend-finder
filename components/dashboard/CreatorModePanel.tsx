import { Lightbulb, PlaySquare, Radio, SquarePen, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardTrend } from "@/lib/trends/types";

export function CreatorModePanel({ trend }: { trend?: DashboardTrend | null }) {
  if (!trend) {
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
            No creator angle yet. Run a scan and this panel will use the
            strongest real database trend.
          </div>
        </CardContent>
      </Card>
    );
  }

  const ideas = [
    { icon: Radio, label: "Hook", value: trend.contentHook },
    {
      icon: PlaySquare,
      label: "YouTube title",
      value: `${trend.topic}: the AI signal most creators are missing`,
    },
    {
      icon: SquarePen,
      label: "LinkedIn angle",
      value: `Why ${trend.topic.toLowerCase()} matters before it becomes another mainstream AI topic.`,
    },
    {
      icon: Lightbulb,
      label: "Thumbnail",
      value: `${trend.status.toUpperCase()} / ${trend.hiddenGemScore} HIDDEN-GEM SCORE`,
    },
  ];

  return (
    <Card className="signal-glow">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Creator Mode</CardTitle>
            <CardDescription>
              Dedicated creator opportunity space separated from the signal
              table.
            </CardDescription>
          </div>
          <Badge variant="accent">Opportunity</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.45fr]">
          <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-5">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              <Target className="h-4 w-4" />
              Current creator target
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {trend.topic}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground/75">
              {trend.contentHook}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl border border-border/10 bg-card/55 p-3">
                <p className="text-lg font-semibold text-primary">
                  {trend.trendScore}
                </p>
                <p className="mt-1 text-muted-foreground/65">Trend</p>
              </div>
              <div className="rounded-2xl border border-border/10 bg-card/55 p-3">
                <p className="text-lg font-semibold text-secondary">
                  {trend.hiddenGemScore}
                </p>
                <p className="mt-1 text-muted-foreground/65">Gem</p>
              </div>
              <div className="rounded-2xl border border-border/10 bg-card/55 p-3">
                <p className="text-lg font-semibold text-foreground">
                  {trend.contentScore}
                </p>
                <p className="mt-1 text-muted-foreground/65">Content</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {ideas.map((idea) => (
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

        {trend.topSignals.length > 0 ? (
          <div className="rounded-2xl border border-border/10 bg-[#160d0d]/38 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              Evidence
            </p>
            <ul className="grid gap-2 text-xs leading-5 text-muted-foreground/78 md:grid-cols-3">
              {trend.topSignals.slice(0, 3).map((signal) => (
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
