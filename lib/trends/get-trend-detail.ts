import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { topicMentions, topics, trendSnapshots } from "@/lib/db/schema";
import type {
  DashboardTopSignal,
  DashboardTrend,
  DashboardWindow,
  RelatedTrend,
  TrendDetailResponse,
  TrendDetailSignal,
  TrendDetailSnapshot,
  TrendStatus,
} from "@/lib/trends/types";
import { normalizeDashboardWindow } from "@/lib/trends/get-dashboard-trends";
import { buildTrendEvidenceLayer } from "@/lib/trends/evidence-layer";

const categoryLabels: Record<string, string> = {
  agents: "Agents",
  coding: "Coding",
  video: "Video",
  image: "Image",
  audio: "Audio",
  "open-source": "Open Source",
  "local-llm": "Local LLM",
  automation: "Automation",
  research: "Research",
  business: "Business",
  education: "Education",
  security: "Security",
  robotics: "Robotics",
  marketing: "Marketing",
  "general-ai": "General AI",
};

type TopicRow = {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SnapshotRow = {
  id: number;
  topicId: number;
  window: string;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  velocityScore: number;
  saturationScore: number;
  sourceDiversityScore: number;
  mentionCount: number;
  sourceCount: number;
  totalEngagement: number;
  topSignals: unknown;
  createdAt: Date;
};

type MentionRow = {
  topicId: number;
  topicSlug: string;
  source: string;
  externalId: string;
  title: string;
  url: string;
  publishedAt: Date | null;
  engagement: number | null;
  weight: number;
  qualityScore: number | null;
  createdAt: Date;
};

type RelatedJoinRow = {
  topicId: number;
  slug: string;
  name: string;
  category: string;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  createdAt: Date;
};

function windowToDays(window: DashboardWindow) {
  if (window === "24h") return 1;
  if (window === "7d") return 7;
  return 30;
}

function getCutoffDate(window: DashboardWindow) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowToDays(window));
  return cutoff;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatCategory(category: string) {
  return (
    categoryLabels[category] ??
    category
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function formatSource(source: string) {
  const normalized = source.trim();
  if (normalized.toLowerCase() === "hacker news") return "Hacker News";
  if (normalized.toLowerCase() === "hn") return "HN";
  if (normalized.toLowerCase() === "rss") return "RSS";
  if (normalized.toLowerCase() === "github") return "GitHub";
  return normalized;
}

function getTrendStatus(snapshot: SnapshotRow): TrendStatus {
  if (snapshot.hiddenGemScore >= 75 && snapshot.saturationScore <= 48) {
    return "Hidden Gem";
  }
  if (snapshot.saturationScore >= 72 && snapshot.hiddenGemScore < 65) {
    return "Mainstream";
  }
  if (snapshot.velocityScore >= 74 && snapshot.sourceDiversityScore <= 35) {
    return "Volatile";
  }
  if (snapshot.trendScore >= 84) return "High Signal";
  return "Rising";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseTopSignals(value: unknown): DashboardTopSignal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = asRecord(item);
      const title = typeof record.title === "string" ? record.title : null;
      const source = typeof record.source === "string" ? record.source : null;
      const url = typeof record.url === "string" ? record.url : null;
      const engagement =
        typeof record.engagement === "number" &&
        Number.isFinite(record.engagement)
          ? record.engagement
          : 0;

      if (!title || !source || !url) return null;

      return {
        title,
        source: formatSource(source),
        url,
        engagement,
      } satisfies DashboardTopSignal;
    })
    .filter((item): item is DashboardTopSignal => item !== null)
    .slice(0, 8);
}

function latestSnapshotByWindow(rows: SnapshotRow[]) {
  const latest = new Map<string, SnapshotRow>();

  for (const row of rows) {
    const existing = latest.get(row.window);
    if (!existing || row.createdAt > existing.createdAt) {
      latest.set(row.window, row);
    }
  }

  return latest;
}

function buildTrendSummary(topic: TopicRow, snapshot: SnapshotRow) {
  if (topic.description) return topic.description;

  return `A ${formatCategory(topic.category).toLowerCase()} topic with ${snapshot.mentionCount} recent mentions, ${snapshot.sourceCount} active sources and ${snapshot.trendScore}/100 trend strength.`;
}

function buildWhyNow(snapshot: SnapshotRow, sources: string[]) {
  const sourceText =
    sources.length > 0 ? sources.slice(0, 4).join(", ") : "tracked sources";

  return `${snapshot.mentionCount} mentions across ${sourceText}, ${snapshot.totalEngagement} total engagement, ${snapshot.velocityScore}/100 velocity and ${snapshot.sourceDiversityScore}/100 source diversity.`;
}

function buildContentHook(topic: TopicRow, snapshot: SnapshotRow) {
  if (snapshot.hiddenGemScore >= 75) {
    return `${topic.name} looks early: strong hidden-gem score, manageable saturation and enough signal to justify a deeper breakdown.`;
  }

  if (snapshot.contentScore >= 82) {
    return `${topic.name} has a strong creator angle before the topic becomes generic AI commentary.`;
  }

  return `${topic.name}: the signal is visible, but the winning angle still needs sharper positioning.`;
}

function buildDashboardTrend(
  topic: TopicRow,
  snapshot: SnapshotRow,
  mentions: MentionRow[],
): DashboardTrend {
  const mentionSources = mentions.map((mention) =>
    formatSource(mention.source),
  );
  const fallbackSignals = parseTopSignals(snapshot.topSignals);
  const sources = Array.from(
    new Set([
      ...mentionSources,
      ...fallbackSignals.map((signal) => signal.source),
    ]),
  ).slice(0, 8);
  const topSignals = mentions.length
    ? mentions.slice(0, 5).map((mention) => ({
        title: mention.title,
        source: formatSource(mention.source),
        url: mention.url,
        engagement: mention.engagement ?? 0,
      }))
    : fallbackSignals.slice(0, 5);

  return {
    id: topic.slug,
    topicId: topic.id,
    slug: topic.slug,
    topic: topic.name,
    category: formatCategory(topic.category),
    status: getTrendStatus(snapshot),
    summary: buildTrendSummary(topic, snapshot),
    trendScore: clampScore(snapshot.trendScore),
    hiddenGemScore: clampScore(snapshot.hiddenGemScore),
    contentScore: clampScore(snapshot.contentScore),
    velocity: clampScore(snapshot.velocityScore),
    saturation: clampScore(snapshot.saturationScore),
    creatorGap: clampScore(100 - snapshot.saturationScore),
    sourceDiversity: clampScore(snapshot.sourceDiversityScore),
    mentionCount: snapshot.mentionCount,
    sourceCount: snapshot.sourceCount,
    totalEngagement: snapshot.totalEngagement,
    sources,
    whyNow: buildWhyNow(snapshot, sources),
    contentHook: buildContentHook(topic, snapshot),
    topSignals,
    lastSeenAt: snapshot.createdAt.toISOString(),
  };
}

function buildDetailSignals(
  mentions: MentionRow[],
  fallbackSignals: DashboardTopSignal[],
): TrendDetailSignal[] {
  if (mentions.length > 0) {
    return mentions.slice(0, 18).map((mention) => ({
      title: mention.title,
      source: formatSource(mention.source),
      url: mention.url,
      engagement: mention.engagement ?? 0,
      externalId: mention.externalId,
      publishedAt: mention.publishedAt?.toISOString() ?? null,
      createdAt: mention.createdAt.toISOString(),
      weight: mention.weight,
      qualityScore: mention.qualityScore ?? undefined,
    }));
  }

  return fallbackSignals.slice(0, 12).map((signal) => ({
    ...signal,
    externalId: null,
    publishedAt: null,
    createdAt: null,
    weight: 1,
  }));
}

function buildSnapshotHistory(rows: SnapshotRow[]): TrendDetailSnapshot[] {
  return rows
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((snapshot) => ({
      window: normalizeDashboardWindow(snapshot.window),
      trendScore: clampScore(snapshot.trendScore),
      hiddenGemScore: clampScore(snapshot.hiddenGemScore),
      contentScore: clampScore(snapshot.contentScore),
      velocity: clampScore(snapshot.velocityScore),
      saturation: clampScore(snapshot.saturationScore),
      sourceDiversity: clampScore(snapshot.sourceDiversityScore),
      mentionCount: snapshot.mentionCount,
      sourceCount: snapshot.sourceCount,
      totalEngagement: snapshot.totalEngagement,
      createdAt: snapshot.createdAt.toISOString(),
    }));
}

function latestRelatedRows(rows: RelatedJoinRow[]) {
  const seen = new Set<number>();
  const latest: RelatedJoinRow[] = [];

  for (const row of rows) {
    if (seen.has(row.topicId)) continue;
    seen.add(row.topicId);
    latest.push(row);
  }

  return latest;
}

function buildRelatedTopics(rows: RelatedJoinRow[]): RelatedTrend[] {
  return latestRelatedRows(rows)
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 6)
    .map((row) => ({
      topicId: row.topicId,
      slug: row.slug,
      topic: row.name,
      category: formatCategory(row.category),
      trendScore: clampScore(row.trendScore),
      hiddenGemScore: clampScore(row.hiddenGemScore),
      contentScore: clampScore(row.contentScore),
    }));
}

function buildMovement(window: DashboardWindow, snapshotRows: SnapshotRow[]) {
  const latestByWindow = latestSnapshotByWindow(snapshotRows);
  const current = latestByWindow.get(window) ?? snapshotRows[0] ?? null;
  const day = latestByWindow.get("24h");
  const week = latestByWindow.get("7d");
  const month = latestByWindow.get("30d");

  return {
    currentWindow: window,
    currentTrendScore: current ? clampScore(current.trendScore) : 0,
    dayTrendScore: day ? clampScore(day.trendScore) : null,
    weekTrendScore: week ? clampScore(week.trendScore) : null,
    monthTrendScore: month ? clampScore(month.trendScore) : null,
    dayVsWeek:
      day && week
        ? clampScore(day.trendScore) - clampScore(week.trendScore)
        : null,
    weekVsMonth:
      week && month
        ? clampScore(week.trendScore) - clampScore(month.trendScore)
        : null,
  };
}

function buildSuggestedAngles(topic: TopicRow, snapshot: SnapshotRow) {
  const topicName = topic.name;
  const hiddenGemAngle =
    snapshot.hiddenGemScore >= 72
      ? `The early signal behind ${topicName}, before it turns into mainstream AI noise`
      : `What ${topicName} says about the next practical AI workflow shift`;

  return [
    hiddenGemAngle,
    `${topicName}: what builders should test this week, not next quarter`,
    `Why ${topicName.toLowerCase()} is getting signal across technical and creator sources`,
    `A practical guide to ${topicName.toLowerCase()} for teams that do not want another vague AI trend`,
  ];
}

function buildIntelligenceCopy(topic: TopicRow, snapshot: SnapshotRow) {
  const category = formatCategory(topic.category).toLowerCase();

  return {
    overview: buildTrendSummary(topic, snapshot),
    whyTrending: buildWhyNow(snapshot, []),
    hiddenGemReasoning:
      snapshot.hiddenGemScore >= 72
        ? `${topic.name} has a strong hidden-gem profile because the hidden-gem score is ${snapshot.hiddenGemScore}/100 while saturation is ${snapshot.saturationScore}/100. That means there is signal without the topic already being completely cooked.`
        : `${topic.name} is not a pure hidden gem yet. The current hidden-gem score is ${snapshot.hiddenGemScore}/100, so it may be more useful as a monitoring candidate than a lead story.`,
    contentOpportunity:
      snapshot.contentScore >= 78
        ? `Content score is ${snapshot.contentScore}/100, which makes this usable for an explainer, comparison, teardown or founder-facing workflow piece in the ${category} lane.`
        : `Content score is ${snapshot.contentScore}/100. The topic needs a sharper hook before it becomes a strong creator opportunity.`,
    saturationRead:
      snapshot.saturationScore <= 45
        ? `Saturation is still low at ${snapshot.saturationScore}/100. That is exactly the zone where early positioning matters.`
        : snapshot.saturationScore >= 72
          ? `Saturation is already high at ${snapshot.saturationScore}/100. Treat this as a validation signal, not a clean hidden-gem opening.`
          : `Saturation is moderate at ${snapshot.saturationScore}/100. There is still room, but generic content will drown fast.`,
  };
}

export async function getTrendDetail(
  slug: string,
  requestedWindow: DashboardWindow = "7d",
): Promise<TrendDetailResponse> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const normalizedSlug = decodeURIComponent(slug).trim();
  const window = normalizeDashboardWindow(requestedWindow);
  const cutoff = getCutoffDate(window);
  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - 30);

  const [topic] = await db
    .select({
      id: topics.id,
      slug: topics.slug,
      name: topics.name,
      category: topics.category,
      description: topics.description,
      createdAt: topics.createdAt,
      updatedAt: topics.updatedAt,
    })
    .from(topics)
    .where(eq(topics.slug, normalizedSlug))
    .limit(1);

  if (!topic) {
    throw new Error("Trend topic was not found.");
  }

  const [currentSnapshotRows, mentionRows, snapshotHistoryRows, relatedRows] =
    await Promise.all([
      db
        .select({
          id: trendSnapshots.id,
          topicId: trendSnapshots.topicId,
          window: trendSnapshots.window,
          trendScore: trendSnapshots.trendScore,
          hiddenGemScore: trendSnapshots.hiddenGemScore,
          contentScore: trendSnapshots.contentScore,
          velocityScore: trendSnapshots.velocityScore,
          saturationScore: trendSnapshots.saturationScore,
          sourceDiversityScore: trendSnapshots.sourceDiversityScore,
          mentionCount: trendSnapshots.mentionCount,
          sourceCount: trendSnapshots.sourceCount,
          totalEngagement: trendSnapshots.totalEngagement,
          topSignals: trendSnapshots.topSignals,
          createdAt: trendSnapshots.createdAt,
        })
        .from(trendSnapshots)
        .where(
          and(
            eq(trendSnapshots.topicId, topic.id),
            eq(trendSnapshots.window, window),
          ),
        )
        .orderBy(desc(trendSnapshots.createdAt))
        .limit(1),
      db
        .select({
          topicId: topicMentions.topicId,
          topicSlug: topicMentions.topicSlug,
          source: topicMentions.source,
          externalId: topicMentions.externalId,
          title: topicMentions.title,
          url: topicMentions.url,
          publishedAt: topicMentions.publishedAt,
          engagement: topicMentions.engagement,
          weight: topicMentions.weight,
          qualityScore: topicMentions.qualityScore,
          createdAt: topicMentions.createdAt,
        })
        .from(topicMentions)
        .where(
          and(
            eq(topicMentions.topicId, topic.id),
            gte(topicMentions.createdAt, cutoff),
          ),
        )
        .orderBy(
          sql`coalesce(${topicMentions.qualityScore}, 0) desc`,
          desc(topicMentions.engagement),
          desc(topicMentions.createdAt),
        )
        .limit(30),
      db
        .select({
          id: trendSnapshots.id,
          topicId: trendSnapshots.topicId,
          window: trendSnapshots.window,
          trendScore: trendSnapshots.trendScore,
          hiddenGemScore: trendSnapshots.hiddenGemScore,
          contentScore: trendSnapshots.contentScore,
          velocityScore: trendSnapshots.velocityScore,
          saturationScore: trendSnapshots.saturationScore,
          sourceDiversityScore: trendSnapshots.sourceDiversityScore,
          mentionCount: trendSnapshots.mentionCount,
          sourceCount: trendSnapshots.sourceCount,
          totalEngagement: trendSnapshots.totalEngagement,
          topSignals: trendSnapshots.topSignals,
          createdAt: trendSnapshots.createdAt,
        })
        .from(trendSnapshots)
        .where(
          and(
            eq(trendSnapshots.topicId, topic.id),
            gte(trendSnapshots.createdAt, historyCutoff),
          ),
        )
        .orderBy(desc(trendSnapshots.createdAt))
        .limit(120),
      db
        .select({
          topicId: topics.id,
          slug: topics.slug,
          name: topics.name,
          category: topics.category,
          trendScore: trendSnapshots.trendScore,
          hiddenGemScore: trendSnapshots.hiddenGemScore,
          contentScore: trendSnapshots.contentScore,
          createdAt: trendSnapshots.createdAt,
        })
        .from(trendSnapshots)
        .innerJoin(topics, eq(trendSnapshots.topicId, topics.id))
        .where(
          and(
            eq(topics.category, topic.category),
            ne(topics.id, topic.id),
            eq(trendSnapshots.window, window),
          ),
        )
        .orderBy(
          desc(trendSnapshots.createdAt),
          desc(trendSnapshots.trendScore),
        )
        .limit(80),
    ]);

  const currentSnapshot = currentSnapshotRows[0] ?? snapshotHistoryRows[0];

  if (!currentSnapshot) {
    throw new Error("Trend topic exists, but no trend snapshots were found.");
  }

  const fallbackSignals = parseTopSignals(currentSnapshot.topSignals);
  const trend = buildDashboardTrend(topic, currentSnapshot, mentionRows);
  const intelligence = buildIntelligenceCopy(topic, currentSnapshot);
  const detailSignals = buildDetailSignals(mentionRows, fallbackSignals);
  const snapshotHistory = buildSnapshotHistory(snapshotHistoryRows);
  const evidenceLayer = buildTrendEvidenceLayer({
    trend,
    window,
    signals: detailSignals,
    snapshots: snapshotHistory,
  });

  return {
    ok: true,
    window,
    generatedAt: new Date().toISOString(),
    trend,
    intelligence: {
      ...intelligence,
      suggestedAngles: buildSuggestedAngles(topic, currentSnapshot),
      evidence: evidenceLayer.evidence,
      signals: evidenceLayer.signals,
      relatedTopics: buildRelatedTopics(relatedRows),
      movement: buildMovement(window, snapshotHistoryRows),
      snapshots: snapshotHistory,
    },
  };
}
