import Link from "next/link";
import {
  BrainCircuit,
  Download,
  Eye,
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
import { buildProductExplainerDocument } from "@/lib/demo/product-explainer-document";

const stepIcons = [Radar, Layers3, ShieldCheck, Workflow, FileText, ListChecks];

const routeGroups = [
  {
    title: "Product layer",
    description:
      "The day-to-day workflow the end user sees: review signals, make decisions and export useful material.",
    cards: [
      {
        title: "Dashboard",
        description:
          "Review scored topics, sort by movement, inspect evidence and decide what deserves attention.",
      },
      {
        title: "Watchlist",
        description:
          "Save trends that need ongoing attention without losing them inside the full radar stream.",
      },
      {
        title: "Daily Brief",
        description:
          "Turn the current state of the radar into a readable summary that can also be exported.",
      },
      {
        title: "Reports",
        description:
          "Produce portable PDF, HTML and JSON packages when the insight needs to be shared or archived.",
      },
    ],
  },
  {
    title: "Operator layer",
    description:
      "The maintenance side that keeps the product credible: source readiness, scoring validation and deployment boundaries.",
    cards: [
      {
        title: "Source connectors",
        description:
          "Shows what is live, what is optional and what is intentionally inactive so the system stays honest.",
      },
      {
        title: "Scoring lab",
        description:
          "Lets the operator calibrate weighting assumptions without pretending that ranking logic is magic.",
      },
      {
        title: "Deployment readiness",
        description:
          "Documents environment requirements, cron setup and retention rules before public deployment.",
      },
      {
        title: "System boundaries",
        description:
          "Explains what the product does well and what is intentionally out of scope.",
      },
    ],
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

const summaryCards = [
  {
    title: "Input",
    description:
      "Source connectors collect early movement from technical, editorial and discussion streams.",
    icon: Radar,
  },
  {
    title: "Intelligence",
    description:
      "Clustering, scoring, lifecycle labels and quality gates turn raw movement into ranked topics.",
    icon: BrainCircuit,
  },
  {
    title: "Output",
    description:
      "Dashboard decisions, Daily Briefs, reports and export packages make the intelligence usable.",
    icon: FileText,
  },
];

export function ProductExplainerView() {
  const document = buildProductExplainerDocument();

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,192,125,0.12),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(154,40,106,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 radar-grid opacity-70" />

      <div className="relative">
        <PublicSiteHeader />

        <section className="px-3 pb-7 pt-6 sm:px-6 sm:pb-10 sm:pt-10 lg:px-10 lg:pb-14">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch lg:gap-8">
            <div className="rounded-[32px] border border-secondary/15 bg-[#160d0d]/78 p-6 shadow-radar signal-glow sm:p-8 lg:p-10">
              <Badge variant="accent" className="w-fit">
                Product explainer
              </Badge>
              <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.07em] sm:text-5xl lg:text-[4.25rem] lg:leading-[0.98]">
                How Trend Finder works from first scan to final report.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground/82 sm:text-lg">
                {document.corePromise}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/dashboard">Open the live radar</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/">Back to landing</Link>
                </Button>
              </div>
            </div>

            <Card className="border-border/10 bg-[#160d0d]/74">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  Portable explainer
                </Badge>
                <CardTitle className="text-2xl tracking-[-0.04em]">
                  View or download the explainer as a document.
                </CardTitle>
                <CardDescription>
                  Use the export actions when you want to share the full system
                  explanation without walking someone through the live
                  interface.
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

        <section className="px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {summaryCards.map((card) => (
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
                Full workflow
              </Badge>
              <h2 className="text-balance text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                The system stays reliable because each layer has a clear job.
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground/78 sm:text-base">
                Source intake, topic identity, scoring, user workflow and admin
                QA are separated on purpose. That is how the product stays
                understandable instead of collapsing into one overloaded screen.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {document.steps.map((step, index) => {
                const Icon = stepIcons[index] ?? Sparkles;

                return (
                  <Card
                    key={step.title}
                    className="border-border/10 bg-[#0f0808]/34"
                  >
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
          </div>
        </section>

        <section className="px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-2">
            {routeGroups.map((group) => (
              <Card
                key={group.title}
                className="border-border/10 bg-[#160d0d]/64"
              >
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">
                    {group.title}
                  </Badge>
                  <CardTitle className="text-2xl tracking-[-0.04em]">
                    {group.title}
                  </CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {group.cards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-border/10 bg-[#0f0808]/34 p-4"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {card.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground/76">
                        {card.description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="px-3 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-border/10 bg-[#160d0d]/70 p-5 sm:p-7 lg:p-9">
            <div className="grid gap-4 lg:grid-cols-3">
              {document.outputs.map((section) => (
                <Card
                  key={section.title}
                  className="border-border/10 bg-[#0f0808]/34"
                >
                  <CardHeader>
                    <Badge variant="muted" className="w-fit">
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
            </div>
          </div>
        </section>

        <section className="px-3 pb-8 pt-4 sm:px-6 sm:pb-10 lg:px-10 lg:pb-14">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-secondary/15 bg-[#160d0d]/78 p-6 shadow-radar sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <Badge variant="accent" className="w-fit">
                  Boundaries
                </Badge>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  Clear positioning is part of the product quality.
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground/80 sm:text-base">
                  Trend Finder works best when presented as an intelligence
                  radar with reviewable exports and operator oversight.
                  Pretending it is an autonomous prediction machine would be
                  nonsense dressed in nicer typography.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {document.boundaries.map((section) => (
                  <Card
                    key={section.title}
                    className="border-border/10 bg-[#0f0808]/34"
                  >
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
          </div>
        </section>

        <PublicSiteFooter />
      </div>
    </main>
  );
}
