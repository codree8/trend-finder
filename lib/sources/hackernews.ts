import type { SourceConnector, SourceSignal } from "@/lib/sources/types";
import { safeNumber, uniqueSignals } from "@/lib/sources/helpers";

type HackerNewsHit = {
  objectID: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  author?: string;
  created_at?: string;
  points?: number;
  num_comments?: number;
};

type HackerNewsResponse = {
  hits?: HackerNewsHit[];
};

export const hackerNewsConnector: SourceConnector = {
  name: "Hacker News",
  async scan({ keywords, since, limitPerSource = 15 }) {
    const signals: SourceSignal[] = [];
    const numericSince = Math.floor(since.getTime() / 1000);

    for (const keyword of keywords.slice(0, 8)) {
      const params = new URLSearchParams({
        query: keyword,
        tags: "story",
        numericFilters: `created_at_i>${numericSince}`,
        hitsPerPage: "10",
      });

      const response = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?${params.toString()}`,
        {
          next: { revalidate: 0 },
        },
      );

      if (!response.ok) continue;

      const data = (await response.json()) as HackerNewsResponse;
      for (const hit of data.hits ?? []) {
        const title = hit.title ?? hit.story_title;
        if (!title) continue;

        signals.push({
          source: "Hacker News",
          externalId: hit.objectID,
          title,
          url:
            hit.url ??
            hit.story_url ??
            `https://news.ycombinator.com/item?id=${hit.objectID}`,
          author: hit.author,
          publishedAt: hit.created_at,
          engagement: safeNumber(hit.points) + safeNumber(hit.num_comments) * 3,
          rawPayload: {
            keyword,
            points: hit.points ?? 0,
            comments: hit.num_comments ?? 0,
          },
        });
      }
    }

    return uniqueSignals(signals)
      .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
      .slice(0, limitPerSource);
  },
};
