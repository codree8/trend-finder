import type { SourceConnector, SourceSignal } from "@/lib/sources/types";
import { uniqueSignals } from "@/lib/sources/helpers";

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  created_at: string;
  owner?: { login?: string };
  topics?: string[];
};

type GitHubSearchResponse = {
  items?: GitHubRepository[];
};

function buildQuery(keyword: string, since: Date): string {
  const isoDate = since.toISOString().slice(0, 10);
  return `${keyword} in:name,description,readme topic:ai pushed:>=${isoDate}`;
}

export const githubConnector: SourceConnector = {
  name: "GitHub",
  async scan({ keywords, since, limitPerSource = 12 }) {
    const token = process.env.GITHUB_TOKEN;
    const signals: SourceSignal[] = [];

    for (const keyword of keywords.slice(0, 6)) {
      const params = new URLSearchParams({
        q: buildQuery(keyword, since),
        sort: "stars",
        order: "desc",
        per_page: "8",
      });

      const response = await fetch(
        `https://api.github.com/search/repositories?${params.toString()}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          next: { revalidate: 0 },
        },
      );

      if (!response.ok) continue;

      const data = (await response.json()) as GitHubSearchResponse;
      for (const repo of data.items ?? []) {
        signals.push({
          source: "GitHub",
          externalId: String(repo.id),
          title: repo.full_name,
          url: repo.html_url,
          author: repo.owner?.login,
          publishedAt: repo.created_at,
          engagement:
            repo.stargazers_count +
            repo.forks_count * 2 +
            repo.open_issues_count,
          rawPayload: {
            keyword,
            description: repo.description,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            issues: repo.open_issues_count,
            pushedAt: repo.pushed_at,
            topics: repo.topics ?? [],
          },
        });
      }
    }

    return uniqueSignals(signals)
      .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
      .slice(0, limitPerSource);
  },
};
