import type { SourceConnector } from "@/lib/sources/types";

export const redditConnector: SourceConnector = {
  name: "Reddit",
  async scan() {
    // Phase 3: use Reddit OAuth and subreddit presets. Do not scrape aggressively.
    return [];
  },
};
