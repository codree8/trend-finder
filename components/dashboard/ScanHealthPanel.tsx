import { AlertTriangle, Activity, CheckCircle2, Database, PlugZap, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LatestScanStatus, SourceBreakdownItem } from "@/lib/trends/types";

type Props = {
  latestScan: LatestScanStatus | null;
  sourceBreakdown: SourceBreakdownItem[];
};

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function getDuplicateTone(latestScan: LatestScanStatus | null) {
  if (!latestScan) return "muted" as const;
  if (latestScan.duplicateRate >= 0.65) return "danger" as const;
  if (latestScan.duplicateRate >= 0.4) return "accent" as const;
  return "secondary" as const;
}

function statusText(latestScan: LatestScanStatus | null) {
  if (!latestScan) return "No scan stored yet";
  if (latestScan.warnings.length > 0) return "Completed with warnings";
  return latestScan.status === "completed" ? "Healthy scan" : latestScan.status;
}

export function ScanHealthPanel({ latestScan, sourceBreakdown }: Props) {
  const duplicateTone = getDuplicateTone(latestScan);
  const hasWarnings = Boolean(latestScan?.warnings.length);
  const sourceText =
    latestScan?.sourceCoverage.label ?? "0/0 sources with signals";
  const connectorReadiness = latestScan?.connectorReadiness;
  const activeConnectorText = connectorReadiness?.activeSources.length
    ? connectorReadiness.activeSources.join(" · ")
    : "GitHub · Hacker News · RSS";
  const inactiveConnectorText = connectorReadiness?.inactiveSupportedSources.length
    ? connectorReadiness.inactiveSupportedSources.join(" · ")
    : "Optional sources not scanned yet";

  return (
    <section className="rounded-3xl border border-secondary/15 bg-card/72 p-5 shadow-card">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            {hasWarnings ? (
              <AlertTriangle className="h-4 w-4 text-accent" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            Scan health
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground/76">
            Quality layer is now tracking fetched vs inserted signals, duplicate
            pressure and source coverage so repeated scans do not inflate the
            radar. No smoke machine, just useful paranoia.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={hasWarnings ? "accent" : "secondary"}>
            {statusText(latestScan)}
          </Badge>
          <Badge variant={duplicateTone}>
            {latestScan ? formatPercent(latestScan.duplicateRate) : "0%"}{" "}
            duplicates
          </Badge>
          <Badge variant="muted">{sourceText}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/55">
            Fetched
            <Activity className="h-4 w-4 text-muted-foreground/55" />
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {latestScan?.fetchedSignals ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/55">
            Inserted
            <Database className="h-4 w-4 text-secondary" />
          </div>
          <p className="text-2xl font-semibold text-secondary">
            {latestScan?.insertedSignals ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/55">
            Duplicates
            <AlertTriangle className="h-4 w-4 text-accent" />
          </div>
          <p className="text-2xl font-semibold text-accent">
            {latestScan?.skippedDuplicates ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-border/10 bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/55">
            Coverage
            <CheckCircle2 className="h-4 w-4 text-secondary" />
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {latestScan?.sourceCoverage.withSignals ?? sourceBreakdown.length}/
            {latestScan?.sourceCoverage.scanned ?? sourceBreakdown.length}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-secondary/15 bg-secondary/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-secondary/85">
            <PlugZap className="h-4 w-4" />
            Active sources
          </div>
          <p className="text-sm leading-6 text-foreground/86">{activeConnectorText}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground/64">
            These connectors are actually used by the scan runner. Model-only sources are not counted as active data.
          </p>
        </div>
        <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/60">
            <ShieldAlert className="h-4 w-4" />
            Supported but inactive
          </div>
          <p className="text-sm leading-6 text-muted-foreground/86">{inactiveConnectorText}</p>
          {connectorReadiness?.warnings.length ? (
            <p className="mt-1 text-xs leading-5 text-accent/84">
              {connectorReadiness.warnings.length} connector setting needs review in Admin / Source Connectors.
            </p>
          ) : null}
        </div>
      </div>

      {hasWarnings ? (
        <div className="mt-4 space-y-2">
          {latestScan?.warnings.map((warning) => (
            <p
              key={warning}
              className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm leading-6 text-accent/88"
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
