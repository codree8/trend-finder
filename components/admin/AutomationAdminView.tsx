import Link from "next/link";
import { Ban, CheckCircle2, FileText, ShieldCheck, Trash2 } from "lucide-react";
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
    detail: "There are no send, test-send, recipients, provider settings or outbound delivery controls.",
  },
  {
    title: "No cron",
    detail: "There is no scheduled job surface. Scans and exports stay user-initiated.",
  },
  {
    title: "No auth",
    detail: "The product does not require login, registration, middleware or protected routes.",
  },
  {
    title: "No background automation",
    detail: "Nothing runs silently after approval. The user opens, copies or exports reports manually.",
  },
  {
    title: "Local-first mode",
    detail: "Preferences, watchlist state and report history stay in the browser for now.",
  },
  {
    title: "Manual scan/report workflow",
    detail: "The supported flow is scan, review, save, brief, export and present.",
  },
];

const keptItems = [
  "Manual scan button and /api/scan",
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
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Trend Finder is local-first and manual-only.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This page documents what the product intentionally does not do, so
              the local workflow stays honest and easy to explain.
            </p>
          </div>
          <Badge variant="danger">Boundary enforced</Badge>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-primary/20 bg-primary/10">
            <CardHeader>
              <Ban className="h-5 w-5 text-primary" />
              <CardTitle>No email delivery</CardTitle>
              <CardDescription>
                No send buttons, no recipients and no provider setup screens are
                part of this build.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/20 bg-primary/10">
            <CardHeader>
              <Trash2 className="h-5 w-5 text-primary" />
              <CardTitle>No cron or background jobs</CardTitle>
              <CardDescription>
                The app does not schedule scans, reports or follow-up delivery in
                the background.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-secondary/20 bg-secondary/10">
            <CardHeader>
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <CardTitle>Manual-first workflow</CardTitle>
              <CardDescription>
                Users scan, inspect, save, brief and export through visible
                product screens.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/10 bg-[#160d0d]/62">
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
                    <Ban className="h-4 w-4 text-primary" />
                    {item.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground/72">
                    {item.detail}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <CardTitle>Still available</CardTitle>
              <CardDescription>
                These parts remain safe for a local/manual product flow.
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
              exported. Admin pages explain how the system was calibrated and
              which boundaries are enforced.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/daily-brief">Open Daily Brief</Link>
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
