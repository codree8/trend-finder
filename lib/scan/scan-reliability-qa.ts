import type { ConnectorReadinessSummary } from "@/lib/scan/connector-readiness";

export type ScanReliabilityQaStatus = "healthy" | "review" | "blocked";

export type ScanReliabilityQaCheck = {
  id: string;
  label: string;
  status: "pass" | "review" | "fail";
  detail: string;
};

export type ScanReliabilityQaSummary = {
  status: ScanReliabilityQaStatus;
  statusLabel: string;
  score: number;
  generatedAt: string;
  checks: ScanReliabilityQaCheck[];
  warnings: string[];
  recommendedActions: string[];
};

type ConnectorScanOutcome = {
  source: string;
  ok: boolean;
  signals: unknown[];
  keywordCount: number;
  error?: string;
};

type SourceCoverage = {
  scanned: number;
  successful: number;
  withSignals: number;
  failed: number;
  label: string;
};

function statusLabel(status: ScanReliabilityQaStatus) {
  if (status === "healthy") return "Healthy";
  if (status === "review") return "Review";
  return "Blocked";
}

function check(args: ScanReliabilityQaCheck): ScanReliabilityQaCheck {
  return args;
}

function sourceList(values: string[]) {
  return values.length ? values.join(" · ") : "none";
}

export function buildScanReliabilityQa(args: {
  connectorReadiness: ConnectorReadinessSummary;
  connectorResults: ConnectorScanOutcome[];
  sourceCoverage: SourceCoverage;
  fetchedSignals: number;
  insertedSignals: number;
  duplicateRate: number;
  keywordCount: number;
  timeoutMs: number;
}): ScanReliabilityQaSummary {
  const failed = args.connectorResults.filter((result) => !result.ok);
  const zeroSignalSources = args.connectorResults.filter(
    (result) => result.ok && result.signals.length === 0,
  );
  const activeSources = args.connectorReadiness.activeSources;
  const readinessBlocked =
    args.connectorReadiness.regressionQa.status === "blocked" ||
    args.connectorReadiness.missingRequiredConfigCount > 0;

  const checks: ScanReliabilityQaCheck[] = [
    check({
      id: "connector-readiness",
      label: "Connector readiness boundary",
      status: readinessBlocked ? "fail" : "pass",
      detail: readinessBlocked
        ? "Connector readiness has blocked checks. Fix feature flags or required secrets before trusting scan output."
        : `Active connectors: ${sourceList(activeSources)}.`,
    }),
    check({
      id: "minimum-active-sources",
      label: "Minimum active source spread",
      status: activeSources.length >= 3 ? "pass" : "review",
      detail:
        activeSources.length >= 3
          ? `${activeSources.length} active source(s) are available for cross-source confirmation.`
          : "Fewer than three active sources are available; confirmation quality may be thin.",
    }),
    check({
      id: "connector-failures",
      label: "Connector failures",
      status: failed.length === 0 ? "pass" : failed.length >= activeSources.length ? "fail" : "review",
      detail:
        failed.length === 0
          ? "Every active connector returned without throwing."
          : `${failed.length} connector(s) failed: ${failed
              .map((result) => `${result.source}${result.error ? ` (${result.error})` : ""}`)
              .join("; ")}.`,
    }),
    check({
      id: "source-coverage",
      label: "Source coverage",
      status:
        args.sourceCoverage.withSignals >= Math.min(3, args.sourceCoverage.scanned)
          ? "pass"
          : args.sourceCoverage.withSignals > 0
            ? "review"
            : "fail",
      detail: args.sourceCoverage.label,
    }),
    check({
      id: "keyword-plan",
      label: "Keyword plan",
      status: args.keywordCount > 0 ? "pass" : "fail",
      detail:
        args.keywordCount > 0
          ? `${args.keywordCount} keyword(s) selected for this scan mode.`
          : "No scan keywords were selected. The scanner has nothing meaningful to query.",
    }),
    check({
      id: "signal-volume",
      label: "Fetched signal volume",
      status: args.fetchedSignals > 0 ? "pass" : "review",
      detail:
        args.fetchedSignals > 0
          ? `${args.fetchedSignals} signal(s) fetched before deduplication.`
          : "Scan completed but fetched no signals. This can happen with narrow categories or external API issues.",
    }),
    check({
      id: "duplicate-pressure",
      label: "Duplicate pressure",
      status: args.duplicateRate >= 0.75 ? "review" : "pass",
      detail:
        args.duplicateRate >= 0.75
          ? `Duplicate rate is ${Math.round(args.duplicateRate * 100)}%; trend velocity may be inflated by already-known signals.`
          : `Duplicate rate is ${Math.round(args.duplicateRate * 100)}%.`,
    }),
    check({
      id: "timeout-boundary",
      label: "Connector timeout boundary",
      status: "pass",
      detail: `Each connector is guarded by a ${Math.round(args.timeoutMs / 1000)}s timeout so one slow source cannot hang the scan.`,
    }),
  ];

  const failedChecks = checks.filter((item) => item.status === "fail").length;
  const reviewChecks = checks.filter((item) => item.status === "review").length;
  const score = Math.max(0, Math.round(100 - failedChecks * 26 - reviewChecks * 9));
  const status: ScanReliabilityQaStatus = failedChecks
    ? "blocked"
    : reviewChecks
      ? "review"
      : "healthy";
  const warnings = checks
    .filter((item) => item.status !== "pass")
    .map((item) => `${item.label}: ${item.detail}`);
  const recommendedActions = [
    readinessBlocked ? "Fix blocked connector readiness checks before trusting scan results." : "",
    failed.length ? "Retry the scan after checking external API availability for failed sources." : "",
    zeroSignalSources.length
      ? `Review narrow keyword/category choices for zero-signal sources: ${sourceList(zeroSignalSources.map((item) => item.source))}.`
      : "",
    args.fetchedSignals === 0 ? "Run a balanced scan before switching back to category/deep checks." : "",
    args.duplicateRate >= 0.75 ? "Use category or deep mode to widen the signal base." : "",
  ].filter(Boolean);

  return {
    status,
    statusLabel: statusLabel(status),
    score,
    generatedAt: new Date().toISOString(),
    checks,
    warnings,
    recommendedActions,
  };
}
