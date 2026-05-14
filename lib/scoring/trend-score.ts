export type TrendScoreInput = {
  velocity: number;
  sourceDiversity: number;
  engagementQuality: number;
  novelty: number;
};

export function calculateTrendScore(input: TrendScoreInput) {
  return Math.round(
    input.velocity * 0.35 +
      input.sourceDiversity * 0.25 +
      input.engagementQuality * 0.25 +
      input.novelty * 0.15,
  );
}
