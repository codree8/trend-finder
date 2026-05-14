export type TrendStatus = "High Signal" | "Rising" | "Hidden Gem" | "Mainstream" | "Volatile";
export type TrendCategory = "Agents" | "Coding" | "Video" | "Open Source" | "Automation" | "Research" | "Marketing";
export type SourceName = "Reddit" | "GitHub" | "YouTube" | "Hacker News" | "RSS" | "Hugging Face" | "arXiv";

export type Trend = {
  id: string;
  topic: string;
  category: TrendCategory;
  status: TrendStatus;
  summary: string;
  trendScore: number;
  hiddenGemScore: number;
  contentScore: number;
  velocity: number;
  saturation: number;
  creatorGap: number;
  sources: SourceName[];
  whyNow: string;
  contentHook: string;
};

export const trends: Trend[] = [
  {
    id: "browser-agents",
    topic: "Open-source browser agents",
    category: "Agents",
    status: "Hidden Gem",
    summary: "Agent tools that can operate in real browser environments are showing strong developer-side momentum before mainstream creator coverage catches up.",
    trendScore: 92,
    hiddenGemScore: 88,
    contentScore: 91,
    velocity: 84,
    saturation: 29,
    creatorGap: 82,
    sources: ["GitHub", "Hacker News", "Reddit"],
    whyNow: "Developer discussions are moving from chat assistants toward agents that browse, click, verify and complete workflows.",
    contentHook: "AI agents are leaving the chat box and moving into the browser.",
  },
  {
    id: "local-multimodal",
    topic: "Local multimodal LLM stacks",
    category: "Open Source",
    status: "Rising",
    summary: "Local model setups are shifting from text-only experiments toward image, audio and document understanding workflows.",
    trendScore: 86,
    hiddenGemScore: 73,
    contentScore: 84,
    velocity: 77,
    saturation: 41,
    creatorGap: 64,
    sources: ["Reddit", "GitHub", "Hugging Face", "RSS"],
    whyNow: "Open-source tooling is making local multimodal experiments easier for developers and creators.",
    contentHook: "The next local AI setup is not just text. It sees, reads and listens.",
  },
  {
    id: "ai-video-pipelines",
    topic: "AI video workflow pipelines",
    category: "Video",
    status: "High Signal",
    summary: "Creators are combining AI video, voice, editing and automation tools into repeatable production systems.",
    trendScore: 89,
    hiddenGemScore: 65,
    contentScore: 93,
    velocity: 81,
    saturation: 58,
    creatorGap: 54,
    sources: ["YouTube", "Reddit", "RSS"],
    whyNow: "Single-tool demos are becoming less interesting than full workflows that save production time.",
    contentHook: "AI video is not one tool anymore. It is becoming a production pipeline.",
  },
  {
    id: "ai-coding-terminals",
    topic: "AI-native coding terminals",
    category: "Coding",
    status: "Rising",
    summary: "Developers are testing terminal-first coding assistants that sit closer to the real workflow than chat panels.",
    trendScore: 82,
    hiddenGemScore: 76,
    contentScore: 80,
    velocity: 74,
    saturation: 36,
    creatorGap: 71,
    sources: ["GitHub", "Hacker News", "Reddit"],
    whyNow: "Coding assistants are becoming more workflow-native, with stronger CLI and repository context.",
    contentHook: "The next coding assistant might not live in your editor. It might live in your terminal.",
  },
  {
    id: "agentic-business-automation",
    topic: "Agentic business automation",
    category: "Automation",
    status: "Mainstream",
    summary: "Business automation with AI agents is widely discussed, but specific vertical workflows still offer useful content angles.",
    trendScore: 78,
    hiddenGemScore: 44,
    contentScore: 79,
    velocity: 63,
    saturation: 72,
    creatorGap: 38,
    sources: ["YouTube", "Reddit", "RSS", "Hacker News"],
    whyNow: "Companies are moving from AI curiosity to practical automation use cases.",
    contentHook: "AI automation is no longer a demo. The real question is which workflows are worth automating first.",
  },
  {
    id: "small-model-routing",
    topic: "Small model routing systems",
    category: "Research",
    status: "Hidden Gem",
    summary: "Instead of using one large model for everything, teams are experimenting with routing tasks to smaller specialized models.",
    trendScore: 80,
    hiddenGemScore: 85,
    contentScore: 78,
    velocity: 69,
    saturation: 24,
    creatorGap: 86,
    sources: ["arXiv", "GitHub", "Hacker News"],
    whyNow: "Cost and latency pressure are making smart model routing more attractive than brute-force LLM usage.",
    contentHook: "The future of AI may be many smaller models, not one giant model doing everything.",
  },
];

export const kpis = [
  { label: "Top Trend Score", value: "92", helper: "Highest current composite signal", delta: "+14%" },
  { label: "Hidden Gems", value: "2", helper: "Low saturation, high growth", delta: "+2 today" },
  { label: "Tracked Sources", value: "7", helper: "Core + optional free sources", delta: "stable" },
  { label: "Content Gaps", value: "11", helper: "Strong signal, weak creator coverage", delta: "+6" },
];

export const radarData = [
  { axis: "Velocity", value: 84 },
  { axis: "Source Diversity", value: 77 },
  { axis: "Novelty", value: 81 },
  { axis: "Quality", value: 74 },
  { axis: "Creator Gap", value: 86 },
  { axis: "Low Saturation", value: 79 },
];

export const timelineData = [
  { day: "D-6", hot: 42, trend: 58, baseline: 51 },
  { day: "D-5", hot: 48, trend: 61, baseline: 52 },
  { day: "D-4", hot: 52, trend: 65, baseline: 53 },
  { day: "D-3", hot: 63, trend: 69, baseline: 54 },
  { day: "D-2", hot: 74, trend: 73, baseline: 55 },
  { day: "D-1", hot: 81, trend: 77, baseline: 56 },
  { day: "Today", hot: 92, trend: 83, baseline: 57 },
];

export const sourceBreakdown = [
  { source: "GitHub", signals: 38 },
  { source: "Reddit", signals: 31 },
  { source: "YouTube", signals: 18 },
  { source: "HN", signals: 14 },
  { source: "RSS", signals: 11 },
];
