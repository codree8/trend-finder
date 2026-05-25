import Link from "next/link";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  DatabaseZap,
  FileText,
  LockKeyhole,
  ShieldCheck,
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

const boundaryItems = [
  {
    title: "No email delivery",
    detail:
      "There are no send, test-send, recipients, provider settings or outbound delivery controls.",
  },
  {
    title: "Protected cron only",
    detail:
      "Cron is limited to scheduled scan refresh and retention cleanup through internal endpoints guarded by CRON_SECRET.",
  },
  {
    title: "Lightweight access gate",
    detail:
      "The app uses demo/admin access codes instead of a full user-account system. Demo users can review the product; admin-only routes control scan and QA operations.",
  },
  {
    title: "No background report delivery",
    detail:
      "Scheduled jobs do not email, publish, forward or deliver reports. Users still open, copy or export reports manually.",
  },
  {
    title: "Local-first preferences",
    detail:
      "Preferences and report history stay in the browser for now. Watchlist and scan data use the database.",
  },
  {
    title: "Manual review remains mandatory",
    detail:
      "Cron keeps source data fresh, but the supported product flow is still scan, review, save, brief, export and present.",
  },
];

const cronItems = [
  "POST /api/internal/cron/scan with CRON_SECRET",
  "POST /api/internal/cron/cleanup with CRON_SECRET",
  "GitHub Actions hourly scan workflow",
  "GitHub Actions daily cleanup workflow",
  "Database locks prevent overlapping scheduled jobs",
  "Retention cleanup preserves watchlist and reports",
];

const keptItems = [
  "Manual scan button and /api/scan",
  "Protected scheduled scan endpoint",
  "Protected scheduled retention cleanup endpoint",
  "Manual report exports",
  "PDF, HTML, JSON and print-ready views",
  "Browser-local report history",
  "Admin scoring and readiness diagnostics",
];

export function AutomationAdminView() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / System Boundaries
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl md:text-5xl">
              Trend Finder has controlled scheduled scans, not hidden automation.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This page documents what runs automatically, what remains manual,
              and which production boundaries are still intentionally enforced.
            </p>
          </div>
          <Badge variant="secondary">Cron guarded</Badge>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-secondary/20 bg-secondary/10 signal-glow">
            <CardHeader>
              <CalendarClock className="h-5 w-5 text-secondary" />
              <CardTitle>Scheduled scan refresh</CardTitle>
              <CardDescription>
                GitHub Actions can trigger the protected scan endpoint on a safe
                cadence so the database stays fresh without user clicks.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/20 bg-secondary/10">
            <CardHeader>
              <DatabaseZap className="h-5 w-5 text-secondary" />
              <CardTitle>Daily retention cleanup</CardTitle>
              <CardDescription>
                Old raw signals, mentions, snapshots and scan logs can be
                deleted after the configured retention window.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/20 bg-primary/10">
            <CardHeader>
              <Ban className="h-5 w-5 text-primary" />
              <CardTitle>No email or user automation</CardTitle>
              <CardDescription>
                Cron does not send reports, notify recipients, publish content or
                make decisions on behalf of users.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border/10 bg-[#160d0d]/62 lg:col-span-1">
            <CardHeader>
              <CardTitle>Cron surface</CardTitle>
              <CardDescription>
                These scheduled pieces are now intentionally part of the product.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {cronItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3 text-sm text-muted-foreground/78"
                >
                  <LockKeyhole className="h-4 w-4 text-secondary" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/10 bg-[#160d0d]/62 lg:col-span-1">
            <CardHeader>
              <CardTitle>Current boundaries</CardTitle>
              <CardDescription>
                These limits are intentional and should stay visible in Admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {boundaryItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3"
                >
                  <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-secondary" />
                    {item.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground/72">
                    {item.detail}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/10 bg-[#160d0d]/62 lg:col-span-1">
            <CardHeader>
              <CardTitle>Still available</CardTitle>
              <CardDescription>
                These parts remain safe for a controlled production/demo flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {keptItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3 text-sm text-muted-foreground/78"
                >
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="border-secondary/15 bg-[#160d0d]/62 signal-glow">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <FileText className="h-4 w-4" />
              Product direction
            </div>
            <CardTitle>Keep Product simple, keep Admin diagnostic.</CardTitle>
            <CardDescription>
              Product pages answer what matters, what to do next and what can be
              exported. Admin pages explain how the system was calibrated, how
              cron is guarded and which boundaries are enforced.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/daily-brief">Open Daily Brief</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/source-connectors">Open Source Connectors</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/deployment-readiness">Open Deployment Readiness</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
