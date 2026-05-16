"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Code2,
  CopyCheck,
  Download,
  Eye,
  FileJson,
  FileText,
  Layers3,
  Loader2,
  Mail,
  Newspaper,
  Printer,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildDailyBriefApiUrl,
  buildDailyBriefExportReadinessUrl,
  buildDailyBriefFullJsonExportUrl,
  buildDailyBriefHtmlExportUrl,
  buildDailyBriefJsonExportUrl,
  buildDailyBriefPageUrl,
  buildDailyBriefPdfExportUrl,
  buildDailyBriefPdfHealthUrl,
  buildDailyBriefPdfPrepUrl,
} from "@/lib/trends/daily-brief-export-links";
import {
  buildDailyBriefPrintLayoutQa,
  printLayoutRiskTone,
  printLayoutStatusTone,
  type DailyBriefPrintLayoutQa,
  type DailyBriefPrintLayoutSeverity,
  type DailyBriefPrintLayoutStatus,
} from "@/lib/trends/daily-brief-print-layout-qa";
import {
  buildReportsExportFlowQa,
  type ReportsExportChannel,
  type ReportsExportFlowQa,
  type ReportsExportFlowSeverity,
  type ReportsExportFlowStatus,
} from "@/lib/trends/reports-export-flow-qa";
import {
  buildExportSystemReadiness,
  type ExportSystemReadiness,
  type ExportSystemReadinessGateStatus,
  type ExportSystemReadinessSeverity,
  type ExportSystemReadinessStatus,
} from "@/lib/trends/export-system-readiness";
import type {
  DailyBriefServerPdfReliabilityQa,
  DailyBriefServerPdfReliabilitySeverity,
  DailyBriefServerPdfReliabilityStatus,
} from "@/lib/trends/daily-brief-server-pdf-qa";
import type {
  DailyBriefReportAudience,
  DailyBriefReportDocument,
  DailyBriefReportTone,
  DailyBriefResponse,
  DashboardWindow,
} from "@/lib/trends/types";

const windowOptions: DashboardWindow[] = ["24h", "7d", "30d"];

type CopyState = "idle" | "copied" | "failed";

type ExportCardStatus = "live" | "ready" | "planned";

type ExportCard = {
  id: string;
  title: string;
  description: string;
  group: "Primary" | "Model" | "Reuse" | "Developer" | "Later";
  status: ExportCardStatus;
  recommendedUse: string;
  icon: LucideIcon;
  actions?: ReactNode;
};

const targetLabels: Record<DailyBriefReportAudience, string> = {
  ui: "UI",
  html: "HTML",
  pdf: "PDF",
  email: "Email later",
  json: "JSON model",
};

function formatDate(value: string | null) {
  if (!value) return "No scan yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function postureVariant(
  posture: DailyBriefResponse["briefPosture"]["posture"],
): BadgeProps["variant"] {
  if (posture === "offensive") return "secondary";
  if (posture === "selective") return "accent";
  return "danger";
}

function qaStatusVariant(
  status: DailyBriefResponse["qa"]["status"],
): BadgeProps["variant"] {
  if (status === "healthy") return "secondary";
  if (status === "review" || status === "too_cautious") return "accent";
  return "danger";
}

function reportToneVariant(tone: DailyBriefReportTone): BadgeProps["variant"] {
  if (tone === "positive") return "secondary";
  if (tone === "warning") return "accent";
  if (tone === "danger") return "danger";
  return "muted";
}

function printLayoutVariant(
  status: DailyBriefPrintLayoutStatus,
): BadgeProps["variant"] {
  return reportToneVariant(printLayoutStatusTone(status));
}

function printIssueVariant(
  severity: DailyBriefPrintLayoutSeverity,
): BadgeProps["variant"] {
  if (severity === "warning") return "danger";
  if (severity === "info") return "accent";
  return "secondary";
}

function exportFlowVariant(
  status: ReportsExportFlowStatus,
): BadgeProps["variant"] {
  if (status === "healthy") return "secondary";
  if (status === "review") return "accent";
  return "danger";
}

function exportCardVariant(status: ExportCardStatus): BadgeProps["variant"] {
  if (status === "live") return "secondary";
  if (status === "ready") return "accent";
  return "muted";
}

function serverPdfReliabilityVariant(
  status: DailyBriefServerPdfReliabilityStatus,
): BadgeProps["variant"] {
  if (status === "healthy") return "secondary";
  if (status === "review") return "accent";
  return "danger";
}

function serverPdfIssueVariant(
  severity: DailyBriefServerPdfReliabilitySeverity,
): BadgeProps["variant"] {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "accent";
  if (severity === "success") return "secondary";
  return "muted";
}

function channelVariant(
  status: ReportsExportChannel["status"],
): BadgeProps["variant"] {
  if (status === "live") return "secondary";
  if (status === "ready") return "accent";
  if (status === "attention") return "danger";
  return "muted";
}

function severityVariant(
  severity: ReportsExportFlowSeverity,
): BadgeProps["variant"] {
  if (severity === "success") return "secondary";
  if (severity === "warning") return "accent";
  return "muted";
}

function readinessVariant(
  status: ExportSystemReadinessStatus,
): BadgeProps["variant"] {
  if (status === "ready") return "secondary";
  if (status === "review") return "accent";
  return "danger";
}

function readinessGateVariant(
  status: ExportSystemReadinessGateStatus,
): BadgeProps["variant"] {
  if (status === "pass") return "secondary";
  if (status === "watch") return "accent";
  if (status === "fail") return "danger";
  return "muted";
}

function readinessSeverityVariant(
  severity: ExportSystemReadinessSeverity,
): BadgeProps["variant"] {
  if (severity === "success") return "secondary";
  if (severity === "warning") return "accent";
  if (severity === "danger") return "danger";
  return "muted";
}

function compactSectionDescription(value: string) {
  if (value.length <= 118) return value;
  return `${value.slice(0, 115).trim()}...`;
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    throw new Error("Clipboard is not available in this browser.");
  }

  await navigator.clipboard.writeText(value);
}

function buildQuickCopyText(reportDocument: DailyBriefReportDocument) {
  const bullets = reportDocument.quickCopy.bullets
    .map((item) => `- ${item}`)
    .join("\n");

  return [
    reportDocument.quickCopy.headline,
    "",
    reportDocument.quickCopy.summary,
    "",
    bullets,
    "",
    `Focus today: ${reportDocument.quickCopy.focusToday}`,
    `Monitor: ${reportDocument.quickCopy.monitor}`,
    `Avoid: ${reportDocument.quickCopy.avoid}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
      <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ error }: { error: string | null }) {
  return (
    <Card className="signal-glow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/15 p-3 text-primary">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>
              {error ? "Reports hub could not load" : "No report data yet"}
            </CardTitle>
            <CardDescription>
              {error ??
                "Run a scan first, then return here. Reports need the same Daily Brief data layer that powers /daily-brief."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function ExportTargetBadge({ target }: { target: DailyBriefReportAudience }) {
  const variant: BadgeProps["variant"] =
    target === "html"
      ? "secondary"
      : target === "ui" || target === "json"
        ? "accent"
        : "muted";

  return <Badge variant={variant}>{targetLabels[target]}</Badge>;
}

function ExportChannelCard({ card }: { card: ExportCard }) {
  return (
    <Card className="border-border/10 bg-[#160d0d]/62">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-secondary/12 p-3 text-secondary">
            <card.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{card.title}</CardTitle>
              <Badge variant={exportCardVariant(card.status)}>
                {card.status === "live"
                  ? "Live"
                  : card.status === "ready"
                    ? "Ready"
                    : "Planned"}
              </Badge>
              <Badge variant="muted">{card.group}</Badge>
            </div>
            <CardDescription className="mt-2 leading-6">
              {card.description}
            </CardDescription>
            <p className="mt-3 text-xs leading-5 text-muted-foreground/65">
              <span className="text-secondary">Best use:</span>{" "}
              {card.recommendedUse}
            </p>
          </div>
        </div>
      </CardHeader>
      {card.actions ? (
        <CardContent className="flex flex-wrap gap-2">
          {card.actions}
        </CardContent>
      ) : null}
    </Card>
  );
}

function ExportFlowQaPanel({ qa }: { qa: ReportsExportFlowQa }) {
  return (
    <Card className="border-secondary/15 bg-[#160d0d]/72 signal-glow">
      <CardHeader>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <ShieldCheck className="h-4 w-4" />
              Reports Hub QA & export flow polish
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={exportFlowVariant(qa.status)}>
                {qa.statusLabel}
              </Badge>
              <Badge variant="muted">Flow score {qa.score}/100</Badge>
              <Badge variant="secondary">
                {qa.metrics.liveChannels} live export
                {qa.metrics.liveChannels === 1 ? "" : "s"}
              </Badge>
              <Badge
                variant={qa.metrics.validationWarnings ? "accent" : "muted"}
              >
                {qa.metrics.validationWarnings} validation warning
                {qa.metrics.validationWarnings === 1 ? "" : "s"}
              </Badge>
            </div>
            <CardTitle className="mt-4 text-2xl tracking-[-0.035em]">
              Export flow is calibrated before adding heavier report features.
            </CardTitle>
            <CardDescription className="mt-2 max-w-4xl leading-6">
              {qa.summary}
            </CardDescription>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground/72">
              {qa.recommendedPath}
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2 text-center">
            <MiniMetric label="Live" value={qa.metrics.liveChannels} />
            <MiniMetric label="Ready" value={qa.metrics.readyChannels} />
            <MiniMetric label="Planned" value={qa.metrics.plannedChannels} />
            <MiniMetric
              label="Quick copy"
              value={qa.metrics.quickCopyReady ? "Ready" : "Thin"}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-5">
          {qa.flowSteps.map((step, index) => (
            <div
              key={step.id}
              className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={step.recommended ? "secondary" : "muted"}>
                  {index + 1}
                </Badge>
                <Badge variant="muted">{step.group}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {step.label}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground/68">
                {step.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
              Export channel health
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {qa.channels.map((channel) => (
                <div
                  key={channel.id}
                  className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {channel.label}
                    </p>
                    <Badge variant={channelVariant(channel.status)}>
                      {channel.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground/66">
                    {channel.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
              QA checklist
            </p>
            <div className="mt-3 space-y-2">
              {qa.checklist.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
                >
                  <div className="flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 className="h-4 w-4 text-secondary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-accent" />
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      {item.label}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground/66">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {qa.warnings.length > 0 ? (
          <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
              <AlertTriangle className="h-4 w-4" />
              Export flow warnings
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {qa.warnings.map((warning) => (
                <div
                  key={warning.id}
                  className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityVariant(warning.severity)}>
                      {warning.severity}
                    </Badge>
                    <p className="text-sm font-semibold text-foreground">
                      {warning.label}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground/70">
                    {warning.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PrintLayoutQaPanel({ qa }: { qa: DailyBriefPrintLayoutQa }) {
  return (
    <Card className="border-accent/15 bg-[#160d0d]/62">
      <CardHeader>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Printer className="h-4 w-4" />
              PDF prep QA & print layout tuning
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={printLayoutVariant(qa.status)}>
                {qa.statusLabel}
              </Badge>
              <Badge variant="muted">Print score {qa.score}/100</Badge>
              <Badge variant="accent">
                ~{qa.metrics.estimatedPages} A4 page
                {qa.metrics.estimatedPages === 1 ? "" : "s"}
              </Badge>
              <Badge
                variant={
                  qa.metrics.oversizedBlocks > 0 ? "danger" : "secondary"
                }
              >
                {qa.metrics.oversizedBlocks} oversized block
                {qa.metrics.oversizedBlocks === 1 ? "" : "s"}
              </Badge>
            </div>
            <CardTitle className="mt-4 text-2xl tracking-[-0.035em]">
              Print layout is checked before pretending this is a real PDF
              engine.
            </CardTitle>
            <CardDescription className="mt-2 max-w-4xl leading-6">
              {qa.summary}
            </CardDescription>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground/72">
              {qa.recommendedPrintMode}
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2 text-center">
            <MiniMetric label="Sections" value={qa.metrics.printableSections} />
            <MiniMetric
              label="Forced breaks"
              value={qa.metrics.forcedPageBreaks}
            />
            <MiniMetric
              label="Keep together"
              value={qa.metrics.keepTogetherBlocks}
            />
            <MiniMetric
              label="Split allowed"
              value={qa.metrics.splitAllowedBlocks}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {qa.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {section.title}
                </p>
                <Badge
                  variant={reportToneVariant(printLayoutRiskTone(section.risk))}
                >
                  {section.risk}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniMetric
                  label="Pages"
                  value={`~${section.estimatedPages}`}
                />
                <MiniMetric label="Blocks" value={section.blockCount} />
                <MiniMetric
                  label="Break"
                  value={section.forcedPageBreak ? "Yes" : "No"}
                />
              </div>
              {section.notes[0] ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground/68">
                  {section.notes[0]}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {qa.issues.length > 0 ? (
          <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
              <AlertTriangle className="h-4 w-4" />
              Print layout issues
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {qa.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={printIssueVariant(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <p className="text-sm font-semibold text-foreground">
                      {issue.label}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground/70">
                    {issue.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-sm text-secondary">
            <CheckCircle2 className="h-4 w-4" />
            No print layout issues detected for the selected window.
          </div>
        )}

        <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
            Tuning notes
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground/78">
            {qa.tuningNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ServerPdfReliabilityPanel({
  qa,
  error,
  selectedWindow,
}: {
  qa: DailyBriefServerPdfReliabilityQa | null;
  error: string | null;
  selectedWindow: DashboardWindow;
}) {
  if (!qa && !error) {
    return (
      <Card className="border-border/10 bg-[#160d0d]/62">
        <CardContent className="flex items-center p-6 text-sm text-muted-foreground/75">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-secondary" />
          Checking server PDF reliability...
        </CardContent>
      </Card>
    );
  }

  if (error || !qa) {
    return (
      <Card className="border-primary/25 bg-primary/10">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
            <AlertTriangle className="h-4 w-4" />
            Server PDF QA could not load
          </div>
          <CardDescription className="mt-2 leading-6 text-red-100/80">
            {error ??
              "The PDF health endpoint did not return a usable response."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const visibleChecks = qa.checks.slice(0, 6);
  const visibleIssues = qa.issues.slice(0, 4);

  return (
    <Card className="border-secondary/15 bg-[#160d0d]/72 signal-glow">
      <CardHeader>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <ShieldCheck className="h-4 w-4" />
              Server PDF QA & export reliability
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={serverPdfReliabilityVariant(qa.status)}>
                {qa.statusLabel}
              </Badge>
              <Badge variant="muted">PDF QA {qa.score}/100</Badge>
              <Badge variant="accent">
                {qa.metrics.pageCount} page
                {qa.metrics.pageCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant="muted">{qa.metrics.kilobytes} KB</Badge>
              <Badge
                variant={qa.metrics.pageDelta > 2 ? "accent" : "secondary"}
              >
                Δ {qa.metrics.pageDelta} vs print estimate
              </Badge>
            </div>
            <CardTitle className="mt-4 text-2xl tracking-[-0.035em]">
              Binary PDF is checked before it becomes the default export path.
            </CardTitle>
            <CardDescription className="mt-2 max-w-4xl leading-6">
              {qa.summary}
            </CardDescription>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground/72">
              {qa.recommendedAction}
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2 text-center">
            <MiniMetric label="Objects" value={qa.metrics.pdfObjects} />
            <MiniMetric label="Streams" value={qa.metrics.contentStreams} />
            <MiniMetric
              label="Bytes/page"
              value={qa.metrics.bytesPerPage.toLocaleString("en")}
            />
            <MiniMetric
              label="Density/page"
              value={qa.metrics.textDensityPerPage.toLocaleString("en")}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={buildDailyBriefPdfExportUrl(selectedWindow)}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={buildDailyBriefPdfExportUrl(selectedWindow, {
                inline: true,
              })}
              target="_blank"
              rel="noreferrer"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview PDF
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a
              href={buildDailyBriefPdfHealthUrl(selectedWindow)}
              target="_blank"
              rel="noreferrer"
            >
              <Code2 className="mr-2 h-4 w-4" />
              PDF health JSON
            </a>
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
              Structural checks
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visibleChecks.map((check) => (
                <div
                  key={check.id}
                  className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
                >
                  <div className="flex items-center gap-2">
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-secondary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-accent" />
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      {check.label}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground/66">
                    {check.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
              Reliability issues
            </p>
            {visibleIssues.length > 0 ? (
              <div className="mt-3 space-y-2">
                {visibleIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={serverPdfIssueVariant(issue.severity)}>
                        {issue.severity}
                      </Badge>
                      <p className="text-sm font-semibold text-foreground">
                        {issue.label}
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground/66">
                      {issue.detail}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-secondary/15 bg-secondary/10 p-4 text-sm leading-6 text-muted-foreground/80">
                No PDF reliability issue was detected for this window.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
            Tuning notes
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground/76">
            {qa.tuningNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportSystemReadinessPanel({
  readiness,
  selectedWindow,
}: {
  readiness: ExportSystemReadiness;
  selectedWindow: DashboardWindow;
}) {
  const visibleGates = readiness.gates.filter(
    (gateItem) => gateItem.status !== "pass" || gateItem.automationBlocking,
  );

  const topGates = visibleGates.length > 0 ? visibleGates : readiness.gates;

  return (
    <Card className="border-secondary/15 bg-[#160d0d]/72 signal-glow">
      <CardHeader>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <ShieldCheck className="h-4 w-4" />
              Export System Final QA + pre-automation readiness
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={readinessVariant(readiness.status)}>
                {readiness.statusLabel}
              </Badge>
              <Badge variant={readinessVariant(readiness.status)}>
                {readiness.automationStatusLabel}
              </Badge>
              <Badge variant="muted">Readiness {readiness.score}/100</Badge>
              <Badge variant="muted">
                Manual {readiness.manualExportScore}/100
              </Badge>
              <Badge
                variant={
                  readiness.metrics.criticalBlockers > 0
                    ? "danger"
                    : "secondary"
                }
              >
                {readiness.metrics.criticalBlockers} blocker
                {readiness.metrics.criticalBlockers === 1 ? "" : "s"}
              </Badge>
            </div>
            <CardTitle className="mt-4 text-2xl tracking-[-0.035em]">
              Final export QA is now one system, not five scattered buttons.
            </CardTitle>
            <CardDescription className="mt-2 max-w-4xl leading-6">
              {readiness.summary}
            </CardDescription>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground/72">
              {readiness.recommendedNextStep}
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2 text-center">
            <MiniMetric
              label="Flow"
              value={readiness.metrics.exportFlowScore}
            />
            <MiniMetric
              label="Print"
              value={readiness.metrics.printLayoutScore}
            />
            <MiniMetric label="PDF" value={readiness.metrics.serverPdfScore} />
            <MiniMetric
              label="Automation"
              value={readiness.automationReadinessScore}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniMetric
            label="Live exports"
            value={readiness.metrics.liveExportChannels}
          />
          <MiniMetric
            label="Ready support"
            value={readiness.metrics.readySupportChannels}
          />
          <MiniMetric
            label="Planned"
            value={readiness.metrics.plannedChannels}
          />
          <MiniMetric label="Warnings" value={readiness.metrics.warnings} />
          <MiniMetric
            label="Boundaries"
            value={readiness.metrics.plannedBoundaries}
          />
          <MiniMetric
            label="Validations"
            value={readiness.metrics.validationWarnings}
          />
        </div>

        <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/62">
                Readiness gates
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground/72">
                Pass means safe for manual export, watch means review before
                automation, fail means do not automate. Planned means the
                feature is intentionally not built yet.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a
                href={buildDailyBriefExportReadinessUrl(selectedWindow)}
                target="_blank"
                rel="noreferrer"
              >
                <Code2 className="mr-2 h-4 w-4" />
                Readiness JSON
              </a>
            </Button>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {topGates.map((gateItem) => (
              <div
                key={gateItem.id}
                className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={readinessGateVariant(gateItem.status)}>
                    {gateItem.status}
                  </Badge>
                  <Badge variant={readinessSeverityVariant(gateItem.severity)}>
                    {gateItem.category.replace("_", " ")}
                  </Badge>
                  {gateItem.automationBlocking ? (
                    <Badge variant="danger">automation blocker</Badge>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {gateItem.label}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground/68">
                  {gateItem.detail}
                </p>
                <p className="mt-2 text-xs leading-5 text-secondary/85">
                  {gateItem.recommendedAction}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {readiness.recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className="rounded-2xl border border-border/10 bg-muted/25 p-4"
            >
              <Badge
                variant={
                  recommendation.priority === "now"
                    ? "secondary"
                    : recommendation.priority === "next"
                      ? "accent"
                      : "muted"
                }
              >
                {recommendation.priority}
              </Badge>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {recommendation.label}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground/70">
                {recommendation.detail}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportDocumentPanel({
  reportDocument,
}: {
  reportDocument: DailyBriefReportDocument;
}) {
  return (
    <Card className="border-secondary/15 bg-[#160d0d]/72 signal-glow">
      <CardHeader>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Layers3 className="h-4 w-4" />
              Daily Brief report document
            </div>
            <CardTitle className="mt-3 text-2xl tracking-[-0.035em]">
              {reportDocument.title}
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">
              {reportDocument.subtitle} The same stable model powers HTML, JSON,
              quick-copy and future export layers.
            </CardDescription>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{reportDocument.schemaVersion}</Badge>
              <Badge variant="muted">
                Generated {formatDate(reportDocument.generatedAt)}
              </Badge>
              {reportDocument.exportTargets.map((target) => (
                <ExportTargetBadge key={target} target={target} />
              ))}
            </div>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2 text-center">
            <MiniMetric
              label="Sections"
              value={reportDocument.integrity.sectionCount}
            />
            <MiniMetric
              label="Blocks"
              value={reportDocument.integrity.blockCount}
            />
            <MiniMetric
              label="Refs"
              value={reportDocument.integrity.trendReferenceCount}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reportDocument.integrity.validationWarnings.length > 0 ? (
          <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
              <AlertTriangle className="h-4 w-4" />
              Export cautions
            </div>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground/80">
              {reportDocument.integrity.validationWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-sm text-secondary">
            <CheckCircle2 className="h-4 w-4" />
            Export integrity is clean for the current window.
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {reportDocument.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {section.title}
                </p>
                <Badge variant={reportToneVariant(section.tone)}>
                  {section.blocks.length} block
                  {section.blocks.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground/68">
                {compactSectionDescription(section.description)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickCopyPanel({
  reportDocument,
  copyState,
  onCopySummary,
  onCopyMarkdown,
}: {
  reportDocument: DailyBriefReportDocument;
  copyState: CopyState;
  onCopySummary: () => void;
  onCopyMarkdown: () => void;
}) {
  return (
    <Card className="border-border/10 bg-[#160d0d]/62">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
          <Clipboard className="h-4 w-4" />
          Quick-copy payload
        </div>
        <CardTitle className="text-xl tracking-[-0.035em]">
          Reuse the brief without opening the dashboard
        </CardTitle>
        <CardDescription>
          Pulls from{" "}
          <code className="text-secondary">reportDocument.quickCopy</code>, not
          from rendered UI cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/10 bg-muted/25 p-4">
          <p className="text-sm font-semibold text-foreground">
            {reportDocument.quickCopy.headline}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/78">
            {reportDocument.quickCopy.summary}
          </p>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground/70">
            <p>
              <span className="text-secondary">Focus:</span>{" "}
              {reportDocument.quickCopy.focusToday}
            </p>
            <p>
              <span className="text-secondary">Monitor:</span>{" "}
              {reportDocument.quickCopy.monitor}
            </p>
            <p>
              <span className="text-secondary">Avoid:</span>{" "}
              {reportDocument.quickCopy.avoid}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onCopySummary}>
            <Clipboard className="mr-2 h-4 w-4" />
            Copy summary
          </Button>
          <Button size="sm" variant="outline" onClick={onCopyMarkdown}>
            <Code2 className="mr-2 h-4 w-4" />
            Copy markdown
          </Button>
          {copyState === "copied" ? (
            <Badge variant="secondary">
              <CopyCheck className="mr-1 h-3 w-3" />
              Copied
            </Badge>
          ) : null}
          {copyState === "failed" ? (
            <Badge variant="danger">Clipboard unavailable</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportsHubView() {
  const [selectedWindow, setSelectedWindow] = useState<DashboardWindow>("7d");
  const [brief, setBrief] = useState<DailyBriefResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverPdfQa, setServerPdfQa] =
    useState<DailyBriefServerPdfReliabilityQa | null>(null);
  const [serverPdfQaError, setServerPdfQaError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const loadBrief = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCopyState("idle");

    try {
      const response = await fetch(buildDailyBriefApiUrl(selectedWindow), {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load report data.");
      }

      setBrief(payload as DailyBriefResponse);
    } catch (loadError) {
      setBrief(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load report data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedWindow]);

  const loadServerPdfQa = useCallback(async () => {
    setServerPdfQa(null);
    setServerPdfQaError(null);

    try {
      const response = await fetch(
        buildDailyBriefPdfHealthUrl(selectedWindow),
        {
          cache: "no-store",
        },
      );
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load PDF health.");
      }

      setServerPdfQa(payload.qa as DailyBriefServerPdfReliabilityQa);
    } catch (healthError) {
      setServerPdfQa(null);
      setServerPdfQaError(
        healthError instanceof Error
          ? healthError.message
          : "Failed to load PDF health.",
      );
    }
  }, [selectedWindow]);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  useEffect(() => {
    void loadServerPdfQa();
  }, [loadServerPdfQa]);

  useEffect(() => {
    if (copyState === "idle") return;

    const timeout = window.setTimeout(() => setCopyState("idle"), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const reportDocument = brief?.reportDocument ?? null;

  const exportQa = useMemo(
    () => (reportDocument ? buildReportsExportFlowQa(reportDocument) : null),
    [reportDocument],
  );

  const printLayoutQa = useMemo(
    () =>
      reportDocument ? buildDailyBriefPrintLayoutQa(reportDocument) : null,
    [reportDocument],
  );

  const exportReadiness = useMemo(
    () =>
      reportDocument && exportQa && printLayoutQa
        ? buildExportSystemReadiness({
            document: reportDocument,
            exportQa,
            printQa: printLayoutQa,
            serverPdfQa,
          })
        : null,
    [exportQa, printLayoutQa, reportDocument, serverPdfQa],
  );

  const exportCards = useMemo<ExportCard[]>(() => {
    const htmlActions = (
      <>
        <Button asChild size="sm" variant="secondary">
          <a
            href={buildDailyBriefHtmlExportUrl(selectedWindow)}
            target="_blank"
            rel="noreferrer"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={buildDailyBriefHtmlExportUrl(selectedWindow, {
              download: true,
            })}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </a>
        </Button>
      </>
    );

    const jsonActions = (
      <>
        <Button asChild size="sm" variant="secondary">
          <a
            href={buildDailyBriefJsonExportUrl(selectedWindow)}
            target="_blank"
            rel="noreferrer"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview model
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={buildDailyBriefJsonExportUrl(selectedWindow, {
              download: true,
            })}
          >
            <Download className="mr-2 h-4 w-4" />
            Download model
          </a>
        </Button>
      </>
    );

    const pdfActions = (
      <>
        <Button asChild size="sm" variant="secondary">
          <a href={buildDailyBriefPdfExportUrl(selectedWindow)}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={buildDailyBriefPdfExportUrl(selectedWindow, {
              inline: true,
            })}
            target="_blank"
            rel="noreferrer"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview PDF
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a
            href={buildDailyBriefPdfHealthUrl(selectedWindow)}
            target="_blank"
            rel="noreferrer"
          >
            <Code2 className="mr-2 h-4 w-4" />
            Health
          </a>
        </Button>
      </>
    );

    const pdfPrepActions = (
      <>
        <Button asChild size="sm" variant="secondary">
          <a
            href={buildDailyBriefPdfPrepUrl(selectedWindow)}
            target="_blank"
            rel="noreferrer"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print layout
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={buildDailyBriefPdfPrepUrl(selectedWindow, {
              autoPrint: true,
            })}
            target="_blank"
            rel="noreferrer"
          >
            <Eye className="mr-2 h-4 w-4" />
            Auto print
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a
            href={buildDailyBriefPdfPrepUrl(selectedWindow, {
              download: true,
            })}
          >
            <Download className="mr-2 h-4 w-4" />
            Download prep HTML
          </a>
        </Button>
      </>
    );

    const developerActions = (
      <>
        <Button asChild size="sm" variant="outline">
          <a
            href={buildDailyBriefApiUrl(selectedWindow)}
            target="_blank"
            rel="noreferrer"
          >
            <Code2 className="mr-2 h-4 w-4" />
            Full API
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a
            href={buildDailyBriefFullJsonExportUrl(selectedWindow)}
            target="_blank"
            rel="noreferrer"
          >
            Full JSON export
          </a>
        </Button>
      </>
    );

    return [
      {
        id: "daily-brief-html",
        title: "HTML Export",
        description:
          "Primary manual report output for previewing and saving the Daily Brief as a standalone page.",
        group: "Primary",
        status: "live",
        recommendedUse:
          "Human review, manual sharing and browser-based saving.",
        icon: FileText,
        actions: htmlActions,
      },
      {
        id: "daily-brief-pdf",
        title: "Server PDF Export",
        description:
          "Live application/pdf endpoint generated from the Daily Brief reportDocument model. v1 is compact and dependency-free.",
        group: "Primary",
        status: "live",
        recommendedUse:
          "Use when you need an actual PDF file without going through browser print.",
        icon: Download,
        actions: pdfActions,
      },
      {
        id: "daily-brief-pdf-prep",
        title: "PDF Prep Layout",
        description:
          "Print-safe A4 HTML layout for visual QA and browser Print → Save as PDF fallback.",
        group: "Primary",
        status: "ready",
        recommendedUse:
          "Use when you want to inspect page breaks before trusting the binary PDF export.",
        icon: Printer,
        actions: pdfPrepActions,
      },
      {
        id: "daily-brief-json",
        title: "JSON Export",
        description:
          "Clean reportDocument payload for structured inspection, integration and future automation.",
        group: "Model",
        status: "live",
        recommendedUse:
          "Use when validating the data model, not as the main readable report.",
        icon: FileJson,
        actions: jsonActions,
      },
      {
        id: "quick-copy",
        title: "Quick Copy",
        description:
          "Reusable summary and markdown payload for notes, posts or handoff without a file export.",
        group: "Reuse",
        status: "ready",
        recommendedUse:
          "Fast manual reuse when a full HTML/JSON file is overkill.",
        icon: Clipboard,
      },
      {
        id: "developer-payload",
        title: "Developer Payload",
        description:
          "Diagnostics for the complete Daily Brief API and full JSON export envelope.",
        group: "Developer",
        status: "ready",
        recommendedUse:
          "Debugging only. Keep this away from the main user export path.",
        icon: Code2,
        actions: developerActions,
      },
      {
        id: "daily-brief-email",
        title: "Email Report",
        description:
          "Not implemented yet. No sending, cron or automation has been introduced in this step.",
        group: "Later",
        status: "planned",
        recommendedUse:
          "Add after export model, HTML and JSON paths are boringly reliable.",
        icon: Mail,
      },
    ];
  }, [selectedWindow]);

  const copySummary = useCallback(async () => {
    if (!reportDocument) return;

    try {
      await copyText(buildQuickCopyText(reportDocument));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }, [reportDocument]);

  const copyMarkdown = useCallback(async () => {
    if (!reportDocument) return;

    try {
      await copyText(reportDocument.quickCopy.markdown);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }, [reportDocument]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Reports Hub
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Daily Brief exports, cleaned up.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Reports now has a clear manual flow: review the brief, preview
              HTML, download the server PDF when you need a real file, use PDF
              prep for layout QA, then inspect JSON only when needed. No mock
              weekly report cosplay, no button soup.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-border/10 bg-card/70 p-2">
            {windowOptions.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={selectedWindow === option ? "secondary" : "ghost"}
                onClick={() => setSelectedWindow(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-7">
          <MiniMetric label="Active window" value={selectedWindow} />
          <MiniMetric
            label="Live exports"
            value={exportQa?.metrics.liveChannels ?? "..."}
          />
          <MiniMetric
            label="Flow QA"
            value={exportQa ? `${exportQa.score}/100` : "..."}
          />
          <MiniMetric
            label="Print QA"
            value={printLayoutQa ? `${printLayoutQa.score}/100` : "..."}
          />
          <MiniMetric
            label="PDF QA"
            value={serverPdfQa ? `${serverPdfQa.score}/100` : "..."}
          />
          <MiniMetric
            label="Readiness"
            value={exportReadiness ? `${exportReadiness.score}/100` : "..."}
          />
          <MiniMetric
            label="Latest scan"
            value={formatDate(brief?.radarStats.latestScanAt ?? null)}
          />
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center p-6 text-sm text-muted-foreground/75">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-secondary" />
              Loading Daily Brief report model...
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !brief ? <EmptyState error={error} /> : null}

        {brief && reportDocument && exportQa && printLayoutQa ? (
          <>
            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={postureVariant(brief.briefPosture.posture)}
                      >
                        {brief.briefPosture.label}
                      </Badge>
                      <Badge variant={qaStatusVariant(brief.qa.status)}>
                        Brief QA: {brief.qa.statusLabel}
                      </Badge>
                      <Badge variant={exportFlowVariant(exportQa.status)}>
                        Export QA: {exportQa.statusLabel}
                      </Badge>
                      <Badge variant={printLayoutVariant(printLayoutQa.status)}>
                        Print QA: {printLayoutQa.statusLabel}
                      </Badge>
                      {serverPdfQa ? (
                        <Badge
                          variant={serverPdfReliabilityVariant(
                            serverPdfQa.status,
                          )}
                        >
                          PDF QA: {serverPdfQa.statusLabel}
                        </Badge>
                      ) : null}
                      {exportReadiness ? (
                        <Badge
                          variant={readinessVariant(exportReadiness.status)}
                        >
                          Readiness: {exportReadiness.statusLabel}
                        </Badge>
                      ) : null}
                      <Badge variant="muted">
                        Confidence {brief.briefPosture.confidence}/100
                      </Badge>
                    </div>
                    <CardTitle className="mt-4 text-2xl tracking-[-0.035em]">
                      {brief.executiveSummary.headline}
                    </CardTitle>
                    <CardDescription className="mt-2 max-w-4xl text-sm leading-6">
                      {brief.executiveSummary.narrative}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary">
                      <Link href={buildDailyBriefPageUrl(selectedWindow)}>
                        <Newspaper className="mr-2 h-4 w-4" />
                        Open Daily Brief
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <a
                        href={buildDailyBriefHtmlExportUrl(selectedWindow)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview HTML
                      </a>
                    </Button>
                    <Button asChild variant="ghost">
                      <a
                        href={buildDailyBriefHtmlExportUrl(selectedWindow, {
                          download: true,
                        })}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download HTML
                      </a>
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <ExportFlowQaPanel qa={exportQa} />
            <PrintLayoutQaPanel qa={printLayoutQa} />
            <ServerPdfReliabilityPanel
              qa={serverPdfQa}
              error={serverPdfQaError}
              selectedWindow={selectedWindow}
            />
            {exportReadiness ? (
              <ExportSystemReadinessPanel
                readiness={exportReadiness}
                selectedWindow={selectedWindow}
              />
            ) : null}

            <div className="grid gap-4 xl:grid-cols-3">
              {exportCards.map((card) => (
                <ExportChannelCard key={card.id} card={card} />
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <ReportDocumentPanel reportDocument={reportDocument} />
              <div className="space-y-5">
                <QuickCopyPanel
                  reportDocument={reportDocument}
                  copyState={copyState}
                  onCopySummary={copySummary}
                  onCopyMarkdown={copyMarkdown}
                />

                <Card className="border-border/10 bg-[#160d0d]/62">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                      <ArrowRight className="h-4 w-4" />
                      What not to add yet
                    </div>
                    <CardDescription className="leading-6">
                      This polish step keeps the export layer intentionally
                      boring: clear manual paths first, heavier automation
                      later.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground/78">
                    <p>
                      <span className="text-secondary">Server PDF live:</span>{" "}
                      keep the binary PDF compact; use PDF prep when visual
                      page-break QA matters.
                    </p>
                    <p>
                      <span className="text-secondary">No email yet:</span> no
                      sending, cron or report database has been introduced.
                    </p>
                    <p>
                      <span className="text-secondary">
                        No duplicate logic:
                      </span>{" "}
                      HTML, JSON and Reports all point back to reportDocument.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
