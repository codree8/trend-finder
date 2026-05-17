import { CheckCircle2, KeyRound, PlugZap, ShieldAlert, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConnectorReadinessItem, ConnectorReadinessSummary } from "@/lib/scan/connector-readiness";

type Props = {
  readiness: ConnectorReadinessSummary;
};

function statusVariant(item: ConnectorReadinessItem) {
  if (item.active) return "secondary" as const;
  if (item.stage === "review") return "accent" as const;
  return "muted" as const;
}

function statusLabel(item: ConnectorReadinessItem) {
  if (item.active) return "Active";
  if (item.status === "missing-key") return "Missing key";
  if (item.status === "optional-token-missing") return "Review";
  if (item.status === "not-implemented") return "Not wired";
  return "Disabled";
}

function StatusIcon({ item }: { item: ConnectorReadinessItem }) {
  if (item.active) return <CheckCircle2 className="h-5 w-5 text-secondary" />;
  if (item.status === "missing-key" || item.status === "optional-token-missing") {
    return <TriangleAlert className="h-5 w-5 text-accent" />;
  }
  return <ShieldAlert className="h-5 w-5 text-muted-foreground/55" />;
}

export function SourceConnectorReadinessView({ readiness }: Props) {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / Source Connectors
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Know which sources are actually feeding the radar.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This page separates sources supported by the product model from sources that are actively scanned. That keeps the demo honest and the scanner boring in the best possible way.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-secondary/20 bg-secondary/10 p-3 text-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60">Active</p>
              <p className="mt-1 text-2xl font-semibold text-secondary">{readiness.activeCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60">Wired</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{readiness.implementedCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60">Review</p>
              <p className="mt-1 text-2xl font-semibold text-accent">{readiness.warnings.length}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-secondary/15 bg-[#160d0d]/66 signal-glow">
            <CardHeader>
              <PlugZap className="h-5 w-5 text-secondary" />
              <CardTitle>Active scanner</CardTitle>
              <CardDescription>
                {readiness.activeSources.length
                  ? readiness.activeSources.join(" · ")
                  : "No active connectors found."}
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/10 bg-[#160d0d]/66">
            <CardHeader>
              <KeyRound className="h-5 w-5 text-accent" />
              <CardTitle>Optional config</CardTitle>
              <CardDescription>
                YouTube is feature-flagged because of quota. arXiv is keyless and can be disabled with ENABLE_ARXIV_CONNECTOR=false if you want a quieter local scan.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/10 bg-[#160d0d]/66">
            <CardHeader>
              <ShieldAlert className="h-5 w-5 text-muted-foreground/70" />
              <CardTitle>Model-only sources</CardTitle>
              <CardDescription>
                {readiness.inactiveSupportedSources.length
                  ? readiness.inactiveSupportedSources.join(" · ")
                  : "All supported sources are active."}
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {readiness.warnings.length ? (
          <Card className="border-accent/20 bg-accent/10">
            <CardHeader>
              <CardTitle>Connector review notes</CardTitle>
              <CardDescription>These do not break the app, but they affect scan quality.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {readiness.warnings.map((warning) => (
                <p key={warning} className="rounded-2xl border border-accent/20 bg-[#0f0808]/35 px-4 py-3 text-sm leading-6 text-accent/90">
                  {warning}
                </p>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>Connector readiness matrix</CardTitle>
            <CardDescription>Active means the source is used by POST /api/scan right now. arXiv is treated as early research evidence, not a popularity source.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.items.map((item) => (
              <div key={item.id} className="grid gap-4 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 xl:grid-cols-[1.2fr_0.9fr_1.5fr] xl:items-center">
                <div className="flex gap-3">
                  <StatusIcon item={item} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <Badge variant="muted">{item.category}</Badge>
                      <Badge variant={statusVariant(item)}>{statusLabel(item)}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground/76">{item.note}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground/70">
                  <div className="rounded-xl border border-border/10 bg-muted/20 p-2">
                    <p className="uppercase tracking-[0.16em]">Enabled</p>
                    <p className="mt-1 font-semibold text-foreground">{item.enabled ? "Yes" : "No"}</p>
                  </div>
                  <div className="rounded-xl border border-border/10 bg-muted/20 p-2">
                    <p className="uppercase tracking-[0.16em]">Key</p>
                    <p className="mt-1 font-semibold text-foreground">{item.configured ? "OK" : "Missing"}</p>
                  </div>
                  <div className="rounded-xl border border-border/10 bg-muted/20 p-2">
                    <p className="uppercase tracking-[0.16em]">Trust</p>
                    <p className="mt-1 font-semibold text-foreground">{item.reliabilityScore || "—"}</p>
                  </div>
                </div>
                <div className="text-sm leading-6 text-muted-foreground/76">
                  {item.missingEnvVars.length ? (
                    <span>Missing: <span className="font-mono text-accent">{item.missingEnvVars.join(", ")}</span></span>
                  ) : (
                    <span>No required local secret missing.</span>
                  )}
                  {item.quotaNote ? <p className="mt-1 text-xs text-muted-foreground/60">{item.quotaNote}</p> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
