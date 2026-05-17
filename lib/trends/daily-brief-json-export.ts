import type { ReportTemplateId } from "@/lib/preferences/product-preferences";
import { getReportTemplate, buildTemplateReportDocument } from "@/lib/reports/report-templates";
import { buildResearchMemoExportQa } from "@/lib/reports/research-memo-qa";
import type {
  DailyBriefReportDocument,
  DailyBriefResponse,
  DashboardWindow,
} from "@/lib/trends/types";

export type DailyBriefJsonExportPayload = "report-document" | "full-brief";

export type DailyBriefJsonExportEnvelope = {
  ok: true;
  schemaVersion: "daily-brief-json-export-v2";
  exportType: "daily_intelligence_brief_json";
  payload: DailyBriefJsonExportPayload;
  template: {
    id: ReportTemplateId;
    label: string;
    appliedToReportDocument: boolean;
  };
  window: DashboardWindow;
  generatedAt: string;
  source: {
    route: "/api/daily-brief/export/json";
    documentSchemaVersion: DailyBriefReportDocument["schemaVersion"];
    documentType: DailyBriefReportDocument["documentType"];
  };
  integrity: DailyBriefReportDocument["integrity"] & {
    includesFullBrief: boolean;
    exportedSectionCount: number;
    exportedBlockCount: number;
    exportedTrendReferenceCount: number;
    researchMemoQaStatus: string;
    researchMemoQaScore: number;
  };
  data: DailyBriefReportDocument | DailyBriefResponse;
};

function normalizePayload(value: string | null): DailyBriefJsonExportPayload {
  if (value === "full" || value === "full-brief" || value === "brief") {
    return "full-brief";
  }

  return "report-document";
}

function safeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function datePart(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return safeFilenamePart(value) || "generated";
  }

  return date.toISOString().slice(0, 10);
}

function countBlocks(document: DailyBriefReportDocument) {
  return document.sections.reduce(
    (total, section) => total + section.blocks.length,
    0,
  );
}

function countTrendReferences(document: DailyBriefReportDocument) {
  return document.sections.reduce(
    (sectionTotal, section) =>
      sectionTotal +
      section.blocks.reduce(
        (blockTotal, block) => blockTotal + (block.trendRefs?.length ?? 0),
        0,
      ),
    0,
  );
}

export function getDailyBriefJsonExportPayload(
  value: string | null,
): DailyBriefJsonExportPayload {
  return normalizePayload(value);
}

export function buildDailyBriefJsonExport(
  brief: DailyBriefResponse,
  payload: DailyBriefJsonExportPayload = "report-document",
  templateId: ReportTemplateId = "executive",
): DailyBriefJsonExportEnvelope {
  const template = getReportTemplate(templateId);
  const document = buildTemplateReportDocument(brief.reportDocument, template.id);
  const researchMemoQa = buildResearchMemoExportQa(document, template.id);
  const includesFullBrief = payload === "full-brief";
  const templatedBrief: DailyBriefResponse = {
    ...brief,
    reportDocument: document,
  };

  return {
    ok: true,
    schemaVersion: "daily-brief-json-export-v2",
    exportType: "daily_intelligence_brief_json",
    payload,
    template: {
      id: template.id,
      label: template.label,
      appliedToReportDocument: true,
    },
    window: brief.window,
    generatedAt: new Date().toISOString(),
    source: {
      route: "/api/daily-brief/export/json",
      documentSchemaVersion: document.schemaVersion,
      documentType: document.documentType,
    },
    integrity: {
      ...document.integrity,
      includesFullBrief,
      exportedSectionCount: document.sections.length,
      exportedBlockCount: countBlocks(document),
      exportedTrendReferenceCount: countTrendReferences(document),
      researchMemoQaStatus: researchMemoQa.status,
      researchMemoQaScore: researchMemoQa.score,
    },
    data: includesFullBrief ? templatedBrief : document,
  };
}

export function serializeDailyBriefJsonExport(
  envelope: DailyBriefJsonExportEnvelope,
) {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function buildDailyBriefJsonFilename(
  document: DailyBriefReportDocument,
  payload: DailyBriefJsonExportPayload = "report-document",
  templateId: ReportTemplateId = "executive",
) {
  const windowPart = safeFilenamePart(document.window);
  const payloadPart = safeFilenamePart(payload);
  const templatePart = safeFilenamePart(templateId);
  const generatedPart = datePart(document.generatedAt);

  return `daily-brief-${templatePart}-${windowPart}-${payloadPart}-${generatedPart}.json`;
}
