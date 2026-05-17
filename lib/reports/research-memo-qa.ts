import type {
  DailyBriefReportBlock,
  DailyBriefReportDocument,
  DailyBriefReportMetric,
  DailyBriefReportSection,
  DailyBriefReportTone,
} from "@/lib/trends/types";
import type { ReportTemplateId } from "@/lib/preferences/product-preferences";

export type ResearchMemoExportQaStatus = "ready" | "review" | "blocked";
export type ResearchMemoExportQaSeverity = "success" | "info" | "warning" | "danger";

export type ResearchMemoExportQaCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  severity: ResearchMemoExportQaSeverity;
};

export type ResearchMemoExportQa = {
  schemaVersion: "research-memo-export-qa-v1";
  status: ResearchMemoExportQaStatus;
  statusLabel: string;
  tone: DailyBriefReportTone;
  score: number;
  generatedAt: string;
  summary: string;
  recommendedAction: string;
  metrics: {
    researchSections: number;
    researchBlocks: number;
    researchTrendReferences: number;
    caveatMentions: number;
    sourceQualityMentions: number;
    validationWarnings: number;
    exportTargets: number;
    templateMarkdownAligned: boolean;
  };
  checks: ResearchMemoExportQaCheck[];
  warnings: string[];
};

const researchTerms = ["research", "arxiv", "paper", "preprint", "evidence"];
const caveatTerms = [
  "not adoption proof",
  "validate",
  "validation",
  "cautious",
  "confirmation",
  "uncertainty",
  "caveat",
  "not enough",
  "watch/research",
];
const sourceTerms = ["source", "coverage", "confirmation", "evidence", "quality"];
const aggressiveTerms = [
  "guaranteed",
  "proven market",
  "confirmed adoption",
  "must act",
  "definitely mainstream",
];

function lower(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function hasAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function blockText(block: DailyBriefReportBlock) {
  return [
    block.id,
    block.type,
    block.title,
    block.description,
    block.body,
    ...(block.bullets ?? []),
    ...(block.metrics?.map((metric) => `${metric.label} ${metric.value} ${metric.helper ?? ""}`) ?? []),
    ...(block.trendRefs?.map((trend) => `${trend.topic} ${trend.status} ${trend.helper}`) ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function sectionText(section: DailyBriefReportSection) {
  return [
    section.id,
    section.eyebrow,
    section.title,
    section.description,
    ...section.blocks.map(blockText),
  ].join(" ");
}

function isResearchSection(section: DailyBriefReportSection) {
  return hasAny(sectionText(section), researchTerms);
}

function isResearchBlock(block: DailyBriefReportBlock) {
  return block.type === "research_signal" || hasAny(blockText(block), researchTerms);
}

function countTermHits(values: string[], terms: string[]) {
  return values.reduce((count, value) => count + (hasAny(value, terms) ? 1 : 0), 0);
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function check(args: ResearchMemoExportQaCheck): ResearchMemoExportQaCheck {
  return args;
}

function statusLabel(status: ResearchMemoExportQaStatus) {
  const labels: Record<ResearchMemoExportQaStatus, string> = {
    ready: "Research memo export ready",
    review: "Research memo needs review",
    blocked: "Research memo export blocked",
  };

  return labels[status];
}

function toneForStatus(status: ResearchMemoExportQaStatus): DailyBriefReportTone {
  if (status === "ready") return "positive";
  if (status === "review") return "warning";
  return "danger";
}

function checkPenalty(item: ResearchMemoExportQaCheck) {
  if (item.passed) return 0;
  if (item.severity === "danger") return 22;
  if (item.severity === "warning") return 10;
  return 4;
}

export function buildResearchMemoExportQa(
  document: DailyBriefReportDocument,
  templateId: ReportTemplateId = "research",
): ResearchMemoExportQa {
  const sections = document.sections;
  const researchSections = sections.filter(isResearchSection);
  const researchBlocks = sections.flatMap((section) => section.blocks).filter(isResearchBlock);
  const researchBlockTexts = researchBlocks.map(blockText);
  const researchTrendReferences = researchBlocks.reduce(
    (count, block) => count + (block.trendRefs?.length ?? 0),
    0,
  );
  const caveatMentions = countTermHits(researchBlockTexts, caveatTerms);
  const sourceQualityMentions = countTermHits(researchBlockTexts, sourceTerms);
  const validationWarnings = document.integrity.validationWarnings.length;
  const markdown = lower(document.quickCopy.markdown);
  const templateMarkdownAligned =
    templateId !== "research" ||
    (markdown.includes("research signals") &&
      markdown.includes("source quality") &&
      markdown.includes("validation"));
  const hasAggressiveResearchCopy = researchBlockTexts.some((text) =>
    hasAny(text, aggressiveTerms),
  );
  const hasResearchEvidence = researchTrendReferences > 0;

  const checks: ResearchMemoExportQaCheck[] = [
    check({
      id: "shared-report-document",
      label: "Shared report document",
      passed: document.schemaVersion === "daily-brief-export-v1",
      detail: "Research Memo must be rendered from the same reportDocument model as HTML, PDF and JSON.",
      severity: "danger",
    }),
    check({
      id: "research-section-separated",
      label: "Research evidence separated",
      passed: researchSections.length > 0 && researchBlocks.length > 0,
      detail:
        researchBlocks.length > 0
          ? `${researchBlocks.length} research-aware block(s) are present.`
          : "No research block is present, so arXiv evidence can disappear from exports.",
      severity: hasResearchEvidence ? "danger" : "warning",
    }),
    check({
      id: "research-caveat-visible",
      label: "Research caveat visible",
      passed: !hasResearchEvidence || caveatMentions > 0,
      detail:
        !hasResearchEvidence
          ? "No arXiv-backed candidate is present in this window."
          : caveatMentions > 0
            ? `${caveatMentions} caveat mention(s) keep research evidence from reading like adoption proof.`
            : "arXiv-backed candidates need a visible caveat in the export.",
      severity: "warning",
    }),
    check({
      id: "source-quality-visible",
      label: "Source quality visible",
      passed: !hasResearchEvidence || sourceQualityMentions > 0,
      detail:
        sourceQualityMentions > 0
          ? `${sourceQualityMentions} source/evidence quality mention(s) found in research blocks.`
          : "Research Memo should explain source quality or confirmation before suggesting a decision.",
      severity: "warning",
    }),
    check({
      id: "no-aggressive-research-claims",
      label: "No aggressive research-only claims",
      passed: !hasAggressiveResearchCopy,
      detail: hasAggressiveResearchCopy
        ? "A research block contains aggressive adoption language. Keep research as evidence, not proof."
        : "Research blocks avoid hard adoption claims.",
      severity: "danger",
    }),
    check({
      id: "template-markdown-aligned",
      label: "Markdown aligned with Research Memo",
      passed: templateMarkdownAligned,
      detail: templateMarkdownAligned
        ? "Quick-copy markdown includes research signals, source quality and validation language."
        : "Quick-copy markdown does not match the Research Memo structure yet.",
      severity: "warning",
    }),
    check({
      id: "export-targets-present",
      label: "Export targets present",
      passed: document.exportTargets.includes("html") && document.exportTargets.includes("pdf") && document.exportTargets.includes("json"),
      detail: `${document.exportTargets.length} export target(s): ${document.exportTargets.join(", ")}.`,
      severity: "danger",
    }),
  ];

  const warnings = [
    ...checks
      .filter((item) => !item.passed)
      .map((item) => `${item.label}: ${item.detail}`),
    ...document.integrity.validationWarnings.filter((warning) =>
      /research|arxiv|evidence|adoption|isolated|cautious/i.test(warning),
    ),
  ].slice(0, 8);

  const score = clampScore(
    100 - checks.reduce((sum, item) => sum + checkPenalty(item), 0) - Math.min(12, validationWarnings * 3),
  );
  const blockers = checks.filter((item) => !item.passed && item.severity === "danger").length;
  const reviewItems = checks.filter((item) => !item.passed && item.severity !== "danger").length + validationWarnings;
  const status: ResearchMemoExportQaStatus =
    blockers > 0 ? "blocked" : reviewItems > 0 || score < 86 ? "review" : "ready";

  return {
    schemaVersion: "research-memo-export-qa-v1",
    status,
    statusLabel: statusLabel(status),
    tone: toneForStatus(status),
    score,
    generatedAt: new Date().toISOString(),
    summary:
      status === "ready"
        ? "Research Memo export keeps arXiv evidence, caveats and source-quality language aligned across report surfaces."
        : status === "review"
          ? "Research Memo export is usable, but one or more caveats or alignment checks should be reviewed before presenting it."
          : "Research Memo export is missing a required evidence or safety boundary and should not be presented yet.",
    recommendedAction:
      status === "ready"
        ? "Use Research Memo for evidence-first review, then export HTML/PDF/JSON from the same selected template."
        : "Keep the caveat visible, verify research-only candidates are not presented as adoption proof, then rerun report export checks.",
    metrics: {
      researchSections: researchSections.length,
      researchBlocks: researchBlocks.length,
      researchTrendReferences,
      caveatMentions,
      sourceQualityMentions,
      validationWarnings,
      exportTargets: document.exportTargets.length,
      templateMarkdownAligned,
    },
    checks,
    warnings,
  };
}

function metric(label: string, value: string | number, helper: string, tone?: DailyBriefReportTone): DailyBriefReportMetric {
  return {
    label,
    value: String(value),
    helper,
    tone,
  };
}

export function researchMemoQaToReportSection(
  qa: ResearchMemoExportQa,
): DailyBriefReportSection {
  return {
    id: "research-memo-qa",
    eyebrow: "QA",
    title: "Research Memo QA",
    description:
      "Export consistency check for research evidence, arXiv caveats, source quality and template-aligned copy.",
    tone: qa.tone,
    exportPriority: 90,
    blocks: [
      {
        id: "research-memo-qa-summary",
        type: "metric_grid",
        title: qa.statusLabel,
        description: qa.summary,
        metrics: [
          metric("Score", qa.score, qa.recommendedAction, qa.tone),
          metric("Research refs", qa.metrics.researchTrendReferences, "arXiv/research-backed trend references."),
          metric("Caveats", qa.metrics.caveatMentions, "Visible caution/validation language."),
          metric("Source quality", qa.metrics.sourceQualityMentions, "Mentions of source/evidence quality."),
        ],
        tone: qa.tone,
        exportPriority: 10,
      },
      {
        id: "research-memo-qa-checks",
        type: "warning_list",
        title: "Research export checks",
        bullets: qa.checks.map((item) =>
          `${item.passed ? "Pass" : "Review"}: ${item.label} — ${item.detail}`,
        ),
        tone: qa.status === "ready" ? "positive" : "warning",
        exportPriority: 20,
      },
    ],
  };
}
