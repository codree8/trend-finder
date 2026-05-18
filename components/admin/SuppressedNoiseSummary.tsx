import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LatestScanStatus, TrendVisibilityStatus, TrendVisibilitySummary } from "@/lib/trends/types";

const statusLabels: Record<TrendVisibilityStatus, string> = {
  priority: "Priority",
  strong: "Strong",
  watch: "Watch",
  research_only: "Research-only",
  suppressed: "Suppressed",
  rejected: "Rejected",
};

function statusVariant(status: TrendVisibilityStatus) {
  if (status === "priority" || status === "strong") return "secondary" as const;
  if (status === "watch" || status === "research_only") return "accent" as const;
  if (status === "suppressed" || status === "rejected") return "danger" as const;
  return "muted" as const;
}

export function SuppressedNoiseSummary({
  summary,
  latestScan,
}: {
  summary: TrendVisibilitySummary;
  latestScan?: LatestScanStatus | null;
}) {
  const scanMode = latestScan?.scanModeLabel ?? latestScan?.scanMode ?? "No scan metadata";
  const category = latestScan?.selectedCategory ?? "All categories";
  const keywordCount = latestScan?.keywordCount ?? 0;

  return (
    <Card className="border-border/10 bg-[#160d0d]/62">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
          <ShieldAlert className="h-4 w-4" />
          Suppressed Noise Summary
        </div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>What the product radar hides</CardTitle>
            <CardDescription>
              Product views hide suppressed and rejected trends. Admin can still inspect what was hidden and why, without deleting raw signals.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{summary.productVisible} visible</Badge>
            <Badge variant={summary.hiddenFromProduct > 0 ? "accent" : "muted"}>{summary.hiddenFromProduct} hidden</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Evaluated", summary.totalEvaluated],
            ["Visible", summary.productVisible],
            ["Research-only", summary.researchOnly],
            ["Suppressed", summary.suppressed],
            ["Rejected", summary.rejected],
            ["Hidden", summary.hiddenFromProduct],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
              <p className="text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground/55">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(summary.byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
              <span className="text-sm text-muted-foreground/78">{statusLabels[status as TrendVisibilityStatus]}</span>
              <Badge variant={statusVariant(status as TrendVisibilityStatus)}>{count}</Badge>
            </div>
          ))}
        </section>

        <section className="grid gap-3 xl:grid-cols-[1fr_1.3fr]">
          <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
            <p className="text-sm font-semibold text-foreground">Last scan context</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground/78">
              <p>Mode: <span className="text-foreground">{scanMode}</span></p>
              <p>Category: <span className="text-foreground">{category}</span></p>
              <p>Keywords: <span className="text-foreground">{keywordCount || "not stored on older scans"}</span></p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
            <p className="text-sm font-semibold text-foreground">Top suppression reasons</p>
            {summary.topSuppressionReasons.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.topSuppressionReasons.map((item) => (
                  <Badge key={item.reason} variant="accent">
                    {item.reason}: {item.count}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground/72">
                No suppressed/rejected trend reasons in the current sample. That usually means the visible set is clean or the radar has too little data to evaluate.
              </p>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
