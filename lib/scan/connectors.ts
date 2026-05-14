import { githubConnector } from "@/lib/sources/github";
import { hackerNewsConnector } from "@/lib/sources/hackernews";
import { rssConnector } from "@/lib/sources/rss";
import type { SourceConnector } from "@/lib/sources/types";

export const activeConnectors: SourceConnector[] = [
  githubConnector,
  hackerNewsConnector,
  rssConnector,
];

export const connectorNames = activeConnectors.map(
  (connector) => connector.name,
);
