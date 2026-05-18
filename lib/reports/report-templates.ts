import type {
  DailyBriefReportBlock,
  DailyBriefReportDocument,
  DailyBriefReportTrendReference,
  DailyBriefReportSection,
} from "@/lib/trends/types";
import type { ReportTemplateId } from "@/lib/preferences/product-preferences";
import { buildResearchMemoExportQa, researchMemoQaToReportSection } from "@/lib/reports/research-memo-qa";

export type ReportTemplateDefinition = {
  id: ReportTemplateId;
  label: string;
  eyebrow: string;
  headline: string;
  description: string;
  bestFor: string;
  primaryCta: string;
  preferredFormats: Array<"pdf" | "html" | "json" | "markdown">;
  sectionPriority: string[];
};

export const reportTemplates: Record<ReportTemplateId, ReportTemplateDefinition> = {
  executive: {
    id: "executive",
    label: "Executive brief",
    eyebrow: "Decision brief",
    headline: "What changed, what matters, and what to do next.",
    description:
      "A concise leadership view focused on priority actions, risk, and recommended focus. Best when someone needs the point without the engine room tour.",
    bestFor: "Founders, managers, product leads, quick weekly review.",
    primaryCta: "Open PDF report",
    preferredFormats: ["pdf", "markdown", "html", "json"],
    sectionPriority: [
      "executive_summary",
      "priority_actions",
      "recommended_focus",
      "topics_to_avoid",
      "watchlist_movement",
    ],
  },
  creator: {
    id: "creator",
    label: "Creator pack",
    eyebrow: "Content opportunity",
    headline: "Turn signals into angles, hooks, and timing decisions.",
    description:
      "A creator-friendly view that pushes hidden gems, content gaps, audience fit, and topics worth avoiding before they get saturated.",
    bestFor: "YouTube, LinkedIn, TikTok, newsletter and community content planning.",
    primaryCta: "Copy summary",
    preferredFormats: ["markdown", "pdf", "html", "json"],
    sectionPriority: [
      "creator_opportunities",
      "hidden_gems",
      "priority_actions",
      "recommended_focus",
      "topics_to_avoid",
    ],
  },
  research: {
    id: "research",
    label: "Research memo",
    eyebrow: "Evidence memo",
    headline: "Signals, confidence, uncertainty, and source-backed movement.",
    description:
      "A more analytical view for checking evidence density, warning signs, and why a trend deserves monitoring instead of hype.",
    bestFor: "Research notes, analyst review, internal validation.",
    primaryCta: "Download JSON",
    preferredFormats: ["json", "html", "pdf", "markdown"],
    sectionPriority: [
      "executive_summary",
      "watchlist_movement",
      "research_signal",
      "hidden_gems",
      "topics_to_avoid",
      "recommended_focus",
    ],
  },
  pitch: {
    id: "pitch",
    label: "Pitch snapshot",
    eyebrow: "Demo snapshot",
    headline: "A clean one-page story for showing the product value.",
    description:
      "A presentation-friendly view that keeps the strongest outcomes visible and pushes technical diagnostics out of the room.",
    bestFor: "60-second demos, product walkthroughs, founder-style presentation.",
    primaryCta: "Open print-ready version",
    preferredFormats: ["pdf", "html", "markdown", "json"],
    sectionPriority: [
      "executive_summary",
      "hidden_gems",
      "creator_opportunities",
      "priority_actions",
      "recommended_focus",
    ],
  },
};

const sectionIdAliases: Record<string, string[]> = {
  executive_summary: ["executive", "summary", "overview"],
  priority_actions: ["priority", "action", "queue"],
  watchlist_movement: ["watchlist", "movement"],
  hidden_gems: ["hidden", "gem"],
  creator_opportunities: ["creator", "opportun"],
  topics_to_avoid: ["avoid", "noise", "risk"],
  research_signal: ["research", "arxiv", "evidence"],
  recommended_focus: ["focus", "recommend"],
};

function sectionMatches(section: DailyBriefReportSection, key: string) {
  const searchable = [section.id, section.title, section.eyebrow, section.description]
    .join(" ")
    .toLowerCase();
  return (sectionIdAliases[key] ?? [key]).some((alias) => searchable.includes(alias));
}

const templateBlockAllowlist: Record<ReportTemplateId, string[]> = {
  executive: [
    "executive-headline",
    "radar-metrics",
    "priority-actions",
    "watchlist-movement",
    "topics-to-avoid",
    "focus-block",
    "warnings",
  ],
  creator: [
    "executive-headline",
    "hidden-gems",
    "creator-opportunities",
    "priority-actions",
    "topics-to-avoid",
    "focus-block",
    "warnings",
  ],
  research: [
    "executive-headline",
    "radar-metrics",
    "watchlist-movement",
    "hidden-gems",
    "research-signals",
    "topics-to-avoid",
    "focus-block",
    "warnings",
  ],
  pitch: [
    "executive-headline",
    "hidden-gems",
    "creator-opportunities",
    "priority-actions",
    "focus-block",
    "warnings",
  ],
};

function isHiddenReportTrend(ref: DailyBriefReportTrendReference) {
  return ref.visibilityStatus === "suppressed" || ref.visibilityStatus === "rejected";
}

function trendRefAllowedForTemplate(
  ref: DailyBriefReportTrendReference,
  templateId: ReportTemplateId,
  block: DailyBriefReportBlock,
) {
  if (isHiddenReportTrend(ref)) return false;

  if (templateId === "pitch") {
    return ref.visibilityStatus !== "research_only";
  }

  if (templateId === "executive" && block.id === "priority-actions") {
    return ref.visibilityDecision === "act" || ref.visibilityDecision === "watch" || !ref.visibilityDecision;
  }

  return true;
}

function blockAllowedForTemplate(
  block: DailyBriefReportBlock,
  templateId: ReportTemplateId,
) {
  const allowlist = templateBlockAllowlist[templateId];
  if (!allowlist.includes(block.id)) return false;

  if (templateId === "pitch" && block.type === "research_signal") return false;
  if (templateId === "creator" && block.type === "research_signal") return false;

  return true;
}

function filterBlockForTemplate(
  block: DailyBriefReportBlock,
  templateId: ReportTemplateId,
): DailyBriefReportBlock | null {
  if (!blockAllowedForTemplate(block, templateId)) return null;

  const trendRefs = block.trendRefs?.filter((ref) =>
    trendRefAllowedForTemplate(ref, templateId, block),
  );

  const nextBlock = trendRefs ? { ...block, trendRefs } : block;

  if (
    (nextBlock.type === "trend_list" ||
      nextBlock.type === "avoid_list" ||
      nextBlock.type === "research_signal" ||
      nextBlock.type === "watchlist_movement") &&
    (nextBlock.trendRefs?.length ?? 0) === 0
  ) {
    return null;
  }

  if (nextBlock.type === "warning_list" && (nextBlock.bullets?.length ?? 0) === 0) {
    return null;
  }

  return nextBlock;
}

function filterSectionForTemplate(
  section: DailyBriefReportSection,
  templateId: ReportTemplateId,
): DailyBriefReportSection | null {
  const blocks = section.blocks
    .map((block) => filterBlockForTemplate(block, templateId))
    .filter((block): block is DailyBriefReportBlock => Boolean(block));

  if (blocks.length === 0) return null;

  return {
    ...section,
    blocks,
  };
}

function applyTemplateFlowRules(
  sections: DailyBriefReportSection[],
  templateId: ReportTemplateId,
) {
  return sections
    .map((section) => filterSectionForTemplate(section, templateId))
    .filter((section): section is DailyBriefReportSection => Boolean(section));
}

export function getReportTemplate(id: ReportTemplateId) {
  return reportTemplates[id] ?? reportTemplates.executive;
}

export function getTemplateOrderedSections(
  document: DailyBriefReportDocument,
  templateId: ReportTemplateId,
) {
  const template = getReportTemplate(templateId);
  const selected = new Set<DailyBriefReportSection>();
  const ordered: DailyBriefReportSection[] = [];

  template.sectionPriority.forEach((key) => {
    const match = document.sections.find((section) => !selected.has(section) && sectionMatches(section, key));
    if (match) {
      selected.add(match);
      ordered.push(match);
    }
  });

  document.sections.forEach((section) => {
    if (!selected.has(section)) ordered.push(section);
  });

  return applyTemplateFlowRules(ordered, templateId);
}

export function getTemplateHeroBlocks(
  document: DailyBriefReportDocument,
  templateId: ReportTemplateId,
  limit = 4,
): DailyBriefReportBlock[] {
  return getTemplateOrderedSections(document, templateId)
    .flatMap((section) => section.blocks)
    .sort((a, b) => a.exportPriority - b.exportPriority)
    .slice(0, limit);
}

function blockText(block: DailyBriefReportBlock) {
  const lines = [
    `### ${block.title}`,
    block.body ?? block.description ?? "",
    ...(block.metrics?.map((metric) => `- ${metric.label}: ${metric.value}${metric.helper ? ` — ${metric.helper}` : ""}`) ?? []),
    ...(block.trendRefs?.slice(0, 5).map((trend) => `- ${trend.topic}: ${trend.helper}`) ?? []),
    ...(block.bullets?.slice(0, 6).map((bullet) => `- ${bullet}`) ?? []),
  ];

  return lines.filter(Boolean).join("\n");
}

function sectionText(section: DailyBriefReportSection, blockLimit = 2) {
  return [
    `## ${section.title}`,
    section.description,
    ...section.blocks.slice(0, blockLimit).map(blockText),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function topTrendRefs(document: DailyBriefReportDocument, matcher: string, limit = 3) {
  return document.sections
    .filter((section) => sectionMatches(section, matcher))
    .flatMap((section) => section.blocks)
    .flatMap((block) => block.trendRefs ?? [])
    .slice(0, limit);
}


function countBlocks(sections: DailyBriefReportSection[]) {
  return sections.reduce((total, section) => total + section.blocks.length, 0);
}

function countTrendReferences(sections: DailyBriefReportSection[]) {
  return sections.reduce(
    (sectionTotal, section) =>
      sectionTotal +
      section.blocks.reduce(
        (blockTotal, block) => blockTotal + (block.trendRefs?.length ?? 0),
        0,
      ),
    0,
  );
}

function insertResearchQaSection(
  sections: DailyBriefReportSection[],
  qaSection: DailyBriefReportSection,
) {
  const withoutExistingQa = sections.filter((section) => section.id !== qaSection.id);
  const researchIndex = withoutExistingQa.findIndex((section) =>
    sectionMatches(section, "research_signal"),
  );

  if (researchIndex < 0) {
    return [...withoutExistingQa, qaSection];
  }

  return [
    ...withoutExistingQa.slice(0, researchIndex + 1),
    qaSection,
    ...withoutExistingQa.slice(researchIndex + 1),
  ];
}

export function buildTemplateReportDocument(
  document: DailyBriefReportDocument,
  templateId: ReportTemplateId,
): DailyBriefReportDocument {
  const template = getReportTemplate(templateId);
  let sections = getTemplateOrderedSections(document, templateId);
  const markdownSource: DailyBriefReportDocument = {
    ...document,
    sections,
  };
  const markdown = buildTemplateMarkdown(markdownSource, templateId);

  const templateDocument: DailyBriefReportDocument = {
    ...document,
    title: `${template.label}: ${document.title}`,
    subtitle: template.headline,
    sections,
    quickCopy: {
      ...document.quickCopy,
      headline: template.headline,
      markdown,
    },
  };

  if (templateId === "research") {
    const qa = buildResearchMemoExportQa(templateDocument, templateId);
    sections = insertResearchQaSection(sections, researchMemoQaToReportSection(qa));
  }

  const integrity = {
    ...document.integrity,
    sectionCount: sections.length,
    blockCount: countBlocks(sections),
    trendReferenceCount: countTrendReferences(sections),
  };

  return {
    ...templateDocument,
    sections,
    integrity,
  };
}

export function buildTemplateMarkdown(
  document: DailyBriefReportDocument,
  templateId: ReportTemplateId,
) {
  const template = getReportTemplate(templateId);
  const sections = getTemplateOrderedSections(document, templateId);
  const priority = topTrendRefs(document, "priority_actions", 3);
  const creators = topTrendRefs(document, "creator_opportunities", 4);
  const hidden = topTrendRefs(document, "hidden_gems", 4);
  const research = topTrendRefs(document, "research_signal", 4);
  const avoid = topTrendRefs(document, "topics_to_avoid", 4);

  if (templateId === "creator") {
    return [
      `# ${template.label}: ${document.title}`,
      "",
      template.headline,
      "",
      `**Recommended focus:** ${document.quickCopy.focusToday}`,
      "",
      "## Content angles",
      ...(creators.length > 0
        ? creators.map((trend) => `- ${trend.topic}: ${trend.helper}`)
        : document.quickCopy.bullets.map((bullet) => `- ${bullet}`)),
      "",
      "## Hooks to test",
      ...(hidden.length > 0
        ? hidden.map((trend) => `- Why ${trend.topic.toLowerCase()} matters before it becomes obvious.`)
        : ["- Use the strongest signal as a practical explainer, not a generic AI reaction." ]),
      "",
      "## Suggested formats and timing",
      ...sections
        .filter((section) => sectionMatches(section, "creator_opportunities"))
        .flatMap((section) => section.blocks.slice(0, 3).map(blockText)),
      "",
      "## Topics to avoid",
      ...(avoid.length > 0
        ? avoid.map((trend) => `- ${trend.topic}: ${trend.helper}`)
        : [`- ${document.quickCopy.avoid}`]),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (templateId === "research") {
    return [
      `# ${template.label}: ${document.title}`,
      "",
      template.headline,
      "",
      `**Confidence:** ${document.metadata.postureConfidence}/100 (${document.metadata.postureLabel})`,
      `**Source coverage:** ${document.metadata.sourceCoverageLabel}`,
      "",
      "## Evidence-first read",
      document.quickCopy.summary,
      "",
      "## Source quality and uncertainty",
      ...(document.integrity.validationWarnings.length > 0
        ? document.integrity.validationWarnings.map((warning) => `- ${warning}`)
        : ["- No report-model validation warning is currently attached."]),
      "",
      "## Research signals",
      ...(research.length > 0
        ? research.map((trend) => `- ${trend.topic}: ${trend.helper}`)
        : ["- No arXiv-backed candidate is changing this memo yet."]),
      "",
      ...sections.slice(0, 5).map((section) => sectionText(section, 3)),
      "",
      "## What needs more validation",
      ...(avoid.length > 0
        ? avoid.map((trend) => `- ${trend.topic}: ${trend.helper}`)
        : [`- ${document.quickCopy.monitor}`]),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (templateId === "pitch") {
    const top = priority[0] ?? hidden[0] ?? creators[0] ?? null;
    return [
      `# ${template.label}: ${document.title}`,
      "",
      "## Opportunity framing",
      top
        ? `${top.topic} is the cleanest current example of how Trend Finder turns early signals into a decision.`
        : document.quickCopy.summary,
      "",
      "## Problem",
      "AI trend discovery is noisy: most tools show lists, not confidence, evidence quality, action timing and avoidance logic.",
      "",
      "## Why now",
      document.quickCopy.focusToday,
      "",
      "## Market signal / early evidence",
      ...(priority.length > 0
        ? priority.map((trend) => `- ${trend.topic}: ${trend.helper}`)
        : document.quickCopy.bullets.map((bullet) => `- ${bullet}`)),
      "",
      "## Suggested narrative",
      "Trend Finder is an intelligence radar: scan real sources, score early movement, separate watch/act/avoid, then export a usable brief.",
      "",
      "## Caveats",
      ...(document.integrity.validationWarnings.length > 0
        ? document.integrity.validationWarnings.map((warning) => `- ${warning}`)
        : ["- This is based on the current local scan data; no fake demo claims are added."]),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `# ${template.label}: ${document.title}`,
    "",
    template.headline,
    "",
    document.quickCopy.summary,
    "",
    "## Top 3 moves",
    ...(priority.length > 0
      ? priority.map((trend) => `- ${trend.topic}: ${trend.helper}`)
      : document.quickCopy.bullets.slice(0, 3).map((bullet) => `- ${bullet}`)),
    "",
    `**Focus:** ${document.quickCopy.focusToday}`,
    `**Watch:** ${document.quickCopy.monitor}`,
    `**Avoid:** ${document.quickCopy.avoid}`,
    "",
    "## Risks and caveats",
    ...(avoid.length > 0
      ? avoid.map((trend) => `- ${trend.topic}: ${trend.helper}`)
      : document.integrity.validationWarnings.map((warning) => `- ${warning}`)),
    "",
    ...sections.slice(0, 4).map((section) => sectionText(section, 2)),
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n");
}
