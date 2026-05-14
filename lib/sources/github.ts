import type { SourceConnector } from "@/lib/sources/types";

export const githubConnector: SourceConnector = {
  name: "GitHub",
  async scan() {
    // Phase 2: query GitHub Search API and calculate stars velocity from stored snapshots.
    return [];
  },
};
