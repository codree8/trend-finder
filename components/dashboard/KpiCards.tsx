import { Activity, Crosshair, Database, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardKpi } from "@/lib/trends/types";

const icons = [Activity, Sparkles, Database, Crosshair];

export function KpiCards({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = icons[index] ?? Activity;
        return (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground/70">
                    {kpi.label}
                  </p>
                  <div className="mt-3 flex items-end gap-3">
                    <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {kpi.value}
                    </p>
                    <span className="mb-1 rounded-full bg-secondary/15 px-2 py-1 text-[11px] font-semibold text-secondary sm:text-xs">
                      {kpi.delta}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-primary/15 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground/68">
                {kpi.helper}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
