import { SearchCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getKeywordCoverageSummary, type KeywordCoverageStatus } from "@/lib/scan/keyword-coverage";

function statusVariant(status: KeywordCoverageStatus) {
  if (status === "Ready") return "secondary" as const;
  if (status === "Review") return "accent" as const;
  return "danger" as const;
}

export function KeywordCoveragePanel() {
  const coverage = getKeywordCoverageSummary();

  return (
    <Card className="border-border/10 bg-[#160d0d]/62">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
          <SearchCheck className="h-4 w-4" />
          Keyword Coverage
        </div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>Category scan coverage</CardTitle>
            <CardDescription>
              Confirms that the 15 product categories have real keyword packs before the scanner claims category-level coverage.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{coverage.readyCategories} ready</Badge>
            {coverage.reviewCategories ? <Badge variant="accent">{coverage.reviewCategories} review</Badge> : null}
            {coverage.thinCategories ? <Badge variant="danger">{coverage.thinCategories} thin</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
            <p className="text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground/55">Categories</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{coverage.totalCategories}</p>
          </div>
          <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
            <p className="text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground/55">Keywords</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{coverage.totalKeywords}</p>
          </div>
          <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
            <p className="text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground/55">Average pack</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{coverage.averageKeywordsPerCategory}</p>
          </div>
          <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
            <p className="text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground/55">Default mode</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">Balanced</p>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {coverage.modes.map((mode) => (
            <div key={mode.mode} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold capitalize text-foreground">{mode.mode}</p>
                <Badge variant="muted">max {mode.maxKeywords}</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground/70">
                {mode.coreKeywords} core keywords · {mode.perCategoryKeywords} per-category sample.
              </p>
            </div>
          ))}
        </section>

        <div className="overflow-hidden rounded-2xl border border-border/10">
          <div className="hidden grid-cols-[1fr_0.7fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-3 border-b border-border/10 bg-muted/25 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/65 xl:grid">
            <span>Category</span>
            <span>Keywords</span>
            <span>Balanced</span>
            <span>Category</span>
            <span>Deep</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-border/10">
            {coverage.rows.map((row) => (
              <div key={row.category} className="grid gap-3 bg-[#0f0808]/35 px-4 py-4 xl:grid-cols-[1fr_0.7fr_0.9fr_0.9fr_0.9fr_0.9fr] xl:items-center">
                <div>
                  <p className="text-sm font-semibold text-foreground">{row.category}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground/70">{row.note}</p>
                </div>
                <Badge variant="muted">{row.keywordCount}</Badge>
                <span className="text-sm text-muted-foreground/78">{row.balancedSampleCount}</span>
                <span className="text-sm text-muted-foreground/78">{row.categoryScanCount}</span>
                <span className="text-sm text-muted-foreground/78">{row.deepScanAvailable ? row.deepScanCount : "Review"}</span>
                <Badge variant={statusVariant(row.coverageStatus)}>{row.coverageStatus}</Badge>
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
          <p className="text-sm font-semibold text-foreground">Source-specific keyword caps</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground/74">
            Caps keep broad coverage from turning into quota noise. RSS can inspect more terms; YouTube and arXiv stay stricter.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            {coverage.sourceCaps.map((cap) => (
              <div key={cap.source} className="rounded-xl border border-border/10 bg-muted/20 p-3 text-xs text-muted-foreground/75">
                <p className="font-semibold text-foreground">{cap.source}</p>
                <p className="mt-2">Balanced {cap.balanced}</p>
                <p>Category {cap.category}</p>
                <p>Deep {cap.deep}</p>
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
