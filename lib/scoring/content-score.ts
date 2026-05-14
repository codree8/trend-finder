export type ContentScoreInput = {
  usefulness: number;
  curiosity: number;
  lowCompetition: number;
};

export function calculateContentScore(input: ContentScoreInput) {
  return Math.round(input.usefulness * 0.4 + input.curiosity * 0.35 + input.lowCompetition * 0.25);
}
