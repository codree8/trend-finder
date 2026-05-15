export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function safeDivide(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function normalizeLog(value: number, softCap: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(softCap) || softCap <= 0) return 0;

  return clampScore((Math.log1p(value) / Math.log1p(softCap)) * 100);
}

export function diminishingReturns(value: number, softCap: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(softCap) || softCap <= 0) return 0;

  return clampScore((value / (value + softCap)) * 100);
}

export function weightedAverage(
  values: Array<{ value: number; weight: number }>,
  fallback = 0,
) {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return fallback;

  return (
    values.reduce((sum, item) => sum + item.value * item.weight, 0) /
    totalWeight
  );
}

export function confidenceDampener(
  score: number,
  confidence: number,
  floor = 0.62,
) {
  const boundedConfidence = clampScore(confidence) / 100;
  const multiplier = floor + (1 - floor) * boundedConfidence;

  return clampScore(score * multiplier);
}

export function exponentialDecay(ageDays: number, halfLifeDays: number) {
  if (!Number.isFinite(ageDays) || ageDays <= 0) return 1;
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) return 1;

  return Math.pow(0.5, ageDays / halfLifeDays);
}

export function shannonEffectiveCount(counts: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return 0;

  const entropy = counts.reduce((sum, count) => {
    if (count <= 0) return sum;
    const probability = count / total;
    return sum - probability * Math.log(probability);
  }, 0);

  return Math.exp(entropy);
}
