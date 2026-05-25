import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookmarkCheck,
  BrainCircuit,
  CheckCircle2,
  FileStack,
  FileText,
  Layers3,
  ListChecks,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const proofPoints = [
  "Real source signals instead of generic trend lists",
  "Evidence-aware scoring and lifecycle labels",
  "Manual and protected scheduled scans",
  "Daily Brief, watchlist and report exports",
];

const featureCards = [
  {
    icon: Radar,
    title: "Early signal radar",
    description:
      "Scan GitHub, Hacker News, RSS and optional connectors before a topic becomes generic feed noise.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence-first ranking",
    description:
      "Source quality, hidden-gem score, lifecycle state and freshness gates keep weak topics from looking stronger than they are.",
  },
  {
    icon: FileText,
    title: "Actionable outputs",
    description:
      "Daily Briefs, Action Queue, Watchlist and reports turn raw movement into something you can actually act on.",
  },
  {
    icon: Workflow,
    title: "Production-safe operation",
    description:
      "Protected cron jobs, scan locks and retention cleanup keep the system fresh without flooding a small database.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Scan",
    description:
      "Manual scans and protected scheduled refreshes pull normalized signal candidates from technical, editorial and discussion streams.",
  },
  {
    step: "02",
    title: "Cluster",
    description:
      "Topic identity logic merges duplicate movement and builds a cleaner, more stable picture of what is actually emerging.",
  },
  {
    step: "03",
    title: "Score",
    description:
      "Freshness, source quality, lifecycle and visibility gates decide what deserves attention and what is just noise.",
  },
  {
    step: "04",
    title: "Act",
    description:
      "The dashboard, watchlist, Daily Brief and reports give the user a clear decision layer: act, watch or avoid.",
  },
];

const productOutputs = [
  {
    icon: BarChart3,
    title: "Dashboard",
    description:
      "The command view for reviewing trend movement, scores, evidence and signal quality.",
  },
  {
    icon: BookmarkCheck,
    title: "Watchlist",
    description:
      "A focused list of topics worth tracking without digging through the full radar every time.",
  },
  {
    icon: ListChecks,
    title: "Action Queue",
    description:
      "The practical layer that helps separate immediate action from observation and avoidance.",
  },
  {
    icon: FileStack,
    title: "Reports",
    description:
      "Shareable PDF, HTML and JSON outputs for briefings, analysis handoff and archive-ready export packages.",
  },
];

const audienceCards = [
  {
    title: "Creators",
    description:
      "Find content angles while they still feel early enough to be fresh instead of recycled.",
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
      "Review evidence, confidence and exportable summaries without getting lost in raw links.",
    icon: BarChart3,
  },
];

export function PublicDemoLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,192,125,0.12),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(154,40,106,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 radar-grid opacity-70" />

      <div className="relative">
        <PublicSiteHeader />

        <section className="px-3 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-10 lg:px-10 lg:pb-16">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch lg:gap-8">
            <div className="rounded-[32px] border border-border/10 bg-[#160d0d]/76 p-6 shadow-radar signal-glow sm:p-8 lg:p-10">
              <Badge variant="accent" className="w-fit">
                AI trend intelligence
              </Badge>
              <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.07em] sm:text-5xl lg:text-[4.5rem] lg:leading-[0.95]">
                Spot meaningful AI movement before it turns into obvious noise.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground/82 sm:text-lg">
                Trend Finder scans real source movement, groups scattered
                signals into stable topics, ranks their evidence quality and
                turns the result into a practical workflow for people who need
                direction, not another pile of links.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/dashboard">
                    Open the radar <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/demo">How it works</Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {proofPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/36 px-4 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                    <p className="text-sm leading-6 text-muted-foreground/82">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="border-secondary/15 bg-[#160d0d]/76">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">
                    What it actually does
                  </Badge>
                  <CardTitle className="text-2xl tracking-[-0.04em]">
                    A focused workflow from source intake to decision output.
                  </CardTitle>
                  <CardDescription>
                    Trend Finder is strongest when it stays disciplined: capture
                    real movement, score it honestly, and turn it into usable
                    outputs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workflowSteps.map((step) => (
                    <div
                      key={step.step}
                      className="rounded-2xl border border-border/10 bg-[#0f0808]/36 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-sm font-bold text-secondary">
                          {step.step}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {step.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground/76">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/10 bg-[#160d0d]/68">
                <CardHeader>
                  <Badge variant="muted" className="w-fit">
                    Public explainer
                  </Badge>
                  <CardTitle className="text-xl tracking-[-0.04em]">
                    Need the full system walkthrough?
                  </CardTitle>
                  <CardDescription>
                    Open the dedicated explainer page for the complete product
                    flow, boundaries and portable PDF/HTML views.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    asChild
                    className="w-full"
                    variant="outline"
                    size="lg"
                  >
                    <Link href="/demo">
                      Explore the explainer{" "}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((card) => (
              <Card
                key={card.title}
                className="border-border/10 bg-[#160d0d]/64"
              >
                <CardHeader>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="px-3 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-border/10 bg-[#160d0d]/70 p-5 sm:p-7 lg:p-9">
            <div className="flex flex-col gap-3">
              <Badge variant="secondary" className="w-fit">
                Workflow
              </Badge>
              <h2 className="text-balance text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Clean product flow, not a tangled dashboard maze.
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground/78 sm:text-base">
                The system becomes useful because each layer does one job well:
                source intake, topic identity, scoring, user workflow and
                exportable outputs.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-4">
              {workflowSteps.map((step) => (
                <Card
                  key={step.step}
                  className="border-border/10 bg-[#0f0808]/34"
                >
                  <CardHeader>
                    <Badge variant="muted" className="w-fit">
                      Step {step.step}
                    </Badge>
                    <CardTitle>{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
            <Card className="border-border/10 bg-[#160d0d]/64">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  Built for
                </Badge>
                <CardTitle className="text-2xl tracking-[-0.04em] sm:text-3xl">
                  People who need direction, not another wall of links.
                </CardTitle>
                <CardDescription>
                  Trend Finder is designed around a simple outcome: help the
                  user decide what to act on, what to watch and what to ignore.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {productOutputs.map((output) => (
                  <div
                    key={output.title}
                    className="rounded-2xl border border-border/10 bg-[#0f0808]/34 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                        <output.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {output.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground/76">
                          {output.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {audienceCards.map((card) => (
                <Card
                  key={card.title}
                  className="border-border/10 bg-[#160d0d]/64"
                >
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-3 pb-8 pt-10 sm:px-6 sm:pb-10 lg:px-10 lg:pb-14">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-secondary/15 bg-[#160d0d]/78 p-6 shadow-radar sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Badge variant="accent" className="w-fit">
                  Ready to explore
                </Badge>
                <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  Open the app when you want the live radar. Open the explainer
                  when you want the full logic behind it.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground/80 sm:text-base">
                  Both sides matter: one shows the product in motion, the other
                  makes the system understandable and portable for sharing.
                </p>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap lg:justify-end">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/dashboard">Open the radar</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/demo">Open the explainer</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <PublicSiteFooter />
      </div>
    </main>
  );
}
