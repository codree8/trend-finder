import { clampScore, confidenceDampener } from "@/lib/scoring/score-utils";

export type HiddenGemInput = {
  growth: number;
  mainstreamSaturation: number;
  creatorGap: number;
  novelty?: number;
  sourceCredibility?: number;
  sampleConfidence?: number;
};

export function calculateHiddenGemScore(input: HiddenGemInput) {
  const rawScore =
    input.growth * 0.3 +
    input.creatorGap * 0.3 +
    (input.novelty ?? 65) * 0.2 +
    (input.sourceCredibility ?? 70) * 0.08 -
    input.mainstreamSaturation * 0.12;

  return confidenceDampener(
    clampScore(rawScore),
    input.sampleConfidence ?? 100,
    0.66,
  );
}
