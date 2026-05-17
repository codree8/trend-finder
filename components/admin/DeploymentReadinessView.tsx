"use client";

import Link from "next/link";
import { CheckCircle2, Cloud, ExternalLink, Rocket, ShieldCheck, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DeploymentCheck = {
  title: string;
  status: "ready" | "review" | "manual";
  detail: string;
};

const checks: DeploymentCheck[] = [
  {
    title: "Product/Admin separation",
    status: "ready",
    detail: "User-facing flow and diagnostics flow are separated at UI level.",
  },
  {
    title: "Exports stay manual",
    status: "ready",
    detail: "HTML, JSON, PDF and print-ready exports are still user-triggered.",
  },
  {
    title: "Automation remains blocked",
    status: "ready",
    detail: "No cron, recipients, provider send or live email enablement is added here.",
  },
  {
    title: "Environment variables",
    status: "manual",
    detail: "Verify Neon connection and scan keys in Vercel. This page does not expose secrets.",
  },
  {
    title: "Production scan policy",
    status: "review",
    detail: "Confirm frequency, rate limits and source reliability before enabling scheduled scans.",
  },
  {
    title: "Landing/demo packaging",
    status: "ready",
    detail: "Home page now presents a public demo path without inventing fake data.",
  },
];

function statusVariant(status: DeploymentCheck["status"]) {
  if (status === "ready") return "secondary" as const;
  if (status === "review") return "accent" as const;
  return "muted" as const;
}

export function DeploymentReadinessView() {
  const readyCount = checks.filter((check) => check.status === "ready").length;
  const score = Math.round((readyCount / checks.length) * 100);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / Deployment Readiness
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Package the product before pushing it into the wild.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This is a practical readiness board for Vercel deployment, public demo review and manual export validation. It is not a secrets scanner and it does not enable automation.
            </p>
          </div>
          <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/60">Readiness</p>
            <p className="mt-1 text-3xl font-semibold text-secondary">{score}%</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-secondary/15 bg-[#160d0d]/66 signal-glow">
            <CardHeader>
              <Cloud className="h-5 w-5 text-secondary" />
              <CardTitle>Vercel deploy</CardTitle>
              <CardDescription>Use after lint, TypeScript and local build checks pass.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <CardTitle>Manual-only automation</CardTitle>
              <CardDescription>Email prep stays review-only until provider and recipients are explicitly configured.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <Rocket className="h-5 w-5 text-secondary" />
              <CardTitle>Public demo</CardTitle>
              <CardDescription>Landing page points users toward the dashboard, reports and settings without debug noise.</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>Readiness checklist</CardTitle>
            <CardDescription>Hard truth board. Green means fine; review means do not be lazy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((check) => (
              <div key={check.title} className="flex flex-col gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  {check.status === "ready" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-secondary" />
                  ) : (
                    <TriangleAlert className="mt-0.5 h-5 w-5 text-accent" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{check.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground/76">{check.detail}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>Recommended verification order</CardTitle>
            <CardDescription>Run the boring checks before touching deployment. Boring checks save weekends.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground/78">
            <div className="rounded-2xl border border-border/10 bg-muted/25 p-4 font-mono text-xs text-muted-foreground/88">
              npm run lint<br />
              npx tsc --noEmit<br />
              npm run build
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href="/">Open landing page</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/automation">Open automation admin</Link>
              </Button>
              <Button asChild variant="ghost">
                <a href="https://vercel.com" target="_blank" rel="noreferrer">
                  Vercel <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
