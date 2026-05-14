import { Lightbulb, PlaySquare, Radio, SquarePen } from "lucide-react";
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
            Content angles generated from the strongest visible trend.
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Creator Mode</CardTitle>
            <CardDescription>
              Content angles generated from the strongest visible trend.
            </CardDescription>
          </div>
          <Badge variant="accent">Opportunity</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ideas.map((idea) => (
          <div
            key={idea.label}
            className="rounded-2xl border border-border/10 bg-muted/45 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              <idea.icon className="h-4 w-4" />
              {idea.label}
            </div>
            <p className="text-sm leading-6 text-foreground/90">{idea.value}</p>
          </div>
        ))}

        {trend.topSignals.length > 0 ? (
          <div className="rounded-2xl border border-border/10 bg-[#160d0d]/38 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              Evidence
            </p>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground/78">
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
