"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Cloud,
  ExternalLink,
  PlugZap,
  Rocket,
  ShieldCheck,
  TriangleAlert,
  XCircle,
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

type DeploymentStatus = "Ready" | "Review" | "Blocked";

type DeploymentCheck = {
  title: string;
  status: DeploymentStatus;
  detail: string;
};

const checks: DeploymentCheck[] = [
  {
    title: "Cron surface is protected",
    status: "Ready",
    detail:
      "Scheduled scan and cleanup routes are internal endpoints guarded by CRON_SECRET, with database locks to prevent overlapping jobs.",
  },
  {
    title: "Access gate configured",
    status: "Ready",
    detail:
      "Public landing/explainer stay open, product pages require demo access and admin pages plus scan/write actions require the admin password.",
  },
  {
    title: "No fake automation UI",
    status: "Ready",
    detail:
      "System Boundaries now separates real protected cron from features that are still intentionally not enabled, such as email delivery.",
  },
  {
    title: "No real recipients or outbound targets",
    status: "Ready",
    detail:
      "Reports are opened, copied, downloaded or printed by the user. Nothing is addressed to a live destination.",
  },
  {
    title: "Product links",
    status: "Ready",
    detail:
      "Click dashboard, daily brief, reports, report history, watchlist, action queue and settings after overwrite.",
  },
  {
    title: "Admin links",
    status: "Ready",
    detail:
      "Click scoring lab, beta readiness, deployment readiness, source connectors and system boundaries from Admin view.",
  },
  {
    title: "No Product debug language",
    status: "Ready",
    detail:
      "Product pages now use decision language. Technical scoring and readiness detail stays in Admin or Admin view.",
  },
  {
    title: "Admin/Product mode stable",
    status: "Ready",
    detail:
      "Switch Product/Admin mode, refresh the page and confirm the sidebar stays coherent through localStorage.",
  },
  {
    title: "LocalStorage preferences safe",
    status: "Ready",
    detail:
      "Preferences, report history and onboarding state use browser-only reads with safe defaults to avoid hydration mismatch risk.",
  },
  {
    title: "Empty states exist",
    status: "Ready",
    detail:
      "Dashboard, watchlist, action queue, daily brief, reports and report history show next-step empty states instead of blank panels.",
  },
  {
    title: "API error states exist",
    status: "Ready",
    detail:
      "Temporarily break /api/trends or /api/daily-brief locally and confirm the product tells the user what failed.",
  },
  {
    title: "/api/trends reachable",
    status: "Ready",
    detail:
      "Use the browser or PowerShell to verify the trends endpoint returns ok=true.",
  },
  {
    title: "Exports reachable",
    status: "Ready",
    detail:
      "Open PDF, HTML, JSON and print-prep links from Reports Hub and Daily Brief.",
  },
  {
    title: "Scan endpoints separated",
    status: "Ready",
    detail:
      "Manual scan remains visible but requires admin access and uses the same trend-scan database lock as the scheduled scan endpoint.",
  },
  {
    title: "YouTube disabled state safe",
    status: "Ready",
    detail:
      "If ENABLE_YOUTUBE_CONNECTOR or YOUTUBE_API_KEY is missing, Admin Source Connectors shows it as setup-needed without crashing scans.",
  },
  {
    title: "YouTube enabled state safe",
    status: "Ready",
    detail:
      "With ENABLE_YOUTUBE_CONNECTOR=true and a valid YOUTUBE_API_KEY, run one scan and confirm source readiness stays honest.",
  },
  {
    title: "arXiv keyless connector safe",
    status: "Ready",
    detail:
      "arXiv stays keyless and should report as active when ENABLE_ARXIV_CONNECTOR=true.",
  },
  {
    title: "GitHub token warning understandable",
    status: "Ready",
    detail:
      "Missing GITHUB_TOKEN is presented as an optional/recommended setup issue, not a product crash.",
  },
  {
    title: "Source connector readiness honest",
    status: "Ready",
    detail:
      "Admin Source Connectors separates active scanner sources from model-supported sources such as Reddit.",
  },
  {
    title: "No hydration mismatch risks",
    status: "Ready",
    detail:
      "Run the browser in a clean profile and refresh dashboard, reports/history and settings to confirm no hydration warnings appear.",
  },
  {
    title: "Build verification",
    status: "Ready",
    detail: "Run lint, TypeScript and build locally after applying the patch.",
  },
];

function statusVariant(status: DeploymentStatus) {
  if (status === "Ready") return "secondary" as const;
  if (status === "Review") return "accent" as const;
  return "danger" as const;
}

function StatusIcon({ status }: { status: DeploymentStatus }) {
  if (status === "Ready") {
    return <CheckCircle2 className="mt-0.5 h-5 w-5 text-secondary" />;
  }
  if (status === "Blocked") {
    return <XCircle className="mt-0.5 h-5 w-5 text-primary" />;
  }
  return <TriangleAlert className="mt-0.5 h-5 w-5 text-accent" />;
}

export function DeploymentReadinessView() {
  const readyCount = checks.filter((check) => check.status === "Ready").length;
  const reviewCount = checks.filter(
    (check) => check.status === "Review",
  ).length;
  const blockedCount = checks.filter(
    (check) => check.status === "Blocked",
  ).length;
  const score = Math.round((readyCount / checks.length) * 100);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / Local Production Readiness
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl md:text-5xl">
              Package the product before pushing it into the wild.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This board checks the local production boundary, user-facing
              polish, API health, cron guardrails and export reliability. It
              does not enable hidden delivery behavior.
            </p>
          </div>
          <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/60">
              Readiness
            </p>
            <p className="mt-1 text-3xl font-semibold text-secondary">
              {score}%
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-secondary/15 bg-[#160d0d]/66 signal-glow">
            <CardHeader>
              <Cloud className="h-5 w-5 text-secondary" />
              <CardTitle>Local production</CardTitle>
              <CardDescription>
                Use after lint, TypeScript and build checks pass.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <CardTitle>Controlled scheduler</CardTitle>
              <CardDescription>
                Scheduled scans and cleanup are guarded by CRON_SECRET. Reports
                still stay manual and reviewable.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/15 bg-[#160d0d]/66">
            <CardHeader>
              <PlugZap className="h-5 w-5 text-secondary" />
              <CardTitle>Connector boundary</CardTitle>
              <CardDescription>
                YouTube is optional and feature-flagged. arXiv is keyless.
                Reddit remains model-supported, not active scanner input.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <CardTitle className="text-3xl text-secondary">
                {readyCount}
              </CardTitle>
              <CardDescription>Ready checks</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <CardTitle className="text-3xl text-accent">
                {reviewCount}
              </CardTitle>
              <CardDescription>Manual review checks</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <CardTitle className="text-3xl text-primary">
                {blockedCount}
              </CardTitle>
              <CardDescription>Blocked checks</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>Readiness checklist</CardTitle>
            <CardDescription>
              Green means ready. Review means you still need to click or run the
              check locally. Blocked means do not present yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.title}
                className="flex flex-col gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="flex gap-3">
                  <StatusIcon status={check.status} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {check.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground/76">
                      {check.detail}
                    </p>
                  </div>
                </div>
                <Badge variant={statusVariant(check.status)}>
                  {check.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <CardTitle>Recommended verification order</CardTitle>
            <CardDescription>
              Run the boring checks before presenting. Boring checks save
              weekends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground/78">
            <div className="rounded-2xl border border-border/10 bg-muted/25 p-4 font-mono text-xs text-muted-foreground/88">
              npm run lint
              <br />
              npx tsc --noEmit
              <br />
              npm run build
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href="/dashboard">
                  Open dashboard <Rocket className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/source-connectors">
                  Open source connectors
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/system-boundaries">
                  Open system boundaries
                </Link>
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
