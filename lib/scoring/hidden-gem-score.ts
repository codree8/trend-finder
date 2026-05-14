export type HiddenGemInput = {
  growth: number;
  mainstreamSaturation: number;
  creatorGap: number;
};

export function calculateHiddenGemScore(input: HiddenGemInput) {
  const score = input.growth * 0.45 + input.creatorGap * 0.4 - input.mainstreamSaturation * 0.25;
  return Math.max(0, Math.min(100, Math.round(score)));
}
