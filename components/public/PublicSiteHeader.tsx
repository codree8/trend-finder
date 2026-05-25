import Link from "next/link";
import { Radar } from "lucide-react";
import { PublicVisitCounter } from "@/components/public/PublicVisitCounter";
import { Button } from "@/components/ui/button";

export function PublicSiteHeader({
  showVisitCounter = false,
}: {
  showVisitCounter?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[28px] border border-border/10 bg-[#160d0d]/80 px-4 py-3 backdrop-blur-xl sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-radar">
            <Radar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Trend Finder
            </p>
            <p className="truncate text-xs text-muted-foreground/72">
              AI Signal Radar
            </p>
          </div>
        </Link>

        <div className="hidden flex-1 justify-center px-4 md:flex">
          {showVisitCounter ? <PublicVisitCounter /> : null}
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/demo">How it works</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports">Reports</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard">Open app</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {showVisitCounter ? <PublicVisitCounter className="hidden sm:inline-flex" /> : null}
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard">Open app</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
