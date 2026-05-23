"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clipboard,
  CopyCheck,
  Download,
  Eye,
  FileJson,
  FileText,
  History,
  Layers3,
  Microscope,
  Printer,
  RefreshCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProductExperienceBanner } from "@/components/product/ProductExperienceBanner";
import { ProductStateCard } from "@/components/common/ProductStateCard";
import {
  FirstRunStateCard,
  NoScanStateCard,
} from "@/components/common/FirstRunStateCard";
import { saveReportSnapshot } from "@/lib/preferences/report-history";
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
  defaultProductPreferences,
  parseDashboardWindow,
  productPreferencesChangedEvent,
  readProductPreferences,
  type DefaultExportFormat,
  type ProductPreferences,
} from "@/lib/preferences/product-preferences";
import {
  buildDailyBriefExportReadinessUrl,
  buildDailyBriefFullJsonExportUrl,
  buildDailyBriefHtmlExportUrl,
  buildDailyBriefJsonExportUrl,
  buildDailyBriefPdfExportUrl,
  buildDailyBriefPdfPrepUrl,
} from "@/lib/trends/daily-brief-export-links";
import {
  buildTemplateMarkdown,
  buildTemplateReportDocument,
  getReportTemplate,
  getTemplateHeroBlocks,
  getTemplateOrderedSections,
} from "@/lib/reports/report-templates";
import { buildResearchMemoExportQa } from "@/lib/reports/research-memo-qa";
import {
  isMissingDatabaseConfigError,
  readApiErrorMessage,
} from "@/lib/product/api-errors";
import type {
  DailyBriefReportBlock,
  DailyBriefReportTone,
  DailyBriefResponse,
  DashboardWindow,
} from "@/lib/trends/types";

const windowOptions: DashboardWindow[] = ["24h", "7d", "30d"];

type CopyState = "idle" | "copied" | "failed";
type SaveState = "idle" | "saved" | "failed";

type ExportCard = {
  id: DefaultExportFormat | "print" | "full-json" | "readiness";
  title: string;
  description: string;
  href: string;
  icon: typeof FileText;
  format?: DefaultExportFormat;
};

function getInitialWindow() {
  return parseDashboardWindow(defaultProductPreferences.defaultBriefWindow);
}

function toneVariant(
  tone: DailyBriefReportTone | "ready" | "review",
): BadgeProps["variant"] {
  if (tone === "positive" || tone === "ready") return "secondary";
  if (tone === "warning" || tone === "review") return "accent";
  if (tone === "danger") return "danger";
  return "muted";
}

function blockBody(block: DailyBriefReportBlock) {
  return (
    block.body ??
    block.description ??
    block.bullets?.slice(0, 2).join(" ") ??
    "Ready for export."
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function copyText(value: string) {
  if (!navigator.clipboard) throw new Error("Clipboard is not available.");
  await navigator.clipboard.writeText(value);
}

function ExportCardView({
  card,
  isDefault,
}: {
  card: ExportCard;
  isDefault: boolean;
}) {
  return (
    <Card
      className={
        isDefault
          ? "border-secondary/25 bg-[#160d0d]/72 signal-glow"
          : "border-border/10 bg-[#160d0d]/62"
      }
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-secondary/12 p-3 text-secondary">
            <card.icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{card.title}</CardTitle>
              {isDefault ? <Badge variant="secondary">Default</Badge> : null}
            </div>
            <CardDescription className="mt-2">
              {card.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant={isDefault ? "secondary" : "outline"} size="sm">
          <a href={card.href} target="_blank" rel="noreferrer">
            Open <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ReportsHubView() {
  const [preferences, setPreferences] = useState<ProductPreferences>(
    defaultProductPreferences,
  );
  const [selectedWindow, setSelectedWindow] =
    useState<DashboardWindow>(getInitialWindow);
  const [brief, setBrief] = useState<DailyBriefResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const template = getReportTemplate(preferences.reportTemplate);
  const rawDocument = brief?.reportDocument ?? null;
  const document = useMemo(() => {
    if (!rawDocument) return null;
    return buildTemplateReportDocument(rawDocument, preferences.reportTemplate);
  }, [rawDocument, preferences.reportTemplate]);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSaveState("idle");

    try {
      const response = await fetch(
        `/api/daily-brief?window=${selectedWindow}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(
          readApiErrorMessage(payload, "Report could not be loaded."),
        );
      }
      setBrief(payload as DailyBriefResponse);
    } catch (loadError) {
      setBrief(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Report could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedWindow]);

  useEffect(() => {
    function syncPreferences() {
      const next = readProductPreferences();
      setPreferences(next);
      setSelectedWindow(
        (current) => current || parseDashboardWindow(next.defaultBriefWindow),
      );
    }

    syncPreferences();
    window.addEventListener(productPreferencesChangedEvent, syncPreferences);
    window.addEventListener("storage", syncPreferences);
    return () => {
      window.removeEventListener(
        productPreferencesChangedEvent,
        syncPreferences,
      );
      window.removeEventListener("storage", syncPreferences);
    };
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const markdown = useMemo(() => {
    if (!document) return "";
    return (
      document.quickCopy.markdown ||
      buildTemplateMarkdown(document, preferences.reportTemplate)
    );
  }, [document, preferences.reportTemplate]);

  const orderedSections = useMemo(() => {
    if (!document) return [];
    return getTemplateOrderedSections(
      document,
      preferences.reportTemplate,
    ).filter((section) => {
      const text = [section.id, section.title, section.eyebrow]
        .join(" ")
        .toLowerCase();
      if (
        !preferences.reportSections.executiveSummary &&
        text.includes("summary")
      )
        return false;
      if (
        !preferences.reportSections.priorityActions &&
        text.includes("priority")
      )
        return false;
      if (
        !preferences.reportSections.watchlistMovement &&
        text.includes("watchlist")
      )
        return false;
      if (!preferences.reportSections.hiddenGems && text.includes("hidden"))
        return false;
      if (
        !preferences.reportSections.creatorOpportunities &&
        text.includes("creator")
      )
        return false;
      if (!preferences.reportSections.topicsToAvoid && text.includes("avoid"))
        return false;
      if (
        !preferences.reportSections.recommendedFocus &&
        text.includes("focus")
      )
        return false;
      return true;
    });
  }, [document, preferences.reportSections, preferences.reportTemplate]);

  const heroBlocks = useMemo(() => {
    if (!document) return [];
    return getTemplateHeroBlocks(document, preferences.reportTemplate, 4);
  }, [document, preferences.reportTemplate]);

  const exportCards = useMemo<ExportCard[]>(() => {
    const cards: ExportCard[] = [
      {
        id: "pdf",
        format: "pdf",
        title: "PDF report",
        description:
          "Best for sharing, reviewing, and presenting the brief as a document.",
        href: buildDailyBriefPdfExportUrl(selectedWindow, {
          template: preferences.reportTemplate,
        }),
        icon: FileText,
      },
      {
        id: "html",
        format: "html",
        title: "HTML preview",
        description:
          "Open the report in a clean browser view before saving or presenting it.",
        href: buildDailyBriefHtmlExportUrl(selectedWindow, {
          template: preferences.reportTemplate,
        }),
        icon: Eye,
      },
      {
        id: "json",
        format: "json",
        title: "JSON export",
        description:
          "Download the structured report model for reuse or analysis.",
        href: buildDailyBriefJsonExportUrl(selectedWindow, {
          download: true,
          template: preferences.reportTemplate,
        }),
        icon: FileJson,
      },
      {
        id: "full-json",
        title: "Full JSON package",
        description:
          "Open the complete brief envelope when you need to inspect every field before reuse.",
        href: buildDailyBriefFullJsonExportUrl(selectedWindow, {
          download: true,
          template: preferences.reportTemplate,
        }),
        icon: FileJson,
      },
      {
        id: "readiness",
        title: "Export readiness QA",
        description:
          "Inspect PDF, HTML, JSON, print layout and template readiness in one endpoint.",
        href: buildDailyBriefExportReadinessUrl(selectedWindow, {
          template: preferences.reportTemplate,
        }),
        icon: ShieldCheck,
      },
      {
        id: "print",
        title: "Print-ready version",
        description:
          "Use when you want a browser print layout before saving the report manually.",
        href: buildDailyBriefPdfPrepUrl(selectedWindow, {
          template: preferences.reportTemplate,
        }),
        icon: Printer,
      },
    ];

    return cards.sort((a, b) => {
      const aIndex = a.format
        ? template.preferredFormats.indexOf(a.format)
        : 99;
      const bIndex = b.format
        ? template.preferredFormats.indexOf(b.format)
        : 99;
      return aIndex - bIndex;
    });
  }, [preferences.reportTemplate, selectedWindow, template.preferredFormats]);

  const researchMemoQa = useMemo(() => {
    if (!document) return null;
    return buildResearchMemoExportQa(document, preferences.reportTemplate);
  }, [document, preferences.reportTemplate]);

  const readiness = useMemo(() => {
    if (!document)
      return {
        label: "No report",
        variant: "muted" as const,
        detail: "Generate a report first.",
      };
    if (
      preferences.reportTemplate === "research" &&
      researchMemoQa?.status === "blocked"
    ) {
      return {
        label: "Blocked",
        variant: "danger" as const,
        detail:
          "Research memo needs review. Strengthen the evidence and caveat framing before export.",
      };
    }
    if (document.integrity.validationWarnings.length > 0) {
      return {
        label: "Review",
        variant: "accent" as const,
        detail: `${document.integrity.validationWarnings.length} validation warning(s) before export.`,
      };
    }
    if (document.integrity.blockCount < 3) {
      return {
        label: "Thin",
        variant: "accent" as const,
        detail: "Report loaded, but content density is light.",
      };
    }
    return {
      label: "Ready",
      variant: "secondary" as const,
      detail: "Report is ready for manual export.",
    };
  }, [document, preferences.reportTemplate, researchMemoQa]);

  const isMissingDatabaseConfig = isMissingDatabaseConfigError(error);
  const hasNoScanData =
    !isLoading &&
    !error &&
    brief !== null &&
    brief.radarStats.totalTrends === 0 &&
    !brief.radarStats.latestScanAt;

  async function handleCopy() {
    if (!markdown) return;
    setCopyState("idle");
    try {
      await copyText(markdown);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function handleSaveSnapshot() {
    if (!document) return;
    try {
      saveReportSnapshot(document, template.label, readiness.label);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <ProductExperienceBanner />

        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Product / Reports
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Turn the radar into a usable report.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Choose a report template, review the important sections, copy the
              summary, save a local snapshot, or open an export.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {windowOptions.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={selectedWindow === option ? "secondary" : "outline"}
                onClick={() => setSelectedWindow(option)}
              >
                {option}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void loadReport()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </section>

        {isMissingDatabaseConfig ? (
          <FirstRunStateCard onRetry={() => void loadReport()} />
        ) : error ? (
          <ProductStateCard
            variant="error"
            title="Reports could not load"
            description={error}
            action={
              <Button type="button" size="sm" onClick={() => void loadReport()}>
                Try again
              </Button>
            }
          />
        ) : null}

        {isLoading ? (
          <ProductStateCard
            variant="loading"
            title="Loading report model"
            description="Reading the Daily Brief content used for PDF, HTML, JSON and copy outputs."
          />
        ) : null}

        {!isLoading && !error && !brief ? (
          <NoScanStateCard
            title="No report yet"
            description="Run a scan first, then return here. Reports need enough current signal data before they become useful."
          />
        ) : null}

        {hasNoScanData ? (
          <NoScanStateCard
            title="Reports are waiting for the first scan"
            description="The report model loaded, but there are no stored trend signals yet. Run Scan Trends Now from the dashboard before opening exports."
          />
        ) : null}

        {brief && document && !hasNoScanData ? (
          <>
            <Card className="border-secondary/15 bg-[#160d0d]/70 signal-glow">
              <CardHeader>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="accent">{template.eyebrow}</Badge>
                      <Badge variant={readiness.variant}>
                        Report readiness: {readiness.label}
                      </Badge>
                      <Badge variant="muted">Window {selectedWindow}</Badge>
                      <Badge variant="muted">
                        Generated {formatDate(document.generatedAt)}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4 text-3xl tracking-[-0.045em] md:text-4xl">
                      {template.headline}
                    </CardTitle>
                    <CardDescription className="mt-3 max-w-4xl text-base leading-7">
                      {template.description}
                    </CardDescription>
                    <p className="mt-3 text-sm text-muted-foreground/70">
                      {readiness.detail}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleCopy()}
                    >
                      {copyState === "copied" ? (
                        <CopyCheck className="mr-2 h-4 w-4" />
                      ) : (
                        <Clipboard className="mr-2 h-4 w-4" />
                      )}
                      {copyState === "copied"
                        ? "Copied"
                        : copyState === "failed"
                          ? "Copy failed"
                          : "Copy summary"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveSnapshot}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saveState === "saved"
                        ? "Saved"
                        : saveState === "failed"
                          ? "Save failed"
                          : "Save snapshot"}
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/reports/history">
                        <History className="mr-2 h-4 w-4" />
                        History
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {heroBlocks.map((block) => (
                <Card
                  key={block.id}
                  className="border-border/10 bg-[#160d0d]/62"
                >
                  <CardHeader>
                    <Badge variant={toneVariant(block.tone ?? "neutral")}>
                      {block.type.replace("_", " ")}
                    </Badge>
                    <CardTitle className="mt-3 text-base">
                      {block.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-4">
                      {blockBody(block)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </section>

            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Download className="h-4 w-4" />
                  Export options
                </div>
                <CardTitle>{template.label}</CardTitle>
                <CardDescription>{template.bestFor}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {exportCards.map((card) => (
                  <ExportCardView
                    key={card.id}
                    card={card}
                    isDefault={card.format === preferences.defaultExport}
                  />
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Layers3 className="h-4 w-4" />
                  Report structure
                </div>
                <CardTitle>Sections included in this product view</CardTitle>
                <CardDescription>
                  This view highlights the sections selected by your report
                  preferences. Export links remain unchanged.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {orderedSections.length > 0 ? (
                  orderedSections.slice(0, 7).map((section) => (
                    <div
                      key={section.id}
                      className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={toneVariant(section.tone)}>
                              {section.eyebrow}
                            </Badge>
                            <p className="text-sm font-semibold text-foreground">
                              {section.title}
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground/76">
                            {section.description}
                          </p>
                        </div>
                        <Badge variant="muted">
                          {section.blocks.length} blocks
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground/72">
                    No sections match your current report preferences.
                  </p>
                )}
              </CardContent>
            </Card>

            {preferences.reportTemplate === "research" && researchMemoQa ? (
              <Card className="border-border/10 bg-[#160d0d]/62">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                    <Microscope className="h-4 w-4" />
                    Research memo check
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{researchMemoQa.statusLabel}</CardTitle>
                    <Badge variant={toneVariant(researchMemoQa.tone)}>
                      Score {researchMemoQa.score}/100
                    </Badge>
                  </div>
                  <CardDescription>{researchMemoQa.summary}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
                    <p className="text-2xl font-semibold text-foreground">
                      {researchMemoQa.metrics.researchTrendReferences}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60">
                      Research refs
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
                    <p className="text-2xl font-semibold text-foreground">
                      {researchMemoQa.metrics.caveatMentions}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60">
                      Caveats
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
                    <p className="text-2xl font-semibold text-foreground">
                      {researchMemoQa.metrics.sourceQualityMentions}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60">
                      Source quality
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3">
                    <p className="text-2xl font-semibold text-foreground">
                      {researchMemoQa.metrics.templateMarkdownAligned
                        ? "Yes"
                        : "No"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/60">
                      Markdown aligned
                    </p>
                  </div>
                  {researchMemoQa.warnings.length > 0 ? (
                    <div className="md:col-span-4 space-y-2">
                      {researchMemoQa.warnings.slice(0, 4).map((warning) => (
                        <div
                          key={warning}
                          className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-sm text-accent-foreground"
                        >
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <ShieldCheck className="h-4 w-4" />
                  Report summary
                </div>
                <CardTitle>Ready for review</CardTitle>
                <CardDescription>
                  {document.integrity.sectionCount} sections ·{" "}
                  {document.integrity.blockCount} blocks ·{" "}
                  {document.integrity.trendReferenceCount} trend mentions
                </CardDescription>
              </CardHeader>
              {document.integrity.validationWarnings.length > 0 ? (
                <CardContent className="space-y-2">
                  {document.integrity.validationWarnings.map((warning) => (
                    <div
                      key={warning}
                      className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-sm text-accent-foreground"
                    >
                      {warning}
                    </div>
                  ))}
                </CardContent>
              ) : null}
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
