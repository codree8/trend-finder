"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Radar, Search, ShieldCheck, X } from "lucide-react";
import { ScanButton } from "@/components/dashboard/ScanButton";
import { Button } from "@/components/ui/button";
import {
  dispatchTrendSearchSubmitted,
  getDashboardSearchUrl,
  normalizeTrendSearchQuery,
  readDashboardSearchQueryFromUrl,
  TREND_SEARCH_SUBMITTED_EVENT,
  type TrendSearchSubmittedDetail,
} from "@/lib/search/dashboard-search";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    function syncFromUrl() {
      if (window.location.pathname !== "/dashboard") {
        setQuery("");
        return;
      }

      setQuery(readDashboardSearchQueryFromUrl(window.location.search));
    }

    function handleSearchSubmitted(event: Event) {
      const customEvent = event as CustomEvent<TrendSearchSubmittedDetail>;
      setQuery(customEvent.detail.query);
    }

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener(TREND_SEARCH_SUBMITTED_EVENT, handleSearchSubmitted);

    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener(
        TREND_SEARCH_SUBMITTED_EVENT,
        handleSearchSubmitted,
      );
    };
  }, [pathname]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedQuery = normalizeTrendSearchQuery(query);
    const targetUrl = getDashboardSearchUrl(normalizedQuery);

    router.push(targetUrl);
    dispatchTrendSearchSubmitted(normalizedQuery);
  }

  function handleClearSearch() {
    setQuery("");
    router.push("/dashboard");
    dispatchTrendSearchSubmitted("");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/10 bg-[#241616]/82 backdrop-blur-xl lg:bg-[#241616]/72">
      <div className="mx-auto flex min-h-16 w-full max-w-[1500px] items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:h-16 lg:px-8 lg:py-0">
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Open navigation"
            onClick={onOpenMobileNav}
            className="shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-radar">
              <Radar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                Trend Finder
              </p>
              <p className="truncate text-[11px] text-muted-foreground/65">
                AI Signal Radar
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="hidden min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border/10 bg-card/50 px-4 py-2 transition focus-within:border-secondary/35 focus-within:bg-card/70 md:flex"
          role="search"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
            placeholder="Search trends, repos, sources, content angles..."
            aria-label="Search trends"
          />
          {query ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-full p-1 text-muted-foreground/55 transition hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </form>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1.5 text-xs text-secondary md:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            English-only signal scan
          </div>
          <ScanButton className="max-sm:h-9 max-sm:px-3 max-sm:text-xs" />
        </div>
      </div>

      <div className="px-3 pb-3 sm:px-5 md:hidden">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 rounded-2xl border border-border/10 bg-card/50 px-4 py-2 transition focus-within:border-secondary/35 focus-within:bg-card/70"
          role="search"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
            placeholder="Search trends..."
            aria-label="Search trends"
          />
          {query ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-full p-1 text-muted-foreground/55 transition hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </form>
      </div>
    </header>
  );
}
