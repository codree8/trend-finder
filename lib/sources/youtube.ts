import type { SourceConnector } from "@/lib/sources/types";

export const youtubeConnector: SourceConnector = {
  name: "YouTube",
  async scan() {
    // Phase 3: use keyword/channel scans carefully because search.list has quota cost.
    return [];
  },
};
