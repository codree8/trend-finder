import Link from "next/link";
import { ArrowRight, BarChart3, FileText, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const productSteps = [
  {
    title: "Scan signal sources",
    description: "GitHub, Hacker News and RSS/blog signals flow into topic clusters and snapshots.",
    icon: Radar,
  },
  {
    title: "Separate trends from noise",
    description: "Lifecycle, freshness, quality gates and scoring transparency keep weak topics out of the main path.",
    icon: Sparkles,
  },
  {
    title: "Export the brief",
    description: "Daily Brief, reports, PDF, JSON, print-ready preview and quick copy stay manual and reviewable.",
    icon: FileText,
  },
];

export function PublicDemoLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative px-6 py-10 md:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,192,125,0.15),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(154,40,106,0.16),transparent_38%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-16">
          <nav className="flex items-center justify-between rounded-3xl border border-border/10 bg-[#160d0d]/60 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-radar">
                <Radar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Trend Finder</p>
                <p className="text-xs text-muted-foreground/70">AI Signal Radar</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/reports">Reports</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/demo">Demo flow</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings">Settings</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <Badge variant="accent">Public demo ready</Badge>
              <h1 className="mt-6 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.06em] md:text-7xl">
                Spot AI signals before they become obvious.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground/82 md:text-lg">
                Trend Finder is not a list-maker. It is a product radar for spotting emerging AI topics, hidden gems, creator opportunities and report-ready signals from real snapshots.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/dashboard">
                    Open product radar <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/daily-brief">View Daily Brief</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/demo">60-second demo</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground/70">
                <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">No fake demo data</span>
                <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">Manual exports only</span>
                <span className="rounded-full border border-border/10 bg-card/60 px-3 py-1.5">Admin diagnostics isolated</span>
              </div>
            </div>

            <Card className="border-secondary/15 bg-[#160d0d]/72 shadow-radar signal-glow">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Product path</CardTitle>
                    <CardDescription>What a user should understand first.</CardDescription>
                  </div>
                  <BarChart3 className="h-5 w-5 text-secondary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {productSteps.map((step, index) => (
                  <div key={step.title} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="muted">0{index + 1}</Badge>
                          <p className="text-sm font-semibold text-foreground">{step.title}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground/76">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <Sparkles className="h-5 w-5 text-secondary" />
                <CardTitle>Creator + Startup lens</CardTitle>
                <CardDescription>Actionable topics, timing and content angles without drowning users in diagnostics.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <FileText className="h-5 w-5 text-secondary" />
                <CardTitle>Template-ready reports</CardTitle>
                <CardDescription>Executive, creator, research and pitch snapshots without admin noise.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <ShieldCheck className="h-5 w-5 text-secondary" />
                <CardTitle>Clean admin layer</CardTitle>
                <CardDescription>Calibration, QA and deployment diagnostics stay separate from product navigation.</CardDescription>
              </CardHeader>
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}
