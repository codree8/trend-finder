import type {
  ActionQueueItem,
  DailyBriefExecutiveSummary,
  DailyBriefNarrative,
  DailyBriefPosture,
  DailyBriefQaSummary,
  DailyBriefRadarStats,
  DailyBriefRecommendedFocus,
  DailyBriefReportBlock,
  DailyBriefReportDocument,
  DailyBriefReportMetric,
  DailyBriefReportSection,
  DailyBriefReportTone,
  DailyBriefReportTrendReference,
  DailyBriefTopicToAvoid,
  DashboardTrend,
  DashboardWindow,
  SavedTrendWithCurrent,
} from "@/lib/trends/types";

type BuildDailyBriefReportDocumentInput = {
  window: DashboardWindow;
  generatedAt: string;
  executiveSummary: DailyBriefExecutiveSummary;
  radarStats: DailyBriefRadarStats;
  briefPosture: DailyBriefPosture;
  qa: DailyBriefQaSummary;
  intelligenceNarratives: DailyBriefNarrative[];
  topPriorityActions: ActionQueueItem[];
  watchlistMovement: SavedTrendWithCurrent[];
  hiddenGemsWorthWatching: DashboardTrend[];
  creatorOpportunities: DashboardTrend[];
  topicsToAvoid: DailyBriefTopicToAvoid[];
  overallWarnings: string[];
  recommendedFocus: DailyBriefRecommendedFocus;
};

function normalizeKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function compactUnique(items: string[], maxItems = 8) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const value = item.trim();
    const key = normalizeKey(value);
    if (!value || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
    if (output.length >= maxItems) break;
  }

  return output;
}

function trendKeyFor(trend: DashboardTrend) {
  return trend.canonicalKey || trend.id || trend.slug || trend.topic;
}

function trendRef(
  trend: DashboardTrend,
  helper: string,
): DailyBriefReportTrendReference {
  return {
    topic: trend.topic,
    slug: trend.slug || null,
    trendKey: trendKeyFor(trend),
    status: trend.status,
    score: trend.trendScore,
    qualityScore: trend.topicQuality.score,
    lifecycleStatus: trend.lifecycle.status,
    helper,
  };
}

function metric(
  label: string,
  value: string | number,
  helper?: string,
  tone?: DailyBriefReportTone,
): DailyBriefReportMetric {
  return {
    label,
    value: String(value),
    helper,
    tone,
  };
}

function block(args: DailyBriefReportBlock): DailyBriefReportBlock {
  return args;
}

function section(args: DailyBriefReportSection): DailyBriefReportSection {
  return {
    ...args,
    blocks: args.blocks
      .filter((item) => {
        if (item.type === "trend_list" || item.type === "avoid_list") {
          return (item.trendRefs?.length ?? 0) > 0;
        }

        if (item.type === "warning_list")
          return (item.bullets?.length ?? 0) > 0;
        if (item.type === "metric_grid") return (item.metrics?.length ?? 0) > 0;
        return Boolean(
          item.body || item.bullets?.length || item.trendRefs?.length,
        );
      })
      .sort((a, b) => a.exportPriority - b.exportPriority),
  };
}

function narrativeToneToReportTone(
  tone: DailyBriefNarrative["tone"],
): DailyBriefReportTone {
  if (tone === "opportunity") return "positive";
  if (tone === "risk") return "danger";
  if (tone === "monitor") return "warning";
  return "neutral";
}

function buildMarkdown(input: BuildDailyBriefReportDocumentInput) {
  const lines = [
    `# Daily Intelligence Brief — ${input.window}`,
    "",
    `Generated: ${input.generatedAt}`,
    "",
    `## ${input.executiveSummary.headline}`,
    "",
    input.executiveSummary.narrative,
    "",
    "### Key points",
    ...input.executiveSummary.bullets.map((item) => `- ${item}`),
    "",
    "### Recommended focus",
    `- Focus today: ${input.recommendedFocus.focusToday}`,
    `- Monitor: ${input.recommendedFocus.monitor}`,
    `- Avoid: ${input.recommendedFocus.avoid}`,
  ];

  if (input.intelligenceNarratives.length > 0) {
    lines.push("", "### Intelligence narratives");
    for (const narrative of input.intelligenceNarratives) {
      lines.push(
        `- ${narrative.title}: ${narrative.verdict} (${narrative.confidence}/100 confidence)`,
      );
    }
  }

  if (input.overallWarnings.length > 0) {
    lines.push("", "### Warnings");
    lines.push(...input.overallWarnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

function buildValidationWarnings(input: BuildDailyBriefReportDocumentInput) {
  const warnings: string[] = [];

  if (input.executiveSummary.bullets.length === 0) {
    warnings.push(
      "Executive summary has no bullet points for compact exports.",
    );
  }

  if (input.intelligenceNarratives.length === 0) {
    warnings.push(
      "No intelligence narratives are available for long-form export.",
    );
  }

  if (input.qa.status === "too_aggressive") {
    warnings.push(
      "QA marked this brief as too aggressive; export should preserve caution labels.",
    );
  }

  if (input.qa.lowEvidenceNarratives > 0) {
    warnings.push(
      `${input.qa.lowEvidenceNarratives} narrative(s) have thin evidence and should not be exported as hard claims.`,
    );
  }

  if (input.topPriorityActions.length === 0) {
    warnings.push(
      "No priority action cleared tuning; exports should avoid an execution-heavy headline.",
    );
  }

  return compactUnique(warnings, 6);
}

function trendRefsFromActions(items: ActionQueueItem[]) {
  return items.map((item) =>
    trendRef(
      item.trend,
      `${item.actionPriorityLabel}: ${item.recommendedNextStep}`,
    ),
  );
}

function trendRefsFromTrends(
  trends: DashboardTrend[],
  helperForTrend: (trend: DashboardTrend) => string,
) {
  return trends.map((trend) => trendRef(trend, helperForTrend(trend)));
}

function trendRefsFromWatchlist(items: SavedTrendWithCurrent[]) {
  return items
    .filter((item) => item.currentTrend !== null)
    .map((item) =>
      trendRef(
        item.currentTrend!,
        `${item.delta.watchStatusLabel}: ${item.delta.summary}`,
      ),
    );
}

function trendRefsFromAvoid(items: DailyBriefTopicToAvoid[]) {
  return items.map((item) =>
    trendRef(item.trend, `${item.severity}: ${item.reason}`),
  );
}

export function buildDailyBriefReportDocument(
  input: BuildDailyBriefReportDocumentInput,
): DailyBriefReportDocument {
  const markdown = buildMarkdown(input);
  const sections = [
    section({
      id: "executive-summary",
      eyebrow: "Summary",
      title: "Executive Summary",
      description:
        "Short lead section for report, PDF and HTML export surfaces.",
      tone:
        input.briefPosture.posture === "offensive"
          ? "positive"
          : input.briefPosture.posture === "defensive"
            ? "danger"
            : "warning",
      exportPriority: 10,
      blocks: [
        block({
          id: "executive-headline",
          type: "summary",
          title: input.executiveSummary.headline,
          body: input.executiveSummary.narrative,
          bullets: input.executiveSummary.bullets,
          tone: "neutral",
          exportPriority: 10,
        }),
        block({
          id: "radar-metrics",
          type: "metric_grid",
          title: "Radar metrics",
          metrics: [
            metric(
              "Tracked",
              input.radarStats.totalTrends,
              "Current trend snapshots",
            ),
            metric(
              "Act Now",
              input.radarStats.actNow,
              "Priority queue count",
              "positive",
            ),
            metric(
              "Monitor",
              input.radarStats.monitor,
              "Watch candidates",
              "warning",
            ),
            metric(
              "Hidden Gems",
              input.radarStats.hiddenGems,
              "Quality-gated early openings",
              "positive",
            ),
            metric(
              "Creator",
              input.radarStats.creatorOpportunities,
              "Best creator opportunities",
              "positive",
            ),
            metric(
              "Avoid",
              input.radarStats.topicsToAvoid,
              "Noise/stale/generic topics",
              "danger",
            ),
          ],
          exportPriority: 20,
        }),
      ],
    }),
    section({
      id: "narratives",
      eyebrow: "Readout",
      title: "Intelligence Narratives",
      description:
        "Portable narrative cards, already calibrated by the Daily Brief QA layer.",
      tone: "neutral",
      exportPriority: 20,
      blocks: input.intelligenceNarratives.map((narrative, index) =>
        block({
          id: `narrative-${narrative.id}`,
          type: "narrative",
          title: narrative.title,
          description: narrative.verdict,
          body: narrative.narrative,
          bullets: [
            ...narrative.evidence,
            `Recommended move: ${narrative.recommendedMove}`,
            narrative.calibration
              ? `QA calibration: ${narrative.calibration.status} — ${narrative.calibration.note}`
              : "QA calibration: not adjusted.",
          ],
          trendRefs:
            narrative.relatedTrendSlug || narrative.relatedTrendKey
              ? [
                  {
                    topic: narrative.title,
                    slug: narrative.relatedTrendSlug,
                    trendKey: narrative.relatedTrendKey,
                    status: narrative.eyebrow,
                    score: narrative.confidence,
                    qualityScore: narrative.confidence,
                    lifecycleStatus: "n/a",
                    helper: narrative.recommendedMove,
                  },
                ]
              : [],
          tone: narrativeToneToReportTone(narrative.tone),
          exportPriority: 10 + index,
        }),
      ),
    }),
    section({
      id: "actions-and-watchlist",
      eyebrow: "Actions",
      title: "Priority Actions & Watchlist Movement",
      description:
        "Execution candidates and saved trend movement in one export-safe section.",
      tone: "positive",
      exportPriority: 30,
      pageBreakBefore: true,
      blocks: [
        block({
          id: "priority-actions",
          type: "trend_list",
          title: "Today’s Priority Actions",
          description:
            "Act Now / Monitor candidates from the tuned Action Queue.",
          trendRefs: trendRefsFromActions(input.topPriorityActions),
          tone: "positive",
          exportPriority: 10,
        }),
        block({
          id: "watchlist-movement",
          type: "watchlist_movement",
          title: "Watchlist Movement",
          description:
            "Saved trends with movement, new evidence or inspection pressure.",
          trendRefs: trendRefsFromWatchlist(input.watchlistMovement),
          tone: "warning",
          exportPriority: 20,
        }),
      ],
    }),
    section({
      id: "opportunities-and-avoidance",
      eyebrow: "Opportunities",
      title: "Hidden Gems, Creator Opportunities & Avoidance",
      description:
        "The part that keeps future exports balanced: what to pursue and what to ignore.",
      tone: "warning",
      exportPriority: 40,
      pageBreakBefore: true,
      blocks: [
        block({
          id: "hidden-gems",
          type: "trend_list",
          title: "Hidden Gems Worth Watching",
          trendRefs: trendRefsFromTrends(
            input.hiddenGemsWorthWatching,
            (trend) =>
              `${trend.summary} Hidden gem score ${trend.hiddenGemScore}/100.`,
          ),
          tone: "positive",
          exportPriority: 10,
        }),
        block({
          id: "creator-opportunities",
          type: "trend_list",
          title: "Best Creator Opportunities",
          trendRefs: trendRefsFromTrends(
            input.creatorOpportunities,
            (trend) =>
              `${trend.creatorOpportunity.recommendedTiming}: ${trend.creatorOpportunity.bestAngle}`,
          ),
          tone: "positive",
          exportPriority: 20,
        }),
        block({
          id: "topics-to-avoid",
          type: "avoid_list",
          title: "Topics To Avoid Today",
          trendRefs: trendRefsFromAvoid(input.topicsToAvoid),
          tone: "danger",
          exportPriority: 30,
        }),
      ],
    }),
    section({
      id: "recommended-focus",
      eyebrow: "Decision",
      title: "Recommended Focus",
      description:
        "Compact final decision block for PDF conclusion and copy-friendly summaries.",
      tone: "neutral",
      exportPriority: 50,
      pageBreakBefore: true,
      blocks: [
        block({
          id: "focus-block",
          type: "focus",
          title: "What to do after reading the brief",
          bullets: [
            `Focus today: ${input.recommendedFocus.focusToday}`,
            `Monitor: ${input.recommendedFocus.monitor}`,
            `Avoid: ${input.recommendedFocus.avoid}`,
            ...input.recommendedFocus.rationale,
          ],
          tone: "neutral",
          exportPriority: 10,
        }),
        block({
          id: "warnings",
          type: "warning_list",
          title: "Warnings to preserve in exports",
          bullets: input.overallWarnings,
          tone: "danger",
          exportPriority: 20,
        }),
      ],
    }),
  ]
    .filter((item) => item.blocks.length > 0)
    .sort((a, b) => a.exportPriority - b.exportPriority);

  const blockCount = sections.reduce(
    (sum, item) => sum + item.blocks.length,
    0,
  );
  const trendReferenceCount = sections.reduce(
    (sectionSum, item) =>
      sectionSum +
      item.blocks.reduce(
        (blockSum, currentBlock) =>
          blockSum + (currentBlock.trendRefs?.length ?? 0),
        0,
      ),
    0,
  );

  return {
    schemaVersion: "daily-brief-export-v1",
    documentType: "daily_intelligence_brief",
    title: "Daily Intelligence Brief",
    subtitle: input.executiveSummary.headline,
    window: input.window,
    generatedAt: input.generatedAt,
    exportTargets: ["ui", "html", "pdf", "json"],
    metadata: {
      posture: input.briefPosture.posture,
      postureLabel: input.briefPosture.label,
      postureConfidence: input.briefPosture.confidence,
      qaStatus: input.qa.status,
      qaStatusLabel: input.qa.statusLabel,
      sourceCoverageLabel: input.radarStats.sourceCoverageLabel,
      latestScanAt: input.radarStats.latestScanAt,
    },
    sections,
    quickCopy: {
      headline: input.executiveSummary.headline,
      summary: input.executiveSummary.narrative,
      bullets: input.executiveSummary.bullets,
      focusToday: input.recommendedFocus.focusToday,
      monitor: input.recommendedFocus.monitor,
      avoid: input.recommendedFocus.avoid,
      markdown,
    },
    integrity: {
      sectionCount: sections.length,
      blockCount,
      trendReferenceCount,
      validationWarnings: buildValidationWarnings(input),
    },
  };
}
