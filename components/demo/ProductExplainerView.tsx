import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookmarkCheck,
  BrainCircuit,
  Download,
  Eye,
  FileText,
  Gauge,
  Layers3,
  ListChecks,
  PlugZap,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildProductExplainerDocument } from "@/lib/demo/product-explainer-document";

const stepIcons = [Radar, Layers3, ShieldCheck, Gauge, FileText, PlugZap];

const productRouteCards = [
  {
    title: "Dashboard",
    description: "Scan top signals, hidden gems, source breakdowns and detailed evidence.",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Watchlist",
    description: "Keep promising topics visible across scans and review movement over time.",
    href: "/watchlist",
    icon: BookmarkCheck,
  },
  {
    title: "Action Queue",
    description: "Turn discovery into priority: act, monitor or skip with a clear next step.",
    href: "/action-queue",
    icon: ListChecks,
  },
  {
    title: "Daily Brief",
    description: "Read the compact operating memo for focus, watch items and avoid list.",
    href: "/daily-brief",
    icon: FileText,
  },
];

const adminRouteCards = [
  {
    title: "Scoring Lab",
    description: "Inspect ranking logic, source contribution and confidence boundaries.",
    href: "/admin/scoring-lab",
    icon: Gauge,
  },
  {
    title: "Source Connectors",
    description: "Review connector readiness, optional integrations and scan reliability.",
    href: "/admin/source-connectors",
    icon: PlugZap,
  },
  {
    title: "Deployment",
    description: "Check deployment readiness and public-access caveats before sharing widely.",
    href: "/admin/deployment-readiness",
    icon: ShieldCheck,
  },
  {
    title: "Boundaries",
    description: "Keep local/manual product limits explicit: no auth, cron or email automation.",
    href: "/admin/system-boundaries",
    icon: Layers3,
  },
];

const exportActions = [
  {
    label: "View PDF",
    href: "/api/demo-explainer/export/pdf?inline=1",
    icon: Eye,
    variant: "secondary" as const,
  },
  {
    label: "Download PDF",
    href: "/api/demo-explainer/export/pdf",
    icon: Download,
    variant: "outline" as const,
  },
  {
    label: "View HTML",
    href: "/api/demo-explainer/export/html",
    icon: Eye,
    variant: "outline" as const,
  },
  {
    label: "Download HTML",
    href: "/api/demo-explainer/export/html?download=1",
    icon: Download,
    variant: "ghost" as const,
  },
];

export function ProductExplainerView() {
  const document = buildProductExplainerDocument();

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-3xl border border-secondary/15 bg-[#160d0d]/76 p-5 shadow-radar signal-glow sm:p-7 lg:p-9">
          <div className="grid gap-7 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
                Product Explainer
              </p>
              <h1 className="mt-3 max-w-5xl text-balance text-3xl font-semibold tracking-[-0.055em] text-foreground sm:text-4xl md:text-6xl">
                How Trend Finder works from first scan to final report.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground/80 md:text-base">
                {document.corePromise}
              </p>
            </div>

            <Card className="border-border/10 bg-[#0f0808]/38">
              <CardHeader>
                <Badge variant="accent" className="w-fit">
                  Portable explainer
                </Badge>
                <CardTitle>Open or download this page as a document.</CardTitle>
                <CardDescription>
                  Use the export buttons when you need to share the system explanation without walking someone through the live app.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {exportActions.map((action) => (
                  <Button
                    key={action.label}
                    asChild
                    variant={action.variant}
                    className="justify-center"
                  >
                    <Link href={action.href} target="_blank" rel="noreferrer">
                      <action.icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <Radar className="h-5 w-5 text-secondary" />
              <CardTitle>Input</CardTitle>
              <CardDescription>
                Source connectors collect early movement from technical, editorial and discussion streams.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <BrainCircuit className="h-5 w-5 text-secondary" />
              <CardTitle>Intelligence</CardTitle>
              <CardDescription>
                Clustering, scoring, lifecycle labels and quality gates turn raw movement into ranked topics.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <FileText className="h-5 w-5 text-secondary" />
              <CardTitle>Output</CardTitle>
              <CardDescription>
                Dashboard decisions, Daily Briefs, reports and export packages make the intelligence usable.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/10 bg-[#160d0d]/62 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:mb-6">
            <Badge variant="secondary" className="w-fit">
              End-to-end system
            </Badge>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
              The full workflow
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground/76">
              Each layer has a job. The product becomes reliable because source intake, topic identity, scoring, user workflow and admin QA are not mixed into one messy screen.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {document.steps.map((step, index) => {
              const Icon = stepIcons[index] ?? Sparkles;

              return (
                <Card key={step.title} className="border-border/10 bg-[#0f0808]/34">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="muted">{step.eyebrow}</Badge>
                    </div>
                    <CardTitle className="mt-3 text-lg leading-6">
                      {step.title}
                    </CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm leading-6 text-muted-foreground/78">
                      {step.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-3 text-sm font-medium leading-6 text-secondary">
                      Output: {step.output}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <WorkflowSide
            title="Product side"
            description="What the end user uses every day. This side stays focused on reading signals, making decisions and exporting useful material."
            cards={productRouteCards}
          />
          <WorkflowSide
            title="Admin side"
            description="What the operator uses to validate scoring, source reliability, deployment readiness and product boundaries."
            cards={adminRouteCards}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {document.outputs.map((section) => (
            <Card key={section.title} className="border-border/10 bg-[#160d0d]/62">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  Output
                </Badge>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground/78">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-secondary/15 bg-[#160d0d]/72 p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <Badge variant="accent">Boundaries</Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                Clear positioning keeps the product credible.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground/78">
                Trend Finder is strongest when presented as a manual intelligence radar with reviewable exports. Overselling it as an autonomous prediction machine would be nonsense wearing a nice coat.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {document.boundaries.map((section) => (
                <Card key={section.title} className="border-border/10 bg-[#0f0808]/34">
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm leading-6 text-muted-foreground/78">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

type WorkflowSideCard = {
  title: string;
  description: string;
  href: string;
  icon: typeof Radar;
};

function WorkflowSide({
  title,
  description,
  cards,
}: {
  title: string;
  description: string;
  cards: WorkflowSideCard[];
}) {
  return (
    <Card className="border-border/10 bg-[#160d0d]/62">
      <CardHeader>
        <Badge variant="secondary" className="w-fit">
          {title}
        </Badge>
        <CardTitle className="text-2xl tracking-[-0.04em]">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl border border-border/10 bg-[#0f0808]/34 p-4 transition hover:border-secondary/35 hover:bg-secondary/10"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {card.title}
                  </p>
                  <ArrowRight className="h-3.5 w-3.5 text-secondary opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground/72">
                  {card.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
