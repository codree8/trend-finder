import Link from "next/link";
import { Ban, CheckCircle2, FileText, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const removedItems = [
  "Daily Brief scheduled delivery",
  "internal email test preparation",
  "recipient/provider configuration",
  "manual approval send workflow",
  "automation dry-run email preview",
  "Vercel scheduled scan config",
];

const keptItems = [
  "Manual scan button and /api/scan",
  "manual report exports",
  "PDF, HTML, JSON and print-ready views",
  "local report history",
  "Admin scoring and deployment diagnostics",
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
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Email delivery and scheduling are intentionally removed.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Trend Finder is staying local/manual for now. This page is the boundary note: no auth, no background delivery, no scheduled report sending, and no hidden “enable live” switch.
            </p>
          </div>
          <Badge variant="danger">Automation disabled by product decision</Badge>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-primary/20 bg-primary/10">
            <CardHeader>
              <Ban className="h-5 w-5 text-primary" />
              <CardTitle>No email feature</CardTitle>
              <CardDescription>
                The app no longer exposes email test, recipient, provider, or delivery workflow UI.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/20 bg-primary/10">
            <CardHeader>
              <Trash2 className="h-5 w-5 text-primary" />
              <CardTitle>No scheduled jobs</CardTitle>
              <CardDescription>
                Vercel scheduling config is removed from the packaged changes. Manual scans remain available.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/20 bg-secondary/10">
            <CardHeader>
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <CardTitle>Manual-only exports</CardTitle>
              <CardDescription>
                Reports are generated and opened by the user. Nothing is sent or scheduled from the app.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <CardTitle>Removed from the product surface</CardTitle>
              <CardDescription>These concepts should not appear in the user-facing UI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {removedItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3 text-sm text-muted-foreground/78">
                  <Ban className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <CardTitle>Still available</CardTitle>
              <CardDescription>These parts remain safe for a local/manual product flow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {keptItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/35 p-3 text-sm text-muted-foreground/78">
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
              Product pages should answer: what matters, what should I do, what can I export? Admin pages should answer: why did the system rank it this way, is it ready to deploy, what boundary is enforced?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/daily-brief">Open simplified Daily Brief</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/scoring-lab">Open Scoring Lab</Link>
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
