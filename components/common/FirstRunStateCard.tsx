import Link from "next/link";
import type { ReactNode } from "react";
import { Database, PlayCircle, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FirstRunStateCardProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function FirstRunStateCard({
  title = "Database is not configured yet",
  description = "Trend Finder needs DATABASE_URL before it can read scans, watchlist items, Daily Briefs or reports.",
  onRetry,
}: FirstRunStateCardProps) {
  return (
    <Card className="border-secondary/20 bg-secondary/10 shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-secondary/15 p-3 text-secondary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                {description}
              </CardDescription>
            </div>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button asChild size="sm" variant="secondary">
              <Link href="/settings">
                <Settings2 className="mr-2 h-4 w-4" />
                Open settings
              </Link>
            </Button>
            {onRetry ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetry}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SetupStep
            label="1"
            title="Add DATABASE_URL"
            detail="Create .env.local in the project root and add your Neon/PostgreSQL connection string."
          />
          <SetupStep
            label="2"
            title="Run migrations"
            detail="Run npm run db:migrate so Drizzle creates the Trend Finder tables."
          />
          <SetupStep
            label="3"
            title="Run first scan"
            detail="Use Scan Trends Now on the dashboard after the database is ready."
          />
          <SetupStep
            label="4"
            title="Review output"
            detail="Return to Dashboard, Watchlist, Daily Brief and Reports after the first scan."
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function NoScanStateCard({
  title = "No scan data yet",
  description = "Run the first scan from the dashboard. After that, Trend Finder can build the radar, action queue, Daily Brief and reports.",
  primaryAction,
  secondaryAction,
}: {
  title?: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <Card className="border-border/10 bg-card/70 shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-secondary/15 p-3 text-secondary">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                {description}
              </CardDescription>
            </div>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            {primaryAction ?? (
              <Button asChild size="sm" variant="secondary">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            )}
            {secondaryAction ?? (
              <Button asChild size="sm" variant="outline">
                <Link href="/settings">Review settings</Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function SetupStep({
  label,
  title,
  detail,
}: {
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
      <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary">
        {label}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground/70">
        {detail}
      </p>
    </div>
  );
}
