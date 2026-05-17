import { githubConnector } from "@/lib/sources/github";
import { hackerNewsConnector } from "@/lib/sources/hackernews";
import { rssConnector } from "@/lib/sources/rss";
import { youtubeConnector } from "@/lib/sources/youtube";
import { shouldUseYouTubeConnector } from "@/lib/scan/connector-readiness";
import type { SourceConnector } from "@/lib/sources/types";

export function getActiveConnectors(): SourceConnector[] {
  return [
    githubConnector,
    hackerNewsConnector,
    rssConnector,
    ...(shouldUseYouTubeConnector() ? [youtubeConnector] : []),
  ];
}

export const activeConnectors = getActiveConnectors();

export const connectorNames = activeConnectors.map(
  (connector) => connector.name,
);
