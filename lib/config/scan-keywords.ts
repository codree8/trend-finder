export const coreAiKeywords = [
  "AI agent",
  "AI coding",
  "local LLM",
  "multimodal AI",
  "AI video",
  "AI automation",
  "open source AI",
  "RAG",
  "AI workflow",
  "model routing",
] as const;

// Kept as the current runtime default until Scan Mode Integration v1 wires
// the category-aware builder into /api/scan.
export const defaultAiKeywords = [...coreAiKeywords];
