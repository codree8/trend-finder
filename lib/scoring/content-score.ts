import { clampScore, confidenceDampener } from "@/lib/scoring/score-utils";

export type ContentScoreInput = {
  usefulness: number;
  curiosity: number;
  lowCompetition: number;
  signalClarity?: number;
  engagementQuality?: number;
  sampleConfidence?: number;
};

export function calculateContentScore(input: ContentScoreInput) {
  const rawScore =
    input.usefulness * 0.28 +
    input.curiosity * 0.22 +
    input.lowCompetition * 0.24 +
    (input.signalClarity ?? 70) * 0.16 +
    (input.engagementQuality ?? 60) * 0.1;

  return confidenceDampener(
    clampScore(rawScore),
    input.sampleConfidence ?? 100,
    0.7,
  );
}
