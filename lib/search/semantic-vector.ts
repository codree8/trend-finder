import { createHash } from "node:crypto";

export const SEMANTIC_VECTOR_DIMENSIONS = 384;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
  "without",
  "why",
]);

const SEMANTIC_EXPANSIONS: Record<string, string[]> = {
  agent: ["agents", "automation", "workflow", "autonomous", "assistant"],
  agents: ["agent", "automation", "workflow", "autonomous", "assistant"],
  automation: ["agent", "workflow", "orchestration", "autonomous"],
  workflow: ["automation", "agent", "orchestration", "pipeline"],
  coding: ["developer", "programming", "code", "github", "repository"],
  code: ["coding", "developer", "programming", "github", "repository"],
  developer: ["coding", "code", "programming", "github"],
  github: ["repository", "open-source", "code", "developer"],
  repository: ["github", "open-source", "code"],
  open: ["open-source", "github", "repository"],
  opensource: ["open-source", "github", "repository"],
  "open-source": ["opensource", "github", "repository", "community"],
  local: ["offline", "on-device", "private", "llm", "open-weights"],
  offline: ["local", "on-device", "private"],
  llm: ["model", "language-model", "local", "open-weights"],
  model: ["llm", "language-model", "inference"],
  video: ["generation", "media", "creator", "editing"],
  image: ["generation", "visual", "design", "creator"],
  audio: ["voice", "music", "speech", "sound"],
  voice: ["audio", "speech", "assistant"],
  marketing: ["growth", "content", "creator", "campaign"],
  creator: ["content", "video", "marketing", "angle"],
  research: ["paper", "arxiv", "benchmark", "model"],
  arxiv: ["research", "paper", "benchmark"],
  security: ["privacy", "risk", "safety", "vulnerability"],
  privacy: ["security", "local", "risk"],
  business: ["startup", "market", "product", "revenue"],
  startup: ["business", "product", "market", "founder"],
  education: ["learning", "teaching", "students", "classroom"],
  robotics: ["robot", "embodied", "automation", "hardware"],
};

export function normalizeSemanticText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createSemanticEmbedding(value: string) {
  const vector = new Array<number>(SEMANTIC_VECTOR_DIMENSIONS).fill(0);
  const normalized = normalizeSemanticText(value);
  if (!normalized) return vector;

  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  for (const token of tokens) {
    addFeature(vector, `tok:${token}`, 1.45);
    addFeature(vector, `stem:${softStem(token)}`, 0.75);

    const expansions = SEMANTIC_EXPANSIONS[token] ?? [];
    for (const expansion of expansions) {
      addFeature(vector, `syn:${expansion}`, 0.72);
    }

    for (const ngram of characterNgrams(token)) {
      addFeature(vector, `chr:${ngram}`, 0.26);
    }
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    addFeature(vector, `bi:${tokens[index]} ${tokens[index + 1]}`, 1.12);
  }

  for (let index = 0; index < tokens.length - 2; index += 1) {
    addFeature(
      vector,
      `tri:${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`,
      0.86,
    );
  }

  return normalizeVector(vector);
}

export function toPgVectorLiteral(vector: number[]) {
  return `[${vector.map((value) => Number(value.toFixed(6))).join(",")}]`;
}

export function stableSemanticHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function addFeature(vector: number[], feature: string, weight: number) {
  const hash = createHash("sha256").update(feature).digest();
  const index = hash.readUInt32BE(0) % SEMANTIC_VECTOR_DIMENSIONS;
  const sign = hash[4] % 2 === 0 ? 1 : -1;
  vector[index] += weight * sign;
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(
    vector.reduce((total, value) => total + value * value, 0),
  );

  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

function softStem(token: string) {
  return token
    .replace(/ies$/g, "y")
    .replace(/ing$/g, "")
    .replace(/ers$/g, "er")
    .replace(/s$/g, "");
}

function characterNgrams(token: string) {
  const compact = token.replace(/[^a-z0-9]/g, "");
  if (compact.length < 4) return [];

  const grams: string[] = [];
  for (let index = 0; index <= compact.length - 4; index += 1) {
    grams.push(compact.slice(index, index + 4));
  }

  return grams.slice(0, 8);
}
