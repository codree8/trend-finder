export type ExplainerTone = "positive" | "neutral" | "warning" | "danger";

export type ExplainerStep = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  output: string;
};

export type ExplainerSection = {
  title: string;
  description: string;
  tone: ExplainerTone;
  items: string[];
};

export type ExplainerDocument = {
  title: string;
  subtitle: string;
  generatedAt: string;
  summary: string;
  corePromise: string;
  steps: ExplainerStep[];
  productSide: ExplainerSection[];
  adminSide: ExplainerSection[];
  outputs: ExplainerSection[];
  boundaries: ExplainerSection[];
};

const steps: ExplainerStep[] = [
  {
    eyebrow: "01 / Signal intake",
    title: "The system collects early AI signals from source connectors.",
    description:
      "Trend Finder starts by scanning source streams where technical movement usually appears before it becomes polished marketing copy.",
    bullets: [
      "GitHub surfaces repository momentum and implementation activity.",
      "Hacker News captures builder discussion and technical curiosity.",
      "RSS sources add editorial, product and research context.",
      "Optional connectors can expand the scan without changing the core product flow.",
    ],
    output: "Raw source items become normalized signal candidates.",
  },
  {
    eyebrow: "02 / Topic identity",
    title: "Signals are grouped into topics instead of shown as scattered links.",
    description:
      "The app normalizes topic names, merges close aliases and builds canonical trend snapshots so the user sees one signal, not five duplicated versions of the same thing.",
    bullets: [
      "Topic clustering reduces duplicate noise.",
      "Canonical keys keep watchlist and history behavior stable.",
      "Category mapping keeps the dashboard useful for scanning by intent.",
      "Evidence remains visible so every trend can be traced back to source material.",
    ],
    output: "Clustered trend snapshots with evidence, categories and source coverage.",
  },
  {
    eyebrow: "03 / Scoring and quality gates",
    title: "The product separates signal from noise before it reaches the main view.",
    description:
      "Trend score, hidden-gem score, lifecycle state, content opportunity and quality gates work together so weak movement does not look more important than it is.",
    bullets: [
      "Freshness helps prioritize recent movement.",
      "Source quality prevents one weak mention from dominating the ranking.",
      "Lifecycle labels show whether something is emerging, growing, mature or fading.",
      "Noise suppression keeps low-quality or duplicated topics away from the primary workflow.",
    ],
    output: "Ranked topics with a practical Act, Watch or Avoid posture.",
  },
  {
    eyebrow: "04 / Product workspace",
    title: "The user gets a simple operating view, not an engineering dashboard dump.",
    description:
      "The product side focuses on the decisions that matter: what deserves attention, what should be watched, what can be turned into content, and what should be ignored for now.",
    bullets: [
      "Dashboard shows top signals, hidden gems, charts and source distribution.",
      "Trend detail explains why a topic is moving and what evidence supports it.",
      "Watchlist keeps important topics visible across scans.",
      "Action Queue translates discovery into concrete next steps.",
    ],
    output: "A clear daily workflow for discovery, evaluation and action.",
  },
  {
    eyebrow: "05 / Briefs and reports",
    title: "The same intelligence becomes exportable decision material.",
    description:
      "Daily Brief and Reports turn the dashboard into a readable memo, creator pack, research snapshot or executive-style report without pretending the data is more certain than it is.",
    bullets: [
      "Daily Brief summarizes the best move, watch items and avoid list.",
      "Reports support template-aware framing for different use cases.",
      "PDF, HTML and JSON exports stay manual and reviewable.",
      "History keeps generated report packages easy to revisit.",
    ],
    output: "Readable outputs for creators, builders, analysts and internal review.",
  },
  {
    eyebrow: "06 / Admin QA layer",
    title: "The engine room stays separate from the user path.",
    description:
      "Admin screens exist to validate scoring, connector readiness, deployment boundaries and system reliability without making the end-user experience heavier.",
    bullets: [
      "Scoring Lab explains why a topic ranked the way it did.",
      "Source Connector QA shows which integrations are active, optional or missing.",
      "Readiness screens keep manual-only boundaries explicit.",
      "System boundaries make it clear that there is no auth, cron or email automation in this local version.",
    ],
    output: "A maintainable separation between product UX and diagnostic tooling.",
  },
];

const productSide: ExplainerSection[] = [
  {
    title: "Landing page",
    description:
      "Explains the value of the product in plain language and guides users into the radar, reports or explainer flow.",
    tone: "positive",
    items: [
      "Positions Trend Finder as an AI signal radar, not a generic trend list.",
      "Shows who it is for: creators, builders, analysts and product teams.",
      "Keeps the message confident without implying finished SaaS infrastructure that is not present yet.",
    ],
  },
  {
    title: "Dashboard",
    description:
      "The main user workspace for scanning top trends, source movement, hidden gems, creator opportunities and detailed evidence.",
    tone: "positive",
    items: [
      "Filters help users adjust the signal window and categories.",
      "Trend detail drawer explains evidence and status without leaving the page.",
      "Signal table has desktop and mobile views so the app remains usable on smaller screens.",
    ],
  },
  {
    title: "Watchlist and Action Queue",
    description:
      "The decision layer turns scanning into follow-up work.",
    tone: "neutral",
    items: [
      "Watchlist tracks topics worth monitoring across scans.",
      "Action Queue prioritizes what deserves action, monitoring or avoidance.",
      "The app keeps manual review in the loop instead of auto-publishing recommendations.",
    ],
  },
  {
    title: "Daily Brief and Reports",
    description:
      "The output layer converts raw trend intelligence into readable material.",
    tone: "positive",
    items: [
      "Daily Brief gives a compact operating memo.",
      "Reports support multiple templates for different audiences.",
      "Exports are available as PDF, HTML and JSON depending on the report type.",
    ],
  },
];

const adminSide: ExplainerSection[] = [
  {
    title: "Scoring Lab",
    description:
      "Shows the reasoning behind ranking, lifecycle state, source contribution and scoring transparency.",
    tone: "neutral",
    items: [
      "Useful for calibration and trust-building.",
      "Not meant to be the default end-user experience.",
      "Keeps the system honest when a topic looks strong but evidence is thin.",
    ],
  },
  {
    title: "Source Connector Readiness",
    description:
      "Documents connector status and reliability so scan quality is not a mystery.",
    tone: "neutral",
    items: [
      "GitHub token is helpful but not a hard blocker.",
      "Optional connectors are treated as optional reliability improvements.",
      "Connector QA makes degraded scans visible instead of silently pretending everything is perfect.",
    ],
  },
  {
    title: "Deployment and system boundaries",
    description:
      "Clarifies what the current product is and what it deliberately does not include.",
    tone: "warning",
    items: [
      "No public auth layer is included in this local/manual version.",
      "No cron or email automation is active.",
      "Public deployment requires access protection for scan/admin routes before real users are invited.",
    ],
  },
];

const outputs: ExplainerSection[] = [
  {
    title: "For creators",
    description:
      "Find topic angles early, understand why they matter, then turn them into content before the subject becomes crowded.",
    tone: "positive",
    items: [
      "Creator opportunity scoring highlights content-friendly topics.",
      "Daily Brief gives a compact narrative starting point.",
      "Reports can package the same intelligence into a shareable brief.",
    ],
  },
  {
    title: "For builders and founders",
    description:
      "Use the radar to spot technical movement and product-adjacent opportunities before they become obvious market noise.",
    tone: "positive",
    items: [
      "Repository and discussion signals show where builder attention is moving.",
      "Action Queue helps separate immediate opportunities from watch-only topics.",
      "Evidence keeps decisions grounded in observable source movement.",
    ],
  },
  {
    title: "For analysts and internal teams",
    description:
      "Use exports and admin QA to review the strength, freshness and confidence level of the detected signals.",
    tone: "neutral",
    items: [
      "HTML and PDF exports make the explanation portable.",
      "JSON exports preserve structured data for deeper review.",
      "Admin screens expose calibration and readiness checks without polluting the user flow.",
    ],
  },
];

const boundaries: ExplainerSection[] = [
  {
    title: "What the app does well now",
    description:
      "Trend Finder is strongest as a manual intelligence radar for early AI topics and reviewable reporting.",
    tone: "positive",
    items: [
      "Real source snapshots drive the product workflow.",
      "The user path is separated from admin diagnostics.",
      "Export flow is manual, visible and reviewable.",
    ],
  },
  {
    title: "What should not be oversold",
    description:
      "The product should not be presented as a magic prediction engine or fully automated SaaS platform in its current local form.",
    tone: "warning",
    items: [
      "It detects and ranks signals; it does not guarantee future market outcomes.",
      "It has no active auth, billing, team accounts, cron jobs or email automation.",
      "Any public launch needs access-control hardening first.",
    ],
  },
];

export function buildProductExplainerDocument(): ExplainerDocument {
  return {
    title: "Trend Finder System Explainer",
    subtitle:
      "How the AI signal radar collects source movement, filters noise, ranks opportunities and turns trends into usable briefs and reports.",
    generatedAt: new Date().toISOString(),
    summary:
      "Trend Finder is a manual AI trend intelligence radar for creators, builders and analysts who need to spot meaningful movement before it becomes mainstream noise.",
    corePromise:
      "The product does not try to predict the future with fake certainty. It scans real source signals, groups them into topics, evaluates evidence quality, and gives the user a practical decision layer: act, watch or avoid.",
    steps,
    productSide,
    adminSide,
    outputs,
    boundaries,
  };
}

export function buildProductExplainerFilename(extension: "html" | "pdf") {
  const date = new Date().toISOString().slice(0, 10);
  return `trend-finder-system-explainer-${date}.${extension}`;
}
