export const aiCategories = [
  "Agents",
  "Coding",
  "Video",
  "Image",
  "Audio",
  "Open Source",
  "Local LLM",
  "Automation",
  "Research",
  "Marketing",
  "Business",
  "Education",
  "Security",
  "Robotics",
  "General AI",
] as const;

export type AiCategory = (typeof aiCategories)[number];

export function isAiCategory(value: string): value is AiCategory {
  return (aiCategories as readonly string[]).includes(value);
}
