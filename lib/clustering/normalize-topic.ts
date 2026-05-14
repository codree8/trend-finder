import type { SourceSignal } from "@/lib/sources/types";

export type TopicCategory =
  | "agents"
  | "coding"
  | "video"
  | "image"
  | "audio"
  | "open-source"
  | "local-llm"
  | "automation"
  | "research"
  | "business"
  | "education"
  | "security"
  | "robotics"
  | "general-ai";

type TopicPhrase = {
  phrase: string;
  label: string;
  category: TopicCategory;
  aliases?: string[];
};

const topicPhrases: TopicPhrase[] = [
  {
    phrase: "browser agents",
    label: "Browser AI agents",
    category: "agents",
    aliases: ["browser agent", "computer use", "web agent", "operator"],
  },
  {
    phrase: "ai agents",
    label: "AI agents",
    category: "agents",
    aliases: ["agentic", "autonomous agents", "multi-agent", "agent framework"],
  },
  {
    phrase: "claude code",
    label: "Claude Code workflows",
    category: "coding",
    aliases: ["claude coding", "claude dev", "anthropic coding"],
  },
  {
    phrase: "ai coding",
    label: "AI coding tools",
    category: "coding",
    aliases: [
      "coding assistant",
      "code assistant",
      "copilot",
      "cursor",
      "devin",
    ],
  },
  {
    phrase: "local llm",
    label: "Local LLMs",
    category: "local-llm",
    aliases: [
      "ollama",
      "llama.cpp",
      "local model",
      "on-device llm",
      "local inference",
    ],
  },
  {
    phrase: "open source ai",
    label: "Open-source AI",
    category: "open-source",
    aliases: [
      "open-source ai",
      "open source model",
      "open weights",
      "open-weight",
    ],
  },
  {
    phrase: "ai video",
    label: "AI video generation",
    category: "video",
    aliases: ["text-to-video", "video generation", "runway", "sora", "veo"],
  },
  {
    phrase: "ai image",
    label: "AI image generation",
    category: "image",
    aliases: [
      "image generation",
      "stable diffusion",
      "flux",
      "comfyui",
      "midjourney",
    ],
  },
  {
    phrase: "ai audio",
    label: "AI audio tools",
    category: "audio",
    aliases: [
      "voice cloning",
      "text-to-speech",
      "tts",
      "speech generation",
      "music generation",
    ],
  },
  {
    phrase: "rag",
    label: "RAG systems",
    category: "automation",
    aliases: [
      "retrieval augmented",
      "retrieval-augmented",
      "vector search",
      "knowledge base",
    ],
  },
  {
    phrase: "ai automation",
    label: "AI automation workflows",
    category: "automation",
    aliases: ["workflow automation", "zapier ai", "n8n ai", "make.com ai"],
  },
  {
    phrase: "ai startup",
    label: "AI startup ideas",
    category: "business",
    aliases: ["ai saas", "micro saas", "startup idea", "b2b ai"],
  },
  {
    phrase: "ai education",
    label: "AI in education",
    category: "education",
    aliases: ["students", "learning", "school", "tutor", "study assistant"],
  },
  {
    phrase: "ai security",
    label: "AI security",
    category: "security",
    aliases: [
      "prompt injection",
      "jailbreak",
      "model safety",
      "red teaming",
      "ai risk",
    ],
  },
  {
    phrase: "robotics",
    label: "AI robotics",
    category: "robotics",
    aliases: ["humanoid", "robot", "embodied ai", "physical ai"],
  },
  {
    phrase: "llm research",
    label: "LLM research",
    category: "research",
    aliases: ["paper", "arxiv", "benchmark", "evaluation", "reasoning model"],
  },
];

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "into",
  "is",
  "it",
  "new",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
  "you",
  "your",
  "using",
  "use",
  "what",
  "why",
  "show",
  "shows",
  "tool",
  "tools",
  "ai",
]);

function getRawPayloadText(signal: SourceSignal): string {
  const payload = signal.rawPayload;
  if (!payload || typeof payload !== "object") return "";

  const record = payload as Record<string, unknown>;
  const fields = [
    record.keyword,
    record.description,
    record.summary,
    Array.isArray(record.topics) ? record.topics.join(" ") : undefined,
  ];

  return fields.filter(Boolean).join(" ");
}

export function getSignalSearchText(signal: SourceSignal) {
  return `${signal.title} ${getRawPayloadText(signal)}`
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9+#.\-/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseMatches(text: string, phrase: TopicPhrase) {
  const candidates = [phrase.phrase, ...(phrase.aliases ?? [])];
  return candidates.some((candidate) => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i").test(text);
  });
}

export function inferKnownTopic(signal: SourceSignal) {
  const text = getSignalSearchText(signal);
  return topicPhrases.find((topic) => phraseMatches(text, topic));
}

export function inferCategory(text: string): TopicCategory {
  if (/agent|agentic|operator|computer use|browser agent/.test(text))
    return "agents";
  if (/code|coding|developer|copilot|cursor|vscode|ide|github/.test(text))
    return "coding";
  if (/video|sora|runway|veo|text-to-video/.test(text)) return "video";
  if (/image|stable diffusion|flux|comfyui|midjourney/.test(text))
    return "image";
  if (/audio|voice|speech|tts|music/.test(text)) return "audio";
  if (/local|ollama|llama\.cpp|on-device/.test(text)) return "local-llm";
  if (/open source|open-source|open weight|open-weight|github/.test(text))
    return "open-source";
  if (/rag|automation|workflow|n8n|zapier|make\.com|vector/.test(text))
    return "automation";
  if (/paper|arxiv|benchmark|evaluation|research|reasoning/.test(text))
    return "research";
  if (/startup|saas|business|marketing|sales|b2b/.test(text)) return "business";
  if (/student|school|education|learning|tutor/.test(text)) return "education";
  if (/security|jailbreak|prompt injection|red team|safety/.test(text))
    return "security";
  if (/robot|robotics|humanoid|embodied/.test(text)) return "robotics";
  return "general-ai";
}

export function slugifyTopic(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export function extractTopicKeywords(signal: SourceSignal, max = 5) {
  const text = getSignalSearchText(signal);
  const tokens = text
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([token]) => token);
}

export function fallbackTopicName(signal: SourceSignal) {
  const known = inferKnownTopic(signal);
  if (known) return known.label;

  const keywords = extractTopicKeywords(signal, 4);
  if (keywords.length === 0) return "General AI signal";

  return keywords
    .map((keyword) => {
      if (keyword === "llm") return "LLM";
      if (keyword === "rag") return "RAG";
      if (keyword === "api") return "API";
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    })
    .join(" ");
}

export function describeTopic(category: TopicCategory, sources: string[]) {
  const sourceText =
    sources.length > 1
      ? `${sources.length} sources`
      : (sources[0] ?? "one source");

  const descriptions: Record<TopicCategory, string> = {
    agents: `Agent-related signal detected across ${sourceText}. Watch for practical workflow adoption, not only demos.`,
    coding: `Developer tooling signal detected across ${sourceText}. Good candidate for technical and creator content.`,
    video: `AI video signal detected across ${sourceText}. Useful when paired with examples and production workflows.`,
    image: `AI image signal detected across ${sourceText}. Track model/tool updates and workflow adoption.`,
    audio: `AI audio signal detected across ${sourceText}. Watch voice, music and speech workflow use cases.`,
    "open-source": `Open-source AI signal detected across ${sourceText}. Stars velocity and community adoption matter most here.`,
    "local-llm": `Local LLM signal detected across ${sourceText}. Good early indicator when developer communities react quickly.`,
    automation: `Automation signal detected across ${sourceText}. Strong content potential when there is a repeatable workflow.`,
    research: `Research-side signal detected across ${sourceText}. Treat as early evidence, not mainstream validation.`,
    business: `Startup/business AI signal detected across ${sourceText}. Check monetization and saturation before producing content.`,
    education: `Education AI signal detected across ${sourceText}. Useful if it has a clear student or institution use case.`,
    security: `AI security signal detected across ${sourceText}. High-value topic, but avoid hype without concrete examples.`,
    robotics: `Robotics AI signal detected across ${sourceText}. Strong curiosity value, usually slower to become practical.`,
    "general-ai": `General AI signal detected across ${sourceText}. Needs stronger evidence before treating it as a hidden gem.`,
  };

  return descriptions[category];
}
