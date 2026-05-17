import { rssFeeds } from "@/lib/config/rss-feeds";
import type { SourceConnector, SourceSignal } from "@/lib/sources/types";
import { stripHtml, uniqueSignals } from "@/lib/sources/helpers";

function extractTag(block: string, tag: string): string | undefined {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(pattern);
  return match?.[1] ? stripHtml(match[1]) : undefined;
}

function extractLink(block: string): string | undefined {
  const rssLink = extractTag(block, "link");
  if (rssLink?.startsWith("http")) return rssLink;

  const atomHref = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  return atomHref;
}

function extractItems(xml: string): string[] {
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return [...rssItems, ...atomEntries];
}

function isRelevant(title: string, keywords: string[]): boolean {
  const normalizedTitle = title.toLowerCase();
  return (
    keywords.some((keyword) =>
      normalizedTitle.includes(keyword.toLowerCase().replace("ai ", "")),
    ) || /\b(ai|llm|agent|model|openai|claude|gemini|rag)\b/i.test(title)
  );
}

export const rssConnector: SourceConnector = {
  name: "RSS",
  async scan({ keywords, since, limitPerSource = 15 }) {
    const signals: SourceSignal[] = [];

    for (const feed of rssFeeds) {
      try {
        const response = await fetch(feed.url, { next: { revalidate: 0 } });
        if (!response.ok) continue;

        const xml = await response.text();
        const items = extractItems(xml).slice(0, 20);

        for (const item of items) {
          const title = extractTag(item, "title");
          const url = extractLink(item);
          const publishedAt =
            extractTag(item, "pubDate") ??
            extractTag(item, "published") ??
            extractTag(item, "updated");
          const publishedDate = publishedAt ? new Date(publishedAt) : undefined;

          if (!title || !url) continue;
          if (publishedDate && publishedDate < since) continue;
          if (!isRelevant(title, keywords)) continue;

          signals.push({
            source: "RSS",
            externalId: `${feed.name}:${url}`,
            title,
            url,
            author: feed.name,
            publishedAt: publishedDate?.toISOString(),
            engagement: 1,
            rawPayload: {
              feed: feed.name,
              summary:
                extractTag(item, "description") ?? extractTag(item, "summary"),
            },
          });
        }
      } catch {
        continue;
      }
    }

    return uniqueSignals(signals).slice(0, limitPerSource);
  },
};
