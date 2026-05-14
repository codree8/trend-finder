import type { SourceConnector } from "@/lib/sources/types";

export const hackerNewsConnector: SourceConnector = {
  name: "Hacker News",
  async scan() {
    // Phase 2: query Algolia HN API by AI-related terms and recent timestamps.
    return [];
  },
};
