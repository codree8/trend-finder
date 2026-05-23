import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, Gauge, Lightbulb, ListChecks, Radar, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const demoSteps = [
  {
    title: "Open landing page",
    description: "Frame the product as a radar for early AI signals, not another bookmarked list.",
    href: "/",
    icon: Radar,
  },
  {
    title: "Open dashboard",
    description: "Show the live product view: top trends, hidden gems, source breakdown and signal table.",
    href: "/dashboard",
    icon: Gauge,
  },
  {
    title: "Open one strong trend",
    description: "Use the drawer to explain why the topic matters now and whether it is Act, Watch or Avoid.",
    href: "/dashboard",
    icon: Sparkles,
  },
  {
    title: "Show Action Queue",
    description: "Move from discovery to priority: what should be acted on, monitored or skipped.",
    href: "/action-queue",
    icon: ListChecks,
  },
  {
    title: "Open Daily Brief",
    description: "Use the memo view to show the day’s best move, watch items, avoid list and confidence caveat.",
    href: "/daily-brief",
    icon: ClipboardCheck,
  },
  {
    title: "Export or copy report",
    description: "Pick a template and show how the same intelligence becomes an executive brief, creator pack, research memo or pitch snapshot.",
    href: "/reports",
    icon: FileText,
  },
  {
    title: "Admin only if needed",
    description: "Open Scoring Lab only to explain ranking logic, source contribution and calibration boundaries.",
    href: "/admin/scoring-lab",
    icon: Lightbulb,
  },
];

const pitchLines = [
  "Trend Finder helps creators and builders decide which AI topics are worth attention before they become obvious.",
  "It collects real signals from source connectors, clusters them into topics, then separates early movement from noise using freshness, lifecycle, quality gates and source confirmation.",
  "The product view gives a simple decision: act, watch or avoid. The admin view explains why the system ranked it that way.",
  "The output is not just a dashboard. It becomes a Daily Brief and template-aware reports for creators, founders, researchers or pitch framing.",
];

export function DemoPitchView() {
  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Product / Demo Flow
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl md:text-5xl">
              A 60-second path through the product.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Use this route when you need to present Trend Finder quickly without drowning people in the engine room. No fake claims, no fake data, no startup fog machine.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Start at dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </section>

        <Card className="border-secondary/15 bg-[#160d0d]/72 signal-glow">
          <CardHeader>
            <Badge variant="accent" className="w-fit">60-second pitch</Badge>
            <CardTitle>What to say</CardTitle>
            <CardDescription>
              Keep it grounded. The point is early signal intelligence, not magic prediction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pitchLines.map((line, index) => (
              <div key={line} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 text-sm leading-6 text-muted-foreground/80">
                <span className="mr-2 font-semibold text-secondary">{index + 1}.</span>{line}
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoSteps.map((step, index) => (
            <Card key={step.title} className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="muted">Step {index + 1}</Badge>
                </div>
                <CardTitle className="mt-3 text-lg">{step.title}</CardTitle>
                <CardDescription className="leading-6">{step.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={step.href}>Open <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
