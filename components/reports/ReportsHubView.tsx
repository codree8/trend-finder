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
  CheckCircle2,
  Clipboard,
  Code2,
  Download,
  Eye,
  FileJson,
  FileText,
  Layers3,
  Loader2,
  Mail,
  Newspaper,
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
  buildDailyBriefHtmlExportUrl,
  buildDailyBriefJsonExportUrl,
  buildDailyBriefPageUrl,
} from "@/lib/trends/daily-brief-export-links";
import type {
  DailyBriefReportAudience,
  DailyBriefReportDocument,
  DailyBriefReportTone,
  DailyBriefResponse,
  DashboardWindow,
} from "@/lib/trends/types";

const windowOptions: DashboardWindow[] = ["24h", "7d", "30d"];

type CopyState = "idle" | "copied" | "failed";

type ExportCard = {
  id: string;
  title: string;
  description: string;
  status: "live" | "ready" | "planned";
  icon: LucideIcon;
  actions?: ReactNode;
};

const targetLabels: Record<DailyBriefReportAudience, string> = {
  ui: "UI",
  html: "HTML",
  pdf: "PDF later",
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

function buildQuickCopyText(document: DailyBriefReportDocument) {
  const bullets = document.quickCopy.bullets
    .map((item) => `- ${item}`)
    .join("\n");

  return [
    document.quickCopy.headline,
    "",
    document.quickCopy.summary,
    "",
    bullets,
    "",
    `Focus today: ${document.quickCopy.focusToday}`,
    `Monitor: ${document.quickCopy.monitor}`,
    `Avoid: ${document.quickCopy.avoid}`,
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
  const statusVariant: BadgeProps["variant"] =
    card.status === "live"
      ? "secondary"
      : card.status === "ready"
        ? "accent"
        : "muted";
  const statusLabel =
    card.status === "live"
      ? "Live"
      : card.status === "ready"
        ? "Ready model"
        : "Planned";

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
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
            <CardDescription className="mt-2 leading-6">
              {card.description}
            </CardDescription>
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

function ReportDocumentPanel({
  document,
}: {
  document: DailyBriefReportDocument;
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
              {document.title}
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">
              {document.subtitle} This is the same stable document model used by
              the HTML export, so Reports is now a real export hub instead of a
              decorative button graveyard.
            </CardDescription>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{document.schemaVersion}</Badge>
              <Badge variant="muted">
                Generated {formatDate(document.generatedAt)}
              </Badge>
              {document.exportTargets.map((target) => (
                <ExportTargetBadge key={target} target={target} />
              ))}
            </div>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2 text-center">
            <MiniMetric
              label="Sections"
              value={document.integrity.sectionCount}
            />
            <MiniMetric label="Blocks" value={document.integrity.blockCount} />
            <MiniMetric
              label="Refs"
              value={document.integrity.trendReferenceCount}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {document.integrity.validationWarnings.length > 0 ? (
          <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
              <AlertTriangle className="h-4 w-4" />
              Export cautions
            </div>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground/80">
              {document.integrity.validationWarnings.map((warning) => (
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
          {document.sections.map((section) => (
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
  document,
  copyState,
  onCopySummary,
  onCopyMarkdown,
}: {
  document: DailyBriefReportDocument;
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
            {document.quickCopy.headline}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground/78">
            {document.quickCopy.summary}
          </p>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground/70">
            <p>
              <span className="text-secondary">Focus:</span>{" "}
              {document.quickCopy.focusToday}
            </p>
            <p>
              <span className="text-secondary">Monitor:</span>{" "}
              {document.quickCopy.monitor}
            </p>
            <p>
              <span className="text-secondary">Avoid:</span>{" "}
              {document.quickCopy.avoid}
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
            <Badge variant="secondary">Copied</Badge>
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

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  const document = brief?.reportDocument ?? null;

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
            Preview HTML
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={buildDailyBriefHtmlExportUrl(selectedWindow, {
              download: true,
            })}
          >
            <Download className="mr-2 h-4 w-4" />
            Download HTML
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
            <FileJson className="mr-2 h-4 w-4" />
            Preview JSON
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={buildDailyBriefJsonExportUrl(selectedWindow, {
              download: true,
            })}
          >
            <Download className="mr-2 h-4 w-4" />
            Download JSON
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a
            href={buildDailyBriefApiUrl(selectedWindow)}
            target="_blank"
            rel="noreferrer"
          >
            Full API payload
          </a>
        </Button>
      </>
    );

    return [
      {
        id: "daily-brief-html",
        title: "Daily Brief HTML Export",
        description:
          "Standalone HTML preview/download powered by the Daily Brief reportDocument model.",
        status: "live",
        icon: FileText,
        actions: htmlActions,
      },
      {
        id: "daily-brief-json",
        title: "Daily Brief JSON Export",
        description:
          "Clean JSON preview/download powered by the same reportDocument model as the HTML export.",
        status: "live",
        icon: FileJson,
        actions: jsonActions,
      },
      {
        id: "daily-brief-pdf",
        title: "PDF Export",
        description:
          "Not implemented yet. It should reuse the same reportDocument sections and HTML layout later.",
        status: "planned",
        icon: Download,
      },
      {
        id: "daily-brief-email",
        title: "Email Report",
        description:
          "Not implemented yet. No sending, cron or automation has been introduced in this step.",
        status: "planned",
        icon: Mail,
      },
    ];
  }, [selectedWindow]);

  const copySummary = useCallback(async () => {
    if (!document) return;

    try {
      await copyText(buildQuickCopyText(document));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }, [document]);

  const copyMarkdown = useCallback(async () => {
    if (!document) return;

    try {
      await copyText(document.quickCopy.markdown);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }, [document]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Reports Hub
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Daily Brief exports, in one place.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Reports now uses the real Daily Intelligence Brief layer: HTML and
              JSON preview/download, export-readiness checks and quick-copy
              payloads. No mock weekly report cosplay.
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

        <div className="grid gap-3 md:grid-cols-4">
          <MiniMetric label="Active window" value={selectedWindow} />
          <MiniMetric label="Live exports" value="1" />
          <MiniMetric
            label="Ready model"
            value={
              document
                ? document.schemaVersion.replace("daily-brief-", "")
                : "..."
            }
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

        {brief && document ? (
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
                        QA: {brief.qa.statusLabel}
                      </Badge>
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
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              {exportCards.map((card) => (
                <ExportChannelCard key={card.id} card={card} />
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <ReportDocumentPanel document={document} />
              <div className="space-y-5">
                <QuickCopyPanel
                  document={document}
                  copyState={copyState}
                  onCopySummary={copySummary}
                  onCopyMarkdown={copyMarkdown}
                />

                <Card className="border-border/10 bg-[#160d0d]/62">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                      <ShieldCheck className="h-4 w-4" />
                      Integration boundaries
                    </div>
                    <CardDescription className="leading-6">
                      This step wires Reports to Daily Brief exports. It does
                      not add PDF generation, email sending, cron scheduling or
                      a new reports database table.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground/78">
                    <p>
                      <span className="text-secondary">Live:</span> Daily Brief
                      HTML preview and download.
                    </p>
                    <p>
                      <span className="text-secondary">Reusable:</span> JSON
                      response and reportDocument model.
                    </p>
                    <p>
                      <span className="text-secondary">Later:</span> PDF/email
                      can reuse the current model without reverse-engineering
                      UI.
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
