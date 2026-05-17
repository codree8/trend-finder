"use client";

import Link from "next/link";
import { CheckCircle2, ClipboardCheck, ExternalLink, Gauge, LayoutDashboard, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CheckStatus = "ready" | "review" | "manual";

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
    status: "ready",
    detail: "Product pages focus on decisions and exports. Admin pages hold diagnostics and system boundaries.",
    route: "/admin/automation",
  },
  {
    group: "Navigation",
    title: "Sidebar active states",
    status: "manual",
    detail: "Click through Product and Admin routes locally and confirm active state follows the current page.",
    route: "/dashboard",
  },
  {
    group: "Product",
    title: "Daily Brief simplified",
    status: "ready",
    detail: "The user-facing brief now avoids diagnostics and shows actions, gems, movement, focus and exports.",
    route: "/daily-brief",
  },
  {
    group: "Product",
    title: "Reports simplified",
    status: "ready",
    detail: "Reports Hub now shows template-aware export paths, save snapshot and report integrity without admin noise.",
    route: "/reports",
  },
  {
    group: "Data",
    title: "Real data usefulness",
    status: "review",
    detail: "Run a fresh scan and inspect if hidden gems, action queue and creator opportunities are actually useful, not just technically valid.",
    route: "/dashboard",
  },
  {
    group: "Preferences",
    title: "Settings persistence",
    status: "manual",
    detail: "Change report template, source weights, dashboard visibility and refresh. Values should persist without hydration errors.",
    route: "/settings",
  },
  {
    group: "Reports",
    title: "Local report history",
    status: "ready",
    detail: "Saved reports remain local for now. Database-backed report history is intentionally deferred until auth/user modeling exists.",
    route: "/reports/history",
  },
  {
    group: "Safety",
    title: "Email/scheduling removed",
    status: "ready",
    detail: "No product path exposes delivery, provider, recipient or scheduled report controls.",
    route: "/admin/automation",
  },
  {
    group: "Deploy",
    title: "Vercel readiness",
    status: "review",
    detail: "Run lint, TypeScript and build locally. Verify env vars before any deployment.",
    route: "/admin/deployment-readiness",
  },
];

function statusVariant(status: CheckStatus) {
  if (status === "ready") return "secondary" as const;
  if (status === "review") return "accent" as const;
  return "muted" as const;
}

function score() {
  const ready = checks.filter((check) => check.status === "ready").length;
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
              This is the real product QA pass: navigation, simplified pages, useful data, local preferences, export paths and deployment readiness.
            </p>
          </div>
          <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/60">Current score</p>
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
              <CardDescription>The next judgement is whether the ranking feels useful, not only whether it compiles.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <ClipboardCheck className="h-5 w-5 text-secondary" />
              <CardTitle>Manual release</CardTitle>
              <CardDescription>Local-first, manual-only, no auth, no scheduled sending, no background surprises.</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>QA checklist</CardTitle>
            <CardDescription>Use this as your click-through order before deployment or demo recording.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((check) => (
              <div key={`${check.group}-${check.title}`} className="flex flex-col gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex gap-3">
                  {check.status === "ready" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-secondary" />
                  ) : (
                    <TriangleAlert className="mt-0.5 h-5 w-5 text-accent" />
                  )}
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
