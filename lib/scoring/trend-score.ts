import { clampScore, confidenceDampener } from "@/lib/scoring/score-utils";

export type TrendScoreInput = {
  velocity: number;
  sourceDiversity: number;
  engagementQuality: number;
  novelty: number;
  sourceCredibility?: number;
  sampleConfidence?: number;
};

export function calculateTrendScore(input: TrendScoreInput) {
  const rawScore =
    input.velocity * 0.34 +
    input.sourceDiversity * 0.2 +
    input.engagementQuality * 0.2 +
    input.novelty * 0.14 +
    (input.sourceCredibility ?? 70) * 0.12;

  return confidenceDampener(
    clampScore(rawScore),
    input.sampleConfidence ?? 100,
    0.62,
  );
}
