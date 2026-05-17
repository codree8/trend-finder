"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookmarkCheck,
  CheckCircle2,
  FileJson,
  FileText,
  Gauge,
  Layers3,
  Lightbulb,
  Mail,
  Newspaper,
  Presentation,
  Radar,
  SlidersHorizontal,
  UserRound,
  RotateCcw,
  Settings2,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProductExperienceBanner } from "@/components/product/ProductExperienceBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sourcePresets } from "@/lib/config/source-presets";
import {
  defaultProductPreferences,
  demoProductPreferences,
  pitchProductPreferences,
  productPreferencesChangedEvent,
  readProductPreferences,
  resetProductPreferences,
  updateProductPreferences,
  type BriefTone,
  type DashboardSectionPreferences,
  type DefaultExportFormat,
  type ProductExperienceMode,
  type ProductPreferences,
  type ReportSectionPreferences,
  type ReportTemplateId,
  type SourceWeightKey,
  type TopicInterestProfile,
  type WorkspaceView,
} from "@/lib/preferences/product-preferences";
import type { DashboardWindow } from "@/lib/trends/types";
import { cn } from "@/lib/utils";

const workspaceOptions: Array<{ value: WorkspaceView; label: string; helper: string }> = [
  {
    value: "product",
    label: "Product",
    helper: "Clean user-facing navigation by default.",
  },
  {
    value: "admin",
    label: "Admin",
    helper: "Developer diagnostics visible from the sidebar.",
  },
];

const briefWindowOptions: DashboardWindow[] = ["24h", "7d", "30d"];

const exportOptions: Array<{
  value: DefaultExportFormat;
  label: string;
  helper: string;
  icon: LucideIcon;
}> = [
  {
    value: "pdf",
    label: "PDF",
    helper: "Best finished file for sharing.",
    icon: FileText,
  },
  {
    value: "html",
    label: "HTML",
    helper: "Best preview before publishing.",
    icon: Layers3,
  },
  {
    value: "json",
    label: "JSON",
    helper: "Best structured model export.",
    icon: FileJson,
  },
  {
    value: "markdown",
    label: "Markdown",
    helper: "Best quick copy and reuse format.",
    icon: Newspaper,
  },
];

const toneOptions: Array<{ value: BriefTone; label: string; helper: string }> = [
  {
    value: "executive",
    label: "Executive",
    helper: "Sharper decision summary, best for reports and pitch flow.",
  },
  {
    value: "creator",
    label: "Creator-focused",
    helper: "Prioritizes angles, timing and content opportunities.",
  },
  {
    value: "research",
    label: "Research-focused",
    helper: "More cautious framing for signal review and analysis.",
  },
];

const reportTemplateOptions: Array<{
  value: ReportTemplateId;
  label: string;
  helper: string;
}> = [
  {
    value: "executive",
    label: "Executive brief",
    helper: "Decision-first structure for founders, managers and operators.",
  },
  {
    value: "creator",
    label: "Creator pack",
    helper: "Highlights angles, formats, hooks and content timing.",
  },
  {
    value: "research",
    label: "Research memo",
    helper: "More cautious language and evidence-first review framing.",
  },
  {
    value: "pitch",
    label: "Pitch snapshot",
    helper: "Presentation-friendly report framing without fake data.",
  },
];

const interestCategoryOptions = [
  "Agents",
  "Automation",
  "Business",
  "Coding",
  "Education",
  "General AI",
  "Image",
  "Local LLM",
  "Marketing",
  "Open Source",
  "Research",
  "Security",
  "Video",
];

const sourceWeightOptions: Array<{
  key: SourceWeightKey;
  label: string;
  helper: string;
}> = [
  { key: "github", label: "GitHub", helper: "Open-source builder signals." },
  { key: "hackerNews", label: "Hacker News", helper: "Builder discussion and early debate." },
  { key: "rss", label: "RSS / Blogs", helper: "Editorial and company-published signals." },
  { key: "reddit", label: "Reddit", helper: "Community demand and noisy early chatter." },
  { key: "youtube", label: "YouTube", helper: "Creator saturation and audience pull." },
  { key: "arxiv", label: "arXiv", helper: "Research-grade early signal." },
];

const experienceOptions: Array<{
  value: ProductExperienceMode;
  label: string;
  helper: string;
  icon: LucideIcon;
}> = [
  {
    value: "standard",
    label: "Standard",
    helper: "Your normal product workspace.",
    icon: Gauge,
  },
  {
    value: "demo",
    label: "Demo",
    helper: "Guided product explanation layer, still using real data.",
    icon: Sparkles,
  },
  {
    value: "pitch",
    label: "Pitch",
    helper: "Cleaner product story for presenting the workflow.",
    icon: Presentation,
  },
];

const dashboardSectionOptions: Array<{
  key: keyof DashboardSectionPreferences;
  label: string;
  helper: string;
  icon: LucideIcon;
}> = [
  {
    key: "charts",
    label: "Charts",
    helper: "Radar chart and visual trend shape.",
    icon: BarChart3,
  },
  {
    key: "sourceBreakdown",
    label: "Source Breakdown",
    helper: "Where signals are coming from.",
    icon: Layers3,
  },
  {
    key: "trendTimeline",
    label: "Trend Timeline",
    helper: "Signal movement over time.",
    icon: Radar,
  },
  {
    key: "hiddenGems",
    label: "Hidden Gems",
    helper: "Early opportunities before saturation.",
    icon: Sparkles,
  },
  {
    key: "creatorMode",
    label: "Creator Mode",
    helper: "Best angles and content timing.",
    icon: Lightbulb,
  },
  {
    key: "signals",
    label: "Signals",
    helper: "Detailed trend signal table.",
    icon: Radar,
  },
  {
    key: "scanHealth",
    label: "Scan Health",
    helper: "Product-level scan status, not heavy diagnostics.",
    icon: CheckCircle2,
  },
  {
    key: "watchlist",
    label: "Watchlist",
    helper: "Show Watchlist in product navigation.",
    icon: BookmarkCheck,
  },
  {
    key: "actionQueue",
    label: "Action Queue",
    helper: "Show Action Queue in product navigation.",
    icon: Gauge,
  },
];

const reportSectionOptions: Array<{
  key: keyof ReportSectionPreferences;
  label: string;
  helper: string;
}> = [
  {
    key: "executiveSummary",
    label: "Executive summary",
    helper: "Keep the brief headline, posture and thesis visible.",
  },
  {
    key: "priorityActions",
    label: "Priority actions",
    helper: "Show the strongest next actions first.",
  },
  {
    key: "watchlistMovement",
    label: "Watchlist movement",
    helper: "Show changes in saved trends.",
  },
  {
    key: "hiddenGems",
    label: "Hidden gems",
    helper: "Show promising early topics.",
  },
  {
    key: "creatorOpportunities",
    label: "Creator opportunities",
    helper: "Show creator-ready topics and angles.",
  },
  {
    key: "topicsToAvoid",
    label: "Topics to avoid",
    helper: "Show weak, stale or noisy topics.",
  },
  {
    key: "recommendedFocus",
    label: "Recommended focus",
    helper: "Show the final recommended focus block.",
  },
];

function PreferenceChoice<T extends string>({
  value,
  currentValue,
  label,
  helper,
  icon: Icon,
  onSelect,
}: {
  value: T;
  currentValue: T;
  label: string;
  helper: string;
  icon?: LucideIcon;
  onSelect: (value: T) => void;
}) {
  const isSelected = value === currentValue;

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-2xl border p-4 text-left transition",
        isSelected
          ? "border-secondary/35 bg-secondary/10 text-foreground shadow-radar"
          : "border-border/10 bg-[#0f0808]/35 text-muted-foreground/80 hover:border-border/25 hover:bg-muted/40 hover:text-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          {Icon ? (
            <div className="mt-0.5 rounded-xl bg-muted/60 p-2 text-secondary">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground/72">
              {helper}
            </p>
          </div>
        </div>
        {isSelected ? <Badge variant="secondary">Active</Badge> : null}
      </div>
    </button>
  );
}

function ToggleRow({
  label,
  helper,
  isChecked,
  icon: Icon,
  onToggle,
}: {
  label: string;
  helper: string;
  isChecked: boolean;
  icon?: LucideIcon;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start justify-between gap-4 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 text-left transition hover:border-border/25 hover:bg-muted/35"
    >
      <div className="flex gap-3">
        {Icon ? (
          <div className="mt-0.5 rounded-xl bg-muted/55 p-2 text-secondary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground/72">
            {helper}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition",
          isChecked
            ? "border-secondary/35 bg-secondary/25"
            : "border-border/20 bg-muted/50",
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-foreground transition",
            isChecked ? "translate-x-5 bg-secondary" : "translate-x-0 bg-muted-foreground",
          )}
        />
      </span>
    </button>
  );
}


function listToInput(value: string[]) {
  return value.join(", ");
}

function inputToList(value: string[]) {
  return value
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function weightLabel(value: number) {
  if (value >= 1.2) return "High";
  if (value <= 0.8) return "Low";
  return "Normal";
}

export function ProductSettingsView() {
  const [preferences, setPreferences] = useState<ProductPreferences>(
    defaultProductPreferences,
  );

  useEffect(() => {
    function handlePreferenceChange() {
      setPreferences(readProductPreferences());
    }

    handlePreferenceChange();

    window.addEventListener(productPreferencesChangedEvent, handlePreferenceChange);
    window.addEventListener("storage", handlePreferenceChange);

    return () => {
      window.removeEventListener(
        productPreferencesChangedEvent,
        handlePreferenceChange,
      );
      window.removeEventListener("storage", handlePreferenceChange);
    };
  }, []);

  function save(nextPreferences: ProductPreferences) {
    setPreferences(updateProductPreferences(() => nextPreferences));
  }

  function patch(nextPatch: Partial<ProductPreferences>) {
    save({ ...preferences, ...nextPatch });
  }

  function patchDashboardSection(key: keyof DashboardSectionPreferences) {
    save({
      ...preferences,
      dashboardSections: {
        ...preferences.dashboardSections,
        [key]: !preferences.dashboardSections[key],
      },
    });
  }

  function patchReportSection(key: keyof ReportSectionPreferences) {
    save({
      ...preferences,
      reportSections: {
        ...preferences.reportSections,
        [key]: !preferences.reportSections[key],
      },
    });
  }

  function patchInterestProfile(nextPatch: Partial<TopicInterestProfile>) {
    save({
      ...preferences,
      interestProfile: {
        ...preferences.interestProfile,
        ...nextPatch,
      },
    });
  }

  function togglePreferredCategory(category: string) {
    const currentCategories = preferences.interestProfile.preferredCategories;
    patchInterestProfile({
      preferredCategories: currentCategories.includes(category)
        ? currentCategories.filter((item) => item !== category)
        : [...currentCategories, category],
    });
  }

  function patchSourceWeight(key: SourceWeightKey, value: number) {
    save({
      ...preferences,
      sourceWeights: {
        ...preferences.sourceWeights,
        [key]: value,
      },
    });
  }

  const selectedReportSections = useMemo(
    () =>
      Object.values(preferences.reportSections).filter(Boolean).length,
    [preferences.reportSections],
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Product Settings
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Control the product, not the machine room.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              These preferences are local UI settings. They do not add auth,
              database writes, cron jobs or email sending. Boring on purpose,
              which is exactly how settings should behave.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreferences(resetProductPreferences())}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset defaults
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </section>

        <ProductExperienceBanner />

        <Card className="border-secondary/15 bg-[#160d0d]/66">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Settings2 className="h-4 w-4" />
              Product preferences
            </div>
            <CardTitle>Default workspace and lens</CardTitle>
            <CardDescription>
              Product is the normal user-facing experience. Admin is only a UI
              diagnostics workspace, not a security boundary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {workspaceOptions.map((option) => (
                <PreferenceChoice
                  key={option.value}
                  value={option.value}
                  currentValue={preferences.defaultWorkspace}
                  label={option.label}
                  helper={option.helper}
                  onSelect={(value) => patch({ defaultWorkspace: value })}
                />
              ))}
            </div>
            <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Default lens</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground/72">
                    More lenses can come later. For now, keep the product focused.
                  </p>
                </div>
                <Badge variant="accent">Creator + Startup</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Newspaper className="h-4 w-4" />
              Daily Brief preferences
            </div>
            <CardTitle>Default brief behavior</CardTitle>
            <CardDescription>
              Used by Daily Brief and Reports when the URL does not explicitly
              choose another window.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Default brief window
              </p>
              <div className="flex flex-wrap gap-2">
                {briefWindowOptions.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={
                      preferences.defaultBriefWindow === option ? "secondary" : "outline"
                    }
                    onClick={() => patch({ defaultBriefWindow: option })}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Default export
              </p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {exportOptions.map((option) => (
                  <PreferenceChoice
                    key={option.value}
                    value={option.value}
                    currentValue={preferences.defaultExport}
                    label={option.label}
                    helper={option.helper}
                    icon={option.icon}
                    onSelect={(value) => patch({ defaultExport: value })}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Brief tone
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {toneOptions.map((option) => (
                  <PreferenceChoice
                    key={option.value}
                    value={option.value}
                    currentValue={preferences.briefTone}
                    label={option.label}
                    helper={option.helper}
                    onSelect={(value) => patch({ briefTone: value })}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <FileText className="h-4 w-4" />
              Report templates
            </div>
            <CardTitle>Default report structure</CardTitle>
            <CardDescription>
              Templates steer the product copy and report history labels. The canonical export endpoints stay unchanged.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {reportTemplateOptions.map((option) => (
              <PreferenceChoice
                key={option.value}
                value={option.value}
                currentValue={preferences.reportTemplate}
                label={option.label}
                helper={option.helper}
                onSelect={(value) => patch({ reportTemplate: value })}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Gauge className="h-4 w-4" />
              Dashboard preferences
            </div>
            <CardTitle>Visible product sections</CardTitle>
            <CardDescription>
              Hide noisy product sections without deleting them from the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardSectionOptions.map((option) => (
              <ToggleRow
                key={option.key}
                label={option.label}
                helper={option.helper}
                icon={option.icon}
                isChecked={preferences.dashboardSections[option.key]}
                onToggle={() => patchDashboardSection(option.key)}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <FileText className="h-4 w-4" />
              Report preferences
            </div>
            <CardTitle>Brief sections shown in product flow</CardTitle>
            <CardDescription>
              {selectedReportSections} section{selectedReportSections === 1 ? "" : "s"} selected.
              Exports still use the canonical report model; this controls the
              user-facing reading flow first.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reportSectionOptions.map((option) => (
              <ToggleRow
                key={option.key}
                label={option.label}
                helper={option.helper}
                isChecked={preferences.reportSections[option.key]}
                onToggle={() => patchReportSection(option.key)}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Presentation className="h-4 w-4" />
              Demo / Pitch mode
            </div>
            <CardTitle>Presentation behavior</CardTitle>
            <CardDescription>
              These modes change framing and defaults. They do not create fake
              trends or enable hidden automation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              {experienceOptions.map((option) => (
                <PreferenceChoice
                  key={option.value}
                  value={option.value}
                  currentValue={preferences.experienceMode}
                  label={option.label}
                  helper={option.helper}
                  icon={option.icon}
                  onSelect={(value) => patch({ experienceMode: value })}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreferences(updateProductPreferences(demoProductPreferences))}
              >
                Apply demo setup
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPreferences(updateProductPreferences(pitchProductPreferences))}
              >
                Apply pitch setup
              </Button>
            </div>
          </CardContent>
        </Card>

        {preferences.defaultWorkspace === "admin" ? (
          <Card className="border-secondary/15 bg-secondary/10">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                <Wrench className="h-4 w-4" />
                Admin diagnostics shortcut
              </div>
              <CardTitle>Automation Admin is visible</CardTitle>
              <CardDescription>
                Your default workspace is Admin, so diagnostics navigation is
                available in the sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href="/admin/automation">Open Automation Admin</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <UserRound className="h-4 w-4" />
              Interest profile
            </div>
            <CardTitle>Topics you want the radar to favor</CardTitle>
            <CardDescription>
              This is a local product preference layer. It adjusts dashboard ranking and filtering without deleting data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Preferred categories
              </p>
              <div className="flex flex-wrap gap-2">
                {interestCategoryOptions.map((category) => {
                  const isSelected = preferences.interestProfile.preferredCategories.includes(category);
                  return (
                    <Button
                      key={category}
                      type="button"
                      size="sm"
                      variant={isSelected ? "secondary" : "outline"}
                      onClick={() => togglePreferredCategory(category)}
                    >
                      {category}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Include keywords
                </span>
                <input
                  value={listToInput(preferences.interestProfile.includeKeywords)}
                  onChange={(event) =>
                    patchInterestProfile({ includeKeywords: inputToList([event.target.value]) })
                  }
                  placeholder="agents, evals, local llm"
                  className="w-full rounded-2xl border border-border/10 bg-[#0f0808]/45 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/38 focus:border-secondary/40"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Exclude keywords
                </span>
                <input
                  value={listToInput(preferences.interestProfile.excludeKeywords)}
                  onChange={(event) =>
                    patchInterestProfile({ excludeKeywords: inputToList([event.target.value]) })
                  }
                  placeholder="crypto, celebrity, generic"
                  className="w-full rounded-2xl border border-border/10 bg-[#0f0808]/45 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/38 focus:border-secondary/40"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Minimum trend score</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground/72">
                      Hide weak topics below this score. Set to 0 for no score filter.
                    </p>
                  </div>
                  <Badge variant="muted">{preferences.interestProfile.minimumTrendScore}</Badge>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={preferences.interestProfile.minimumTrendScore}
                  onChange={(event) =>
                    patchInterestProfile({ minimumTrendScore: Number(event.target.value) })
                  }
                  className="mt-4 w-full"
                />
              </label>
              <ToggleRow
                label="Prioritize hidden gems"
                helper="Give early low-saturation opportunities a small ranking boost."
                icon={Sparkles}
                isChecked={preferences.interestProfile.prioritizeHiddenGems}
                onToggle={() =>
                  patchInterestProfile({
                    prioritizeHiddenGems: !preferences.interestProfile.prioritizeHiddenGems,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <SlidersHorizontal className="h-4 w-4" />
              Source quality weighting
            </div>
            <CardTitle>How much each source should influence ranking</CardTitle>
            <CardDescription>
              This affects client-side product ranking and the calibration lab. It does not rewrite historical snapshots.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sourceWeightOptions.map((option) => (
              <div
                key={option.key}
                className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground/72">
                      {option.helper}
                    </p>
                  </div>
                  <Badge variant="muted">{weightLabel(preferences.sourceWeights[option.key])}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={preferences.sourceWeights[option.key]}
                    onChange={(event) =>
                      patchSourceWeight(option.key, Number(event.target.value))
                    }
                    className="w-full"
                  />
                  <span className="w-12 text-right text-xs font-semibold text-secondary">
                    {preferences.sourceWeights[option.key].toFixed(2)}x
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-secondary/15 bg-secondary/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Mail className="h-4 w-4" />
              Manual-only email testing
            </div>
            <CardTitle>Email stays manual for now</CardTitle>
            <CardDescription>
              Internal email prep is available in Admin, but this product does not send, schedule or store recipients.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/admin/automation">Open internal email prep</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/reports/history">Open saved reports</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>Source presets</CardTitle>
            <CardDescription>
              Current filter presets stay visible here for reference. This keeps
              source logic discoverable without mixing it into product settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {sourcePresets.map((preset) => (
              <div
                key={preset.id}
                className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {preset.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground/72">
                      {preset.description}
                    </p>
                  </div>
                  <Badge variant="muted">Preset</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {preset.sources.map((source) => (
                    <span
                      key={source}
                      className="rounded-full border border-border/15 bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
