import Link from "next/link";

export function PublicSiteFooter() {
  return (
    <footer className="px-3 pb-8 pt-4 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-[28px] border border-border/10 bg-[#160d0d]/72 px-5 py-5 text-sm text-muted-foreground/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-medium text-foreground/90">Trend Finder</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground/68 sm:text-sm">
            A focused AI signal radar for spotting early movement, ranking it with evidence and turning it into usable decisions.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
          <Link href="/demo" className="transition hover:text-foreground">
            How it works
          </Link>
          <Link href="/dashboard" className="transition hover:text-foreground">
            Open app
          </Link>
          <Link href="/reports" className="transition hover:text-foreground">
            Reports
          </Link>
        </div>
      </div>
    </footer>
  );
}
