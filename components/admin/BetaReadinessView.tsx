"use client";

import Link from "next/link";
import { CheckCircle2, ClipboardCheck, ExternalLink, Gauge, LayoutDashboard, TriangleAlert, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CheckStatus = "Ready" | "Review" | "Blocked";

type ReadinessCheck = {
  group: string;
  title: string;
  status: CheckStatus;
  detail: string;
  route?: string;
};

const checks: ReadinessCheck[] = [
  {
    group: "Navigation",
    title: "Product/Admin separation",
    status: "Ready",
    detail: "Product pages focus on decisions and exports. Admin pages hold diagnostics and system boundaries.",
    route: "/admin/system-boundaries",
  },
  {
    group: "Navigation",
    title: "Product links",
    status: "Review",
    detail: "Click through dashboard, watchlist, action queue, daily brief, reports, history and settings locally.",
    route: "/dashboard",
  },
  {
    group: "Navigation",
    title: "Admin links",
    status: "Review",
    detail: "Check scoring lab, beta readiness, deployment readiness and boundaries routes from the sidebar.",
    route: "/admin/scoring-lab",
  },
  {
    group: "Product",
    title: "Daily Brief memo",
    status: "Ready",
    detail: "The brief presents best move, act/watch/avoid guidance, confidence and caveat without diagnostic overload.",
    route: "/daily-brief",
  },
  {
    group: "Product",
    title: "Reports templates",
    status: "Ready",
    detail: "Reports change structure for executive, creator, research and pitch views while keeping manual export links.",
    route: "/reports",
  },
  {
    group: "Data",
    title: "Real data usefulness",
    status: "Review",
    detail: "Run a fresh scan and inspect whether hidden gems, action queue and creator opportunities are useful, not merely valid.",
    route: "/dashboard",
  },
  {
    group: "Preferences",
    title: "Hydration-safe local preferences",
    status: "Ready",
    detail: "Preferences are read after mount or through safe fallbacks, so refresh should not change the initial server/client shape.",
    route: "/settings",
  },
  {
    group: "Reports",
    title: "Local report history",
    status: "Ready",
    detail: "Saved reports remain browser-local for now. Database-backed ownership is intentionally deferred.",
    route: "/reports/history",
  },
  {
    group: "Boundary",
    title: "No background workflow",
    status: "Ready",
    detail: "No product route exposes background delivery controls. Reports and scans remain user-triggered.",
    route: "/admin/system-boundaries",
  },
  {
    group: "Boundary",
    title: "No auth requirement",
    status: "Ready",
    detail: "The project remains a local tool with UI-only Product/Admin separation.",
    route: "/settings",
  },
  {
    group: "Release",
    title: "API and build checks",
    status: "Review",
    detail: "Verify /api/trends, export routes, lint, TypeScript and build before calling this beta-ready.",
    route: "/admin/deployment-readiness",
  },
];

function statusVariant(status: CheckStatus) {
  if (status === "Ready") return "secondary" as const;
  if (status === "Review") return "accent" as const;
  return "danger" as const;
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "Ready") return <CheckCircle2 className="mt-0.5 h-5 w-5 text-secondary" />;
  if (status === "Blocked") return <XCircle className="mt-0.5 h-5 w-5 text-primary" />;
  return <TriangleAlert className="mt-0.5 h-5 w-5 text-accent" />;
}

function score() {
  const ready = checks.filter((check) => check.status === "Ready").length;
  return Math.round((ready / checks.length) * 100);
}

export function BetaReadinessView() {
  const readinessScore = score();

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / Beta Readiness
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Make it feel like a product before calling it beta.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This is the real QA pass: navigation, simplified pages, useful data, safe preferences, empty states, API handling and manual export paths.
            </p>
          </div>
          <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/60">Readiness</p>
            <p className="mt-1 text-3xl font-semibold text-secondary">{readinessScore}%</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-secondary/15 bg-[#160d0d]/66 signal-glow">
            <CardHeader>
              <LayoutDashboard className="h-5 w-5 text-secondary" />
              <CardTitle>Product UX</CardTitle>
              <CardDescription>Simplified user pages, clear exports and no diagnostic overload.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <Gauge className="h-5 w-5 text-secondary" />
              <CardTitle>Real signal quality</CardTitle>
              <CardDescription>The next judgement is usefulness, not only whether the code compiles.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <ClipboardCheck className="h-5 w-5 text-secondary" />
              <CardTitle>Local release</CardTitle>
              <CardDescription>Manual-first, no auth layer, no background surprises.</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>QA checklist</CardTitle>
            <CardDescription>Use this as your click-through order before demo recording or local production use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((check) => (
              <div key={`${check.group}-${check.title}`} className="flex flex-col gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex gap-3">
                  <StatusIcon status={check.status} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{check.group}</Badge>
                      <p className="text-sm font-semibold text-foreground">{check.title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground/76">{check.detail}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
                  {check.route ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={check.route}>Open <ExternalLink className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
