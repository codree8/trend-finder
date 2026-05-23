import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookmarkCheck,
  BrainCircuit,
  FileText,
  Layers3,
  ListChecks,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const valueCards = [
  {
    title: "Early signal radar",
    description:
      "Track source movement from builder, product and research streams before a topic becomes generic news noise.",
    icon: Radar,
  },
  {
    title: "Evidence-first ranking",
    description:
      "Trend score, hidden-gem score, lifecycle state and quality gates work together so weak topics do not look stronger than they are.",
    icon: ShieldCheck,
  },
  {
    title: "Actionable outputs",
    description:
      "Turn signals into a Daily Brief, Action Queue, Watchlist and template-ready reports without losing manual review.",
    icon: FileText,
  },
];

const workflowCards = [
  {
    label: "Scan",
    title: "Collect source movement",
    description:
      "GitHub, Hacker News, RSS and optional connectors feed normalized signal candidates into the system.",
  },
  {
    label: "Cluster",
    title: "Group duplicated signals",
    description:
      "Topic identity logic merges aliases and builds stable trend snapshots with traceable evidence.",
  },
  {
    label: "Score",
    title: "Rank by signal quality",
    description:
      "Freshness, source quality, lifecycle and visibility gates separate real movement from noise.",
  },
  {
    label: "Act",
    title: "Use the decision layer",
    description:
      "Dashboard, Watchlist, Action Queue, Daily Brief and Reports help users decide what to act on, watch or avoid.",
  },
];

const audienceCards = [
  {
    title: "Creators",
    description:
      "Find content angles while they are still early enough to feel fresh, not recycled.",
    icon: Sparkles,
  },
  {
    title: "Builders",
    description:
      "Spot technical movement and product opportunities from real source activity.",
    icon: BrainCircuit,
  },
  {
    title: "Analysts",
    description:
      "Review evidence, confidence and exportable summaries without digging through raw links.",
    icon: BarChart3,
  },
];

const productOutputs = [
  { label: "Dashboard", icon: BarChart3 },
  { label: "Watchlist", icon: BookmarkCheck },
  { label: "Action Queue", icon: ListChecks },
  { label: "Reports", icon: FileText },
];

export function PublicDemoLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative px-3 py-6 sm:px-6 sm:py-10 md:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,192,125,0.15),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(154,40,106,0.16),transparent_38%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 sm:gap-14 lg:gap-16">
          <nav className="flex items-center justify-between gap-3 rounded-3xl border border-border/10 bg-[#160d0d]/72 px-4 py-3 backdrop-blur-xl sm:px-5">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-radar">
                <Radar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Trend Finder</p>
                <p className="truncate text-xs text-muted-foreground/70">
                  AI Signal Radar
                </p>
              </div>
            </Link>
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Radar</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/reports">Reports</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/demo">How it works</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard">Open app</Link>
              </Button>
            </div>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-12">
            <div>
              <Badge variant="accent">AI trend intelligence</Badge>
              <h1 className="mt-6 max-w-5xl text-balance text-4xl font-semibold tracking-[-0.065em] sm:text-5xl md:text-7xl">
                Find AI signals before they turn into obvious noise.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground/82 md:text-lg">
                Trend Finder scans real source movement, groups scattered signals into topics, ranks their quality and turns the result into a practical workflow for creators, builders and analysts.
              </p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/dashboard">
                    Open the radar <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/demo">See how it works</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/reports">Explore reports</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 text-xs leading-5 text-muted-foreground/72">
                <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">
                  Real source snapshots
                </span>
                <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">
                  Manual review workflow
                </span>
                <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">
                  Export-ready intelligence
                </span>
              </div>
            </div>

            <Card className="border-secondary/15 bg-[#160d0d]/76 shadow-radar signal-glow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="secondary" className="mb-3 w-fit">
                      Core system
                    </Badge>
                    <CardTitle className="text-2xl tracking-[-0.04em]">
                      From source signals to clear decisions.
                    </CardTitle>
                    <CardDescription className="mt-3">
                      A focused flow for finding what deserves attention, what needs monitoring and what should be ignored.
                    </CardDescription>
                  </div>
                  <Layers3 className="h-6 w-6 shrink-0 text-secondary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {workflowCards.map((item, index) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border/10 bg-[#0f0808]/38 p-4"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-sm font-bold text-secondary">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="muted">{item.label}</Badge>
                          <p className="text-sm font-semibold text-foreground">
                            {item.title}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground/76">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {valueCards.map((card) => (
              <Card key={card.title} className="border-border/10 bg-[#160d0d]/62">
                <CardHeader>
                  <card.icon className="h-5 w-5 text-secondary" />
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  Built for
                </Badge>
                <CardTitle className="text-2xl tracking-[-0.04em]">
                  People who need direction, not another pile of links.
                </CardTitle>
                <CardDescription>
                  The product is designed around decisions: act, watch, avoid, export and review.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {productOutputs.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/32 p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold">{item.label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {audienceCards.map((card) => (
                <Card key={card.title} className="border-border/10 bg-[#160d0d]/62">
                  <CardHeader>
                    <card.icon className="h-5 w-5 text-secondary" />
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-secondary/15 bg-[#160d0d]/76 p-5 shadow-radar sm:p-8 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="accent">Operating principle</Badge>
                <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.05em] sm:text-4xl md:text-5xl">
                  The goal is not to predict everything. The goal is to notice earlier and decide better.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground/78 md:text-base">
                  Trend Finder keeps evidence visible, confidence cautious and exports reviewable. That is what makes the product useful: it helps you move faster without pretending uncertainty does not exist.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary" className="w-full md:w-auto">
                <Link href="/demo">
                  Read the system explainer <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
