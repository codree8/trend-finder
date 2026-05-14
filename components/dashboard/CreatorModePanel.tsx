import { Lightbulb, PlaySquare, Radio, SquarePen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trend } from "@/lib/data/mock-trends";

export function CreatorModePanel({ trend }: { trend?: Trend }) {
  if (!trend) return null;

  const ideas = [
    { icon: Radio, label: "Hook", value: trend.contentHook },
    { icon: PlaySquare, label: "YouTube title", value: `${trend.topic}: the AI signal most creators are missing` },
    { icon: SquarePen, label: "LinkedIn angle", value: `Why ${trend.topic.toLowerCase()} matters before it becomes another mainstream AI topic.` },
    { icon: Lightbulb, label: "Thumbnail", value: "EARLY SIGNAL / NOT MAINSTREAM YET" },
  ];

  return (
    <Card className="signal-glow">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Creator Mode</CardTitle>
            <CardDescription>Content angles generated from the strongest visible trend.</CardDescription>
          </div>
          <Badge variant="accent">Opportunity</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ideas.map((idea) => (
          <div key={idea.label} className="rounded-2xl border border-border/10 bg-muted/45 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              <idea.icon className="h-4 w-4" />
              {idea.label}
            </div>
            <p className="text-sm leading-6 text-foreground/90">{idea.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
