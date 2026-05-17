import type {
  DailyBriefReportBlock,
  DailyBriefReportDocument,
  DailyBriefReportSection,
} from "@/lib/trends/types";
import type { ReportTemplateId } from "@/lib/preferences/product-preferences";

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
  recommended_focus: ["focus", "recommend"],
};

function sectionMatches(section: DailyBriefReportSection, key: string) {
  const searchable = [section.id, section.title, section.eyebrow, section.description]
    .join(" ")
    .toLowerCase();
  return (sectionIdAliases[key] ?? [key]).some((alias) => searchable.includes(alias));
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

  return ordered;
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

export function buildTemplateMarkdown(
  document: DailyBriefReportDocument,
  templateId: ReportTemplateId,
) {
  const template = getReportTemplate(templateId);
  const sections = getTemplateOrderedSections(document, templateId).slice(0, 5);

  return [
    `# ${template.label}: ${document.title}`,
    "",
    template.headline,
    "",
    document.quickCopy.summary,
    "",
    `**Focus:** ${document.quickCopy.focusToday}`,
    `**Monitor:** ${document.quickCopy.monitor}`,
    `**Avoid:** ${document.quickCopy.avoid}`,
    "",
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      section.description,
      ...section.blocks.slice(0, 2).flatMap((block) => [
        "",
        `### ${block.title}`,
        block.body ?? block.description ?? "",
        ...(block.bullets?.slice(0, 4).map((bullet) => `- ${bullet}`) ?? []),
      ]),
      "",
    ]),
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n");
}
