import { youtubeKeywords } from "@/lib/config/youtube-keywords";
import { hasYouTubeApiKey } from "@/lib/scan/connector-readiness";
import type { SourceConnector, SourceSignal } from "@/lib/sources/types";
import { safeNumber, uniqueSignals } from "@/lib/sources/helpers";

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    description?: string;
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
  error?: {
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

type YouTubeVideoItem = {
  id: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  snippet?: {
    tags?: string[];
    categoryId?: string;
    channelId?: string;
  };
};

type YouTubeVideosResponse = {
  items?: YouTubeVideoItem[];
  error?: {
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const SEARCH_KEYWORD_LIMIT = 8;
const RESULTS_PER_KEYWORD = 5;

function buildKeywordList(keywords: string[]) {
  const seen = new Set<string>();
  const merged = [...keywords, ...youtubeKeywords]
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword) => {
      const key = keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return merged.slice(0, SEARCH_KEYWORD_LIMIT);
}

function parseYouTubeError(
  payload: YouTubeSearchResponse | YouTubeVideosResponse,
) {
  const reason = payload.error?.errors?.[0]?.reason;
  const message = payload.error?.message ?? payload.error?.errors?.[0]?.message;
  return (
    [reason, message].filter(Boolean).join(": ") || "Unknown YouTube API error"
  );
}

function videoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function weightedEngagement(stats: YouTubeVideoItem["statistics"]) {
  const views = safeNumber(stats?.viewCount);
  const likes = safeNumber(stats?.likeCount);
  const comments = safeNumber(stats?.commentCount);

  return Math.round(Math.min(5000, views / 200 + likes / 20 + comments * 8));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: 0 } });
  const payload = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(parseYouTubeError(payload as YouTubeSearchResponse));
  }

  return payload;
}

async function searchVideos(args: {
  apiKey: string;
  keyword: string;
  since: Date;
}) {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    order: "date",
    q: args.keyword,
    maxResults: String(RESULTS_PER_KEYWORD),
    publishedAfter: args.since.toISOString(),
    relevanceLanguage: "en",
    safeSearch: "none",
    key: args.apiKey,
  });

  const payload = await fetchJson<YouTubeSearchResponse>(
    `${YOUTUBE_API_BASE}/search?${params.toString()}`,
  );

  return payload.items ?? [];
}

async function fetchVideoStats(apiKey: string, videoIds: string[]) {
  if (videoIds.length === 0) return new Map<string, YouTubeVideoItem>();

  const params = new URLSearchParams({
    part: "statistics,snippet",
    id: videoIds.join(","),
    key: apiKey,
  });

  const payload = await fetchJson<YouTubeVideosResponse>(
    `${YOUTUBE_API_BASE}/videos?${params.toString()}`,
  );

  return new Map((payload.items ?? []).map((item) => [item.id, item]));
}

export const youtubeConnector: SourceConnector = {
  name: "YouTube",
  async scan({ keywords, since, limitPerSource = 12 }) {
    if (!hasYouTubeApiKey()) return [];

    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    if (!apiKey) return [];

    const searchItems: Array<YouTubeSearchItem & { keyword: string }> = [];

    for (const keyword of buildKeywordList(keywords)) {
      const items = await searchVideos({ apiKey, keyword, since });
      searchItems.push(...items.map((item) => ({ ...item, keyword })));
    }

    const videoIds = Array.from(
      new Set(
        searchItems
          .map((item) => item.id?.videoId)
          .filter((videoId): videoId is string => Boolean(videoId)),
      ),
    );
    const statsById = await fetchVideoStats(apiKey, videoIds.slice(0, 50));
    const signals: SourceSignal[] = [];

    for (const item of searchItems) {
      const videoId = item.id?.videoId;
      const title = item.snippet?.title;
      const publishedAt = item.snippet?.publishedAt;
      if (!videoId || !title) continue;
      if (publishedAt && new Date(publishedAt) < since) continue;

      const stats = statsById.get(videoId);
      signals.push({
        source: "YouTube",
        externalId: videoId,
        title,
        url: videoUrl(videoId),
        author: item.snippet?.channelTitle,
        publishedAt,
        engagement: weightedEngagement(stats?.statistics),
        rawPayload: {
          keyword: item.keyword,
          channel: item.snippet?.channelTitle,
          description: item.snippet?.description,
          views: safeNumber(stats?.statistics?.viewCount),
          likes: safeNumber(stats?.statistics?.likeCount),
          comments: safeNumber(stats?.statistics?.commentCount),
          tags: stats?.snippet?.tags ?? [],
          channelId: stats?.snippet?.channelId,
          quotaModel: "search.list + videos.list",
        },
      });
    }

    return uniqueSignals(signals)
      .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
      .slice(0, limitPerSource);
  },
};
