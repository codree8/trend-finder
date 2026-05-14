import type { SourceConnector } from "@/lib/sources/types";

export const rssConnector: SourceConnector = {
  name: "RSS",
  async scan() {
    // Phase 2: parse configured RSS feeds and normalize posts into SourceSignal records.
    return [];
  },
};
