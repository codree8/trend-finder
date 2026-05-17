"use client";

import Link from "next/link";
import { CheckCircle2, Cloud, ExternalLink, PlugZap, Rocket, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DeploymentStatus = "Ready" | "Review" | "Blocked";

type DeploymentCheck = {
  title: string;
  status: DeploymentStatus;
  detail: string;
};

const checks: DeploymentCheck[] = [
  {
    title: "No background job leftovers",
    status: "Ready",
    detail: "Hosted job configuration is removed. The project keeps visible, user-triggered scans and exports only.",
  },
  {
    title: "No auth requirement",
    status: "Ready",
    detail: "Product/Admin separation remains UI-only for local use. No login or protected route layer is required.",
  },
  {
    title: "Product links",
    status: "Review",
    detail: "Click dashboard, daily brief, reports, report history, watchlist, action queue, settings and demo flow after overwrite.",
  },
  {
    title: "Admin links",
    status: "Review",
    detail: "Click scoring lab, beta readiness, deployment readiness and system boundaries from Admin view.",
  },
  {
    title: "No Product debug language",
    status: "Ready",
    detail: "Product pages use decision language. Technical breakdown stays in Admin or Admin view.",
  },
  {
    title: "LocalStorage preferences safe",
    status: "Ready",
    detail: "Preferences are read through client effects or safe defaults to reduce hydration mismatch risk.",
  },
  {
    title: "Empty and error states",
    status: "Review",
    detail: "Run with an empty database or temporarily broken API response and confirm pages fail clearly.",
  },

  {
    title: "Connector readiness visible",
    status: "Ready",
    detail: "Admin Source Connectors separates active scanner sources from sources that are only supported by the model.",
  },
  {
    title: "/api/trends reachable",
    status: "Review",
    detail: "Use the browser or PowerShell to verify the trends endpoint returns ok=true before presenting.",
  },
  {
    title: "Exports reachable",
    status: "Review",
    detail: "Open PDF, HTML, JSON and print-prep links from Reports Hub and Daily Brief.",
  },
  {
    title: "Scan endpoint visible but safe",
    status: "Ready",
    detail: "Manual scan remains a visible product action. It is not triggered silently by this build.",
  },
  {
    title: "No live delivery buttons",
    status: "Ready",
    detail: "There are no product controls for test delivery, enabling live delivery or configuring real outbound targets.",
  },
  {
    title: "Build verification",
    status: "Review",
    detail: "Run lint, TypeScript and build locally after applying the patch.",
  },
];

function statusVariant(status: DeploymentStatus) {
  if (status === "Ready") return "secondary" as const;
  if (status === "Review") return "accent" as const;
  return "danger" as const;
}

function StatusIcon({ status }: { status: DeploymentStatus }) {
  if (status === "Ready") return <CheckCircle2 className="mt-0.5 h-5 w-5 text-secondary" />;
  if (status === "Blocked") return <XCircle className="mt-0.5 h-5 w-5 text-primary" />;
  return <TriangleAlert className="mt-0.5 h-5 w-5 text-accent" />;
}

export function DeploymentReadinessView() {
  const readyCount = checks.filter((check) => check.status === "Ready").length;
  const score = Math.round((readyCount / checks.length) * 100);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / Local Production Readiness
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Package the product before pushing it into the wild.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This board checks the local production boundary, user-facing polish, API health and export reliability. It does not enable hidden background behavior.
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
              <CardTitle>Local production</CardTitle>
              <CardDescription>Use after lint, TypeScript and build checks pass.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <CardTitle>Manual product</CardTitle>
              <CardDescription>Reports and scans stay user-triggered. No hidden delivery feature is part of this build.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <PlugZap className="h-5 w-5 text-secondary" />
              <CardTitle>Connector boundary</CardTitle>
              <CardDescription>YouTube is optional and feature-flagged. arXiv is now an active keyless research connector. Reddit remains model-supported but not active yet.</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>Readiness checklist</CardTitle>
            <CardDescription>Hard truth board. Green means fine; review means do the boring check.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((check) => (
              <div key={check.title} className="flex flex-col gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <StatusIcon status={check.status} />
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
            <CardDescription>Run the boring checks before presenting. Boring checks save weekends.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground/78">
            <div className="rounded-2xl border border-border/10 bg-muted/25 p-4 font-mono text-xs text-muted-foreground/88">
              npm run lint<br />
              npx tsc --noEmit<br />
              npm run build
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href="/demo">Open demo flow</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/source-connectors">Open source connectors</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/automation">Open system boundaries</Link>
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
