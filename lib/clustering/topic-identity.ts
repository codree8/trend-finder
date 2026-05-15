import type { SourceSignal } from "@/lib/sources/types";
import {
  fallbackTopicName,
  getSignalSearchText,
  inferCategory,
  slugifyTopic,
  type TopicCategory,
} from "@/lib/clustering/normalize-topic";

export type CanonicalTopicIdentity = {
  canonicalKey: string;
  slug: string;
  label: string;
  category: TopicCategory;
  aliases: string[];
  relatedLabels: string[];
  matchedAlias: string;
  confidence: number;
};

type CanonicalTopicRule = {
  key: string;
  label: string;
  category: TopicCategory;
  aliases: string[];
  relatedLabels?: string[];
  priority?: number;
};

const canonicalTopicRules: CanonicalTopicRule[] = [
  {
    key: "ai-coding-agents",
    label: "AI coding agents",
    category: "coding",
    aliases: [
      "ai coding agents",
      "coding agents",
      "coding agent",
      "code agents",
      "code agent",
      "developer agents",
      "developer agent",
      "dev agents",
      "dev agent",
      "autonomous developer agents",
      "autonomous coding agents",
      "agentic coding",
      "agentic coding tools",
      "software engineering agents",
      "swe agents",
      "repo agents",
      "pull request agents",
    ],
    relatedLabels: [
      "AI developer agents",
      "Autonomous dev agents",
      "Agentic coding tools",
      "Software engineering agents",
    ],
    priority: 100,
  },
  {
    key: "browser-ai-agents",
    label: "Browser AI agents",
    category: "agents",
    aliases: [
      "browser ai agents",
      "browser agents",
      "browser agent",
      "web agents",
      "web agent",
      "computer use",
      "computer-use agents",
      "operator",
      "ai operator",
    ],
    relatedLabels: [
      "Computer-use agents",
      "Web agents",
      "Operator-style agents",
    ],
    priority: 95,
  },
  {
    key: "ai-agents",
    label: "AI agents",
    category: "agents",
    aliases: [
      "ai agents",
      "ai agent",
      "agentic ai",
      "agentic workflows",
      "autonomous agents",
      "autonomous agent",
      "multi agent",
      "multi-agent",
      "agent framework",
      "agent frameworks",
      "llm agents",
      "llm agent",
    ],
    relatedLabels: ["Agentic AI", "Autonomous agents", "Multi-agent workflows"],
    priority: 80,
  },
  {
    key: "claude-code-workflows",
    label: "Claude Code workflows",
    category: "coding",
    aliases: [
      "claude code",
      "claude coding",
      "claude dev",
      "anthropic coding",
      "claude code workflows",
      "claude code workflow",
    ],
    relatedLabels: ["Claude coding", "Anthropic developer workflows"],
    priority: 88,
  },
  {
    key: "ai-coding-tools",
    label: "AI coding tools",
    category: "coding",
    aliases: [
      "ai coding",
      "ai coding tools",
      "coding assistant",
      "coding assistants",
      "code assistant",
      "code assistants",
      "copilot",
      "github copilot",
      "cursor",
      "devin",
      "vscode ai",
      "ide ai",
    ],
    relatedLabels: ["Coding assistants", "AI IDE tools", "Developer copilots"],
    priority: 70,
  },
  {
    key: "local-llms",
    label: "Local LLMs",
    category: "local-llm",
    aliases: [
      "local llm",
      "local llms",
      "ollama",
      "llama.cpp",
      "local model",
      "local models",
      "on-device llm",
      "on device llm",
      "local inference",
      "edge llm",
    ],
    relatedLabels: ["On-device LLMs", "Local inference", "Ollama workflows"],
    priority: 86,
  },
  {
    key: "open-source-ai",
    label: "Open-source AI",
    category: "open-source",
    aliases: [
      "open source ai",
      "open-source ai",
      "open source model",
      "open source models",
      "open weights",
      "open-weight",
      "open weight model",
      "open-weight model",
    ],
    relatedLabels: ["Open-weight models", "Open-source models"],
    priority: 84,
  },
  {
    key: "ai-video-generation",
    label: "AI video generation",
    category: "video",
    aliases: [
      "ai video",
      "ai video generation",
      "text to video",
      "text-to-video",
      "video generation",
      "runway",
      "sora",
      "veo",
      "image to video",
      "image-to-video",
    ],
    relatedLabels: [
      "Text-to-video",
      "Image-to-video",
      "Video generation tools",
    ],
    priority: 82,
  },
  {
    key: "ai-image-generation",
    label: "AI image generation",
    category: "image",
    aliases: [
      "ai image",
      "ai image generation",
      "image generation",
      "stable diffusion",
      "flux",
      "comfyui",
      "midjourney",
      "text to image",
      "text-to-image",
    ],
    relatedLabels: ["Text-to-image", "Image generation workflows"],
    priority: 82,
  },
  {
    key: "ai-audio-tools",
    label: "AI audio tools",
    category: "audio",
    aliases: [
      "ai audio",
      "ai audio tools",
      "voice cloning",
      "text to speech",
      "text-to-speech",
      "tts",
      "speech generation",
      "music generation",
    ],
    relatedLabels: ["Voice cloning", "TTS", "Music generation"],
    priority: 78,
  },
  {
    key: "rag-systems",
    label: "RAG systems",
    category: "automation",
    aliases: [
      "rag",
      "rag systems",
      "retrieval augmented",
      "retrieval-augmented",
      "retrieval augmented generation",
      "vector search",
      "knowledge base",
      "knowledge bases",
    ],
    relatedLabels: [
      "Retrieval augmented generation",
      "Vector search",
      "Knowledge-base AI",
    ],
    priority: 80,
  },
  {
    key: "ai-automation-workflows",
    label: "AI automation workflows",
    category: "automation",
    aliases: [
      "ai automation",
      "ai automation workflows",
      "workflow automation",
      "zapier ai",
      "n8n ai",
      "make.com ai",
      "automation agents",
      "workflow agents",
    ],
    relatedLabels: ["Workflow automation", "AI workflow agents"],
    priority: 76,
  },
  {
    key: "ai-startup-ideas",
    label: "AI startup ideas",
    category: "business",
    aliases: [
      "ai startup",
      "ai startup ideas",
      "ai saas",
      "micro saas",
      "microsaas",
      "startup idea",
      "startup ideas",
      "b2b ai",
    ],
    relatedLabels: ["AI SaaS", "Micro SaaS", "B2B AI ideas"],
    priority: 68,
  },
  {
    key: "ai-in-education",
    label: "AI in education",
    category: "education",
    aliases: [
      "ai education",
      "ai in education",
      "students",
      "learning",
      "school",
      "tutor",
      "study assistant",
      "ai tutor",
    ],
    relatedLabels: ["AI tutors", "Study assistants", "Education AI"],
    priority: 66,
  },
  {
    key: "ai-security",
    label: "AI security",
    category: "security",
    aliases: [
      "ai security",
      "prompt injection",
      "jailbreak",
      "jailbreaking",
      "model safety",
      "red teaming",
      "red team",
      "ai risk",
      "llm security",
    ],
    relatedLabels: ["Prompt injection", "LLM security", "Model safety"],
    priority: 82,
  },
  {
    key: "ai-robotics",
    label: "AI robotics",
    category: "robotics",
    aliases: [
      "robotics",
      "ai robotics",
      "humanoid",
      "humanoids",
      "robot",
      "robots",
      "embodied ai",
      "physical ai",
    ],
    relatedLabels: ["Embodied AI", "Humanoid robots", "Physical AI"],
    priority: 76,
  },
  {
    key: "llm-research",
    label: "LLM research",
    category: "research",
    aliases: [
      "llm research",
      "ai research",
      "paper",
      "papers",
      "arxiv",
      "benchmark",
      "benchmarks",
      "evaluation",
      "eval",
      "reasoning model",
      "reasoning models",
    ],
    relatedLabels: ["Benchmarks", "AI papers", "Model evaluations"],
    priority: 64,
  },
];

const canonicalStopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "best",
  "big",
  "but",
  "by",
  "can",
  "for",
  "from",
  "guide",
  "how",
  "in",
  "into",
  "is",
  "it",
  "launch",
  "launched",
  "new",
  "of",
  "on",
  "or",
  "release",
  "released",
  "show",
  "shows",
  "that",
  "the",
  "this",
  "to",
  "tool",
  "tools",
  "using",
  "use",
  "what",
  "why",
  "with",
  "you",
  "your",
]);

const tokenAliases: Record<string, string> = {
  agentic: "agent",
  agents: "agent",
  autonomous: "agent",
  assistant: "assistant",
  assistants: "assistant",
  browser: "browser",
  browsers: "browser",
  code: "coding",
  coder: "coding",
  coders: "coding",
  coding: "coding",
  dev: "developer",
  developer: "developer",
  developers: "developer",
  generation: "generation",
  llms: "llm",
  models: "model",
  openweight: "open-weight",
  workflows: "workflow",
};

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/&/g, " and ")
    .replace(/[+]/g, " plus ")
    .replace(/[._/:-]+/g, " ")
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedPhrasePattern(phrase: string) {
  return normalizeForMatching(phrase)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
}

function findMatchedAlias(text: string, rule: CanonicalTopicRule) {
  const candidates = [rule.label, ...rule.aliases].sort(
    (a, b) => b.length - a.length,
  );

  return candidates.find((candidate) => {
    const pattern = normalizedPhrasePattern(candidate);
    if (!pattern) return false;
    return new RegExp(`(^|\\s)${pattern}(\\s|$)`, "i").test(text);
  });
}

function scoreRuleMatch(alias: string, rule: CanonicalTopicRule) {
  const wordCount = normalizeForMatching(alias)
    .split(" ")
    .filter(Boolean).length;
  return (rule.priority ?? 50) + wordCount * 5 + alias.length / 20;
}

function fallbackTokens(value: string) {
  return normalizeForMatching(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => tokenAliases[token] ?? token.replace(/s$/, ""))
    .filter((token) => token.length >= 3 && !canonicalStopWords.has(token));
}

function compactUnique(values: string[], max = 12) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= max) break;
  }

  return result;
}

function titleCaseToken(token: string) {
  if (token === "ai") return "AI";
  if (token === "llm") return "LLM";
  if (token === "rag") return "RAG";
  if (token === "api") return "API";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function fallbackIdentity(signal: SourceSignal): CanonicalTopicIdentity {
  const searchText = getSignalSearchText(signal);
  const tokens = compactUnique(fallbackTokens(searchText), 5);
  const focusedTokens = tokens.slice(0, 4);
  const fallbackName = fallbackTopicName(signal);
  const label = focusedTokens.length
    ? focusedTokens.map(titleCaseToken).join(" ")
    : fallbackName;
  const slug = slugifyTopic(
    focusedTokens.length ? focusedTokens.join(" ") : label,
  );

  return {
    canonicalKey: slug || "general-ai-signal",
    slug: slug || "general-ai-signal",
    label,
    category: inferCategory(searchText),
    aliases: compactUnique([fallbackName, label, signal.title], 8),
    relatedLabels: focusedTokens.slice(0, 5),
    matchedAlias: fallbackName,
    confidence: 48,
  };
}

export function normalizeTopicIdentityText(value: string) {
  return normalizeForMatching(value);
}

export function canonicalKeyFromTopicText(value: string) {
  const text = normalizeForMatching(value);
  const matched = canonicalTopicRules
    .map((rule) => {
      const alias = findMatchedAlias(text, rule);
      return alias ? { rule, alias, score: scoreRuleMatch(alias, rule) } : null;
    })
    .filter(
      (
        item,
      ): item is { rule: CanonicalTopicRule; alias: string; score: number } =>
        item !== null,
    )
    .sort((a, b) => b.score - a.score)[0];

  if (matched) return matched.rule.key;

  const tokens = compactUnique(fallbackTokens(text), 4);
  return (
    slugifyTopic(tokens.join(" ")) || slugifyTopic(value) || "general-ai-signal"
  );
}

export function getCanonicalTopicIdentity(
  signal: SourceSignal,
): CanonicalTopicIdentity {
  const text = normalizeForMatching(getSignalSearchText(signal));
  const matched = canonicalTopicRules
    .map((rule) => {
      const alias = findMatchedAlias(text, rule);
      return alias ? { rule, alias, score: scoreRuleMatch(alias, rule) } : null;
    })
    .filter(
      (
        item,
      ): item is { rule: CanonicalTopicRule; alias: string; score: number } =>
        item !== null,
    )
    .sort((a, b) => b.score - a.score)[0];

  if (!matched) return fallbackIdentity(signal);

  return {
    canonicalKey: matched.rule.key,
    slug: matched.rule.key,
    label: matched.rule.label,
    category: matched.rule.category,
    aliases: compactUnique([matched.rule.label, ...matched.rule.aliases], 14),
    relatedLabels: compactUnique(matched.rule.relatedLabels ?? [], 8),
    matchedAlias: matched.alias,
    confidence: Math.min(98, Math.round(matched.score)),
  };
}

export function mergeAliases(values: string[], max = 16) {
  return compactUnique(
    values
      .map((value) => value.replace(/[-_]+/g, " "))
      .filter((value) => value.trim().length > 0),
    max,
  );
}
