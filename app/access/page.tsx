import Link from "next/link";
import { LockKeyhole, Radar, ShieldCheck } from "lucide-react";
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
import { normalizeReturnTo } from "@/lib/access/session";

export const dynamic = "force-dynamic";

type AccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const params = (await searchParams) ?? {};
  const returnTo = normalizeReturnTo(firstParam(params.from));
  const required = firstParam(params.required);
  const hasInvalidCode = firstParam(params.error) === "invalid";
  const hasMissingConfig = firstParam(params.configuration) === "missing";
  const wasDenied = firstParam(params.denied) === "1";

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,192,125,0.12),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(154,40,106,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 radar-grid opacity-70" />

      <div className="relative">
        <PublicSiteHeader />

        <section className="px-3 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="rounded-[32px] border border-secondary/15 bg-[#160d0d]/78 p-6 shadow-radar signal-glow sm:p-8 lg:p-10">
              <Badge variant="accent" className="w-fit">
                Controlled access
              </Badge>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.065em] sm:text-5xl">
                Enter the demo code to explore the radar.
              </h1>
              <p className="mt-5 text-sm leading-7 text-muted-foreground/80 sm:text-base">
                The landing page and explainer are public. The live radar is protected so public visitors can review the product without opening scan, admin or write operations to the internet.
              </p>
              <div className="mt-8 grid gap-3 text-sm leading-6 text-muted-foreground/78">
                <div className="flex gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/34 p-4">
                  <Radar className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <span>Demo access opens the product experience and read/export flows.</span>
                </div>
                <div className="flex gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/34 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <span>Admin access is required for manual scans, admin pages and write operations.</span>
                </div>
              </div>
            </div>

            <Card className="border-border/10 bg-[#160d0d]/76">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl tracking-[-0.04em]">
                  Access code
                </CardTitle>
                <CardDescription>
                  Use the shared demo code from the post, or the private admin password if you are operating the app.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasMissingConfig ? (
                  <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-primary-foreground">
                    APP_ACCESS_SECRET is not configured. Add APP_ACCESS_SECRET, DEMO_ACCESS_CODE and ADMIN_ACCESS_PASSWORD to your environment before deploying.
                  </div>
                ) : null}
                {hasInvalidCode ? (
                  <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-primary-foreground">
                    That access code was not accepted. Check the code and try again.
                  </div>
                ) : null}
                {wasDenied ? (
                  <div className="mb-4 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm leading-6 text-secondary">
                    {required === "admin"
                      ? "This area requires admin access."
                      : "This area requires demo access."}
                  </div>
                ) : null}

                <form action="/api/access" method="post" className="space-y-4">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className="block text-sm font-medium text-foreground">
                    Demo code or admin password
                    <input
                      name="code"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="mt-2 h-12 w-full rounded-2xl border border-border/15 bg-[#0f0808]/55 px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground/45 focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20"
                      placeholder="Enter access code"
                    />
                  </label>
                  <Button type="submit" size="lg" variant="secondary" className="w-full">
                    Continue
                  </Button>
                </form>

                <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground/70">
                  <Link href="/" className="transition hover:text-foreground">
                    Back to landing
                  </Link>
                  <Link href="/demo" className="transition hover:text-foreground">
                    View explainer
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <PublicSiteFooter />
      </div>
    </main>
  );
}
