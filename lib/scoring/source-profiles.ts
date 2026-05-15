import { weightedAverage } from "@/lib/scoring/score-utils";

export type SourceProfile = {
  credibility: number;
  earlySignal: number;
  saturation: number;
  engagementSoftCap: number;
};

const fallbackProfile: SourceProfile = {
  credibility: 68,
  earlySignal: 62,
  saturation: 54,
  engagementSoftCap: 120,
};

const sourceProfiles: Record<string, SourceProfile> = {
  github: {
    credibility: 88,
    earlySignal: 92,
    saturation: 32,
    engagementSoftCap: 900,
  },
  hackernews: {
    credibility: 82,
    earlySignal: 74,
    saturation: 56,
    engagementSoftCap: 450,
  },
  "hacker-news": {
    credibility: 82,
    earlySignal: 74,
    saturation: 56,
    engagementSoftCap: 450,
  },
  rss: {
    credibility: 76,
    earlySignal: 66,
    saturation: 60,
    engagementSoftCap: 180,
  },
  blog: {
    credibility: 76,
    earlySignal: 66,
    saturation: 60,
    engagementSoftCap: 180,
  },
  reddit: {
    credibility: 66,
    earlySignal: 76,
    saturation: 64,
    engagementSoftCap: 700,
  },
  youtube: {
    credibility: 64,
    earlySignal: 56,
    saturation: 78,
    engagementSoftCap: 5000,
  },
  arxiv: {
    credibility: 86,
    earlySignal: 84,
    saturation: 42,
    engagementSoftCap: 160,
  },
};

function normalizeSourceName(source: string) {
  return source
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

export function getSourceProfile(source: string): SourceProfile {
  const normalized = normalizeSourceName(source);

  if (sourceProfiles[normalized]) return sourceProfiles[normalized];
  if (normalized.includes("github")) return sourceProfiles.github;
  if (normalized.includes("hacker")) return sourceProfiles.hackernews;
  if (normalized.includes("rss") || normalized.includes("blog")) {
    return sourceProfiles.rss;
  }
  if (normalized.includes("reddit")) return sourceProfiles.reddit;
  if (normalized.includes("youtube")) return sourceProfiles.youtube;
  if (normalized.includes("arxiv")) return sourceProfiles.arxiv;

  return fallbackProfile;
}

export function averageSourceProfile(
  sources: Array<{ source: string; weight: number }>,
): SourceProfile {
  if (sources.length === 0) return fallbackProfile;

  return {
    credibility: weightedAverage(
      sources.map((item) => ({
        value: getSourceProfile(item.source).credibility,
        weight: item.weight,
      })),
      fallbackProfile.credibility,
    ),
    earlySignal: weightedAverage(
      sources.map((item) => ({
        value: getSourceProfile(item.source).earlySignal,
        weight: item.weight,
      })),
      fallbackProfile.earlySignal,
    ),
    saturation: weightedAverage(
      sources.map((item) => ({
        value: getSourceProfile(item.source).saturation,
        weight: item.weight,
      })),
      fallbackProfile.saturation,
    ),
    engagementSoftCap: weightedAverage(
      sources.map((item) => ({
        value: getSourceProfile(item.source).engagementSoftCap,
        weight: item.weight,
      })),
      fallbackProfile.engagementSoftCap,
    ),
  };
}
