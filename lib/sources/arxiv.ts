import { arxivCategories, arxivKeywords } from "@/lib/config/arxiv-keywords";
import type { SourceConnector, SourceSignal } from "@/lib/sources/types";
import { stripHtml, uniqueSignals } from "@/lib/sources/helpers";

const ARXIV_API_URL = "https://export.arxiv.org/api/query";
const SEARCH_KEYWORD_LIMIT = 12;
const MAX_RESULTS = 24;
const MIN_REQUEST_INTERVAL_MS = 3_100;

let lastArxivRequestAt = 0;

type ParsedArxivEntry = {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  categories: string[];
  primaryCategory?: string;
  published?: string;
  updated?: string;
  absUrl: string;
  pdfUrl?: string;
  matchedKeyword?: string;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForArxivRateLimit() {
  const elapsed = Date.now() - lastArxivRequestAt;
  if (elapsed > 0 && elapsed < MIN_REQUEST_INTERVAL_MS) {
    await wait(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastArxivRequestAt = Date.now();
}

function cleanKeyword(keyword: string) {
  return keyword
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}\s.+#/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildKeywordList(keywords: string[]) {
  const seen = new Set<string>();

  return [...keywords, ...arxivKeywords]
    .map(cleanKeyword)
    .filter((keyword) => keyword.length >= 3)
    .filter((keyword) => {
      const key = keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, SEARCH_KEYWORD_LIMIT);
}

function buildArxivQuery(keywords: string[]) {
  const keywordQuery = keywords
    .map((keyword) => `all:"${keyword.replace(/"/g, "")}"`)
    .join(" OR ");
  const categoryQuery = arxivCategories
    .map((category) => `cat:${category}`)
    .join(" OR ");

  return `(${keywordQuery}) AND (${categoryQuery})`;
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

function getTag(entry: string, tagName: string) {
  const match = entry.match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"),
  );
  return match ? stripHtml(decodeXml(match[1] ?? "")) : "";
}

function getAuthors(entry: string) {
  return Array.from(
    entry.matchAll(
      /<author>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi,
    ),
  )
    .map((match) => stripHtml(decodeXml(match[1] ?? "")))
    .filter(Boolean);
}

function getCategories(entry: string) {
  return Array.from(entry.matchAll(/<category[^>]*term="([^"]+)"[^>]*\/>/gi))
    .map((match) => decodeXml(match[1] ?? ""))
    .filter(Boolean);
}

function getPrimaryCategory(entry: string) {
  const match = entry.match(
    /<arxiv:primary_category[^>]*term="([^"]+)"[^>]*\/>/i,
  );
  return match ? decodeXml(match[1] ?? "") : undefined;
}

function getLink(entry: string, matcher: (attributes: string) => boolean) {
  for (const match of entry.matchAll(/<link\s+([^>]+?)\s*\/?\s*>/gi)) {
    const attributes = match[1] ?? "";
    if (!matcher(attributes)) continue;
    const href = attributes.match(/href="([^"]+)"/i)?.[1];
    if (href) return decodeXml(href);
  }

  return undefined;
}

function parseArxivId(idUrl: string) {
  return idUrl.replace(/^https?:\/\/arxiv\.org\/abs\//i, "").trim();
}

function parseArxivFeed(xml: string, keywords: string[]): ParsedArxivEntry[] {
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi));

  return entries
    .map((match) => {
      const entry = match[1] ?? "";
      const idUrl = getTag(entry, "id");
      const absUrl =
        getLink(entry, (attributes) => /rel="alternate"/i.test(attributes)) ??
        idUrl;
      const pdfUrl = getLink(
        entry,
        (attributes) =>
          /title="pdf"/i.test(attributes) ||
          /type="application\/pdf"/i.test(attributes),
      );
      const title = getTag(entry, "title");
      const summary = getTag(entry, "summary");
      const normalizedText = `${title} ${summary}`.toLowerCase();
      const matchedKeyword = keywords.find((keyword) =>
        normalizedText.includes(keyword.toLowerCase()),
      );

      return {
        id: parseArxivId(idUrl),
        title,
        summary,
        authors: getAuthors(entry),
        categories: getCategories(entry),
        primaryCategory: getPrimaryCategory(entry),
        published: getTag(entry, "published"),
        updated: getTag(entry, "updated"),
        absUrl,
        pdfUrl,
        matchedKeyword,
      } satisfies ParsedArxivEntry;
    })
    .filter((entry) => entry.id && entry.title && entry.absUrl);
}

function daysSince(value?: string) {
  if (!value) return 365;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 365;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86_400_000));
}

function researchSignalEngagement(entry: ParsedArxivEntry) {
  const freshness = Math.max(0, 90 - daysSince(entry.published) * 4);
  const authorWeight = Math.min(24, entry.authors.length * 3);
  const categoryWeight = Math.min(24, entry.categories.length * 4);
  const keywordWeight = entry.matchedKeyword ? 18 : 6;

  return Math.round(
    Math.min(
      180,
      24 + freshness + authorWeight + categoryWeight + keywordWeight,
    ),
  );
}

async function fetchArxivEntries(keywords: string[]) {
  const params = new URLSearchParams({
    search_query: buildArxivQuery(keywords),
    start: "0",
    max_results: String(MAX_RESULTS),
    sortBy: "submittedDate",
    sortOrder: "descending",
  });

  await waitForArxivRateLimit();

  const response = await fetch(`${ARXIV_API_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
      "User-Agent": "trend-finder/0.1 local-research-signal-scanner",
    },
    next: { revalidate: 0 },
  });

  const xml = await response.text();

  if (!response.ok) {
    throw new Error(
      `arXiv API returned ${response.status}: ${xml.slice(0, 180)}`,
    );
  }

  return parseArxivFeed(xml, keywords);
}

export const arxivConnector: SourceConnector = {
  name: "arXiv",
  async scan({ keywords, since, limitPerSource = 12 }) {
    const keywordList = buildKeywordList(keywords);
    if (keywordList.length === 0) return [];

    const entries = await fetchArxivEntries(keywordList);
    const signals: SourceSignal[] = entries
      .filter((entry) => {
        const publishedAt = entry.published ? new Date(entry.published) : null;
        return (
          !publishedAt ||
          Number.isNaN(publishedAt.getTime()) ||
          publishedAt >= since
        );
      })
      .map((entry) => ({
        source: "arXiv",
        externalId: entry.id,
        title: entry.title,
        url: entry.absUrl,
        author: entry.authors.slice(0, 3).join(", ") || undefined,
        publishedAt: entry.published,
        engagement: researchSignalEngagement(entry),
        rawPayload: {
          matchedKeyword: entry.matchedKeyword,
          abstract: entry.summary,
          authors: entry.authors,
          categories: entry.categories,
          primaryCategory: entry.primaryCategory,
          updatedAt: entry.updated,
          pdfUrl: entry.pdfUrl,
          signalType: "research-preprint",
          quotaModel:
            "public arXiv API, one request per scan with local in-process throttle",
        },
      }));

    return uniqueSignals(signals)
      .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
      .slice(0, limitPerSource);
  },
};
