"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  Database,
  FileText,
  Layers3,
  Link2,
  Loader2,
  Radar,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  clearRecentDashboardSearches,
  dispatchTrendSearchSubmitted,
  getDashboardSearchUrl,
  normalizeTrendSearchQuery,
  readRecentDashboardSearches,
  recordRecentDashboardSearch,
  type DashboardSearchApiResult,
  type DashboardSearchApiSummary,
  type DashboardSearchResponse,
  type DashboardSearchResultKind,
  type DashboardSearchScope,
} from "@/lib/search/dashboard-search";
import { readProductPreferences } from "@/lib/preferences/product-preferences";
import type { DashboardWindow } from "@/lib/trends/types";

const scopeOptions: Array<{ value: DashboardSearchScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "trends", label: "Trends" },
  { value: "sources", label: "Sources" },
  { value: "angles", label: "Angles" },
  { value: "evidence", label: "Evidence" },
];

const resultKindConfig: Record<
  DashboardSearchResultKind,
  { label: string; icon: typeof Radar }
> = {
  trend: { label: "Trend", icon: Radar },
  source: { label: "Source", icon: Link2 },
  angle: { label: "Angle", icon: Sparkles },
  evidence: { label: "Evidence", icon: FileText },
};

const emptySummary: DashboardSearchApiSummary = {
  total: 0,
  topCategory: null,
  topSource: null,
  bestMatch: null,
};

export function SearchCommandPalette({
  open,
  initialQuery,
  onOpenChange,
  onQueryChange,
}: {
  open: boolean;
  initialQuery?: string;
  onOpenChange: (open: boolean) => void;
  onQueryChange?: (query: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [scope, setScope] = useState<DashboardSearchScope>("all");
  const [results, setResults] = useState<DashboardSearchApiResult[]>([]);
  const [summary, setSummary] = useState<DashboardSearchApiSummary>(emptySummary);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    setQuery(initialQuery ?? "");
    setRecentSearches(readRecentDashboardSearches());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialQuery, open]);

  const normalizedQuery = normalizeTrendSearchQuery(query);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, 15000);
    const debounceId = window.setTimeout(
      () => {
        async function loadServerSearch() {
          setIsLoading(true);
          setError(null);

          try {
            const preferredWindow = readProductPreferences().defaultBriefWindow;
            const windowValue: DashboardWindow = preferredWindow ?? "7d";
            const params = new URLSearchParams({
              window: windowValue,
              scope,
              limit: "18",
            });

            if (normalizedQuery) {
              params.set("q", normalizedQuery);
            }

            const response = await fetch(`/api/search?${params.toString()}`, {
              cache: "no-store",
              signal: controller.signal,
            });
            const contentType = response.headers.get("content-type") ?? "";
            const payload = contentType.includes("application/json")
              ? await response.json()
              : null;

            if (!response.ok || !payload?.ok) {
              if (response.status === 401 || response.status === 403) {
                throw new Error(
                  "Search needs demo access. Refresh the app or enter the access code again.",
                );
              }

              throw new Error(
                payload?.message ?? "Search database is not available yet.",
              );
            }

            const searchPayload = payload as DashboardSearchResponse;
            setResults(searchPayload.results);
            setSummary(searchPayload.summary);
            setSuggestions(searchPayload.suggestions);
          } catch (loadError) {
            if (controller.signal.aborted) {
              if (didTimeout) {
                setError(
                  "Search database took too long to respond. Close search and try again.",
                );
              }
              return;
            }

            setResults([]);
            setSummary(emptySummary);
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Search database is not available yet.",
            );
          } finally {
            window.clearTimeout(timeoutId);
            setIsLoading(false);
          }
        }

        void loadServerSearch();
      },
      normalizedQuery ? 260 : 0,
    );

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(debounceId);
      controller.abort();
    };
  }, [normalizedQuery, open, scope]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "Escape" && open) {
        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
        return;
      }

      if (event.key === "/" && !isTypingTarget && !open) {
        event.preventDefault();
        onOpenChange(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  const groupedResults = useMemo(() => groupResultsByKind(results), [results]);

  const updateQuery = useCallback(
    (value: string) => {
      setQuery(value);
      onQueryChange?.(value);
    },
    [onQueryChange],
  );

  const runSearch = useCallback(
    (value: string, trendSlug?: string | null) => {
      const normalizedValue = normalizeTrendSearchQuery(value);
      if (!normalizedValue && !trendSlug) return;

      recordRecentDashboardSearch(normalizedValue || value);
      setRecentSearches(readRecentDashboardSearches());
      onOpenChange(false);
      dispatchTrendSearchSubmitted(normalizedValue || value, trendSlug);
      router.push(getDashboardSearchUrl(normalizedValue || value, trendSlug));
    },
    [onOpenChange, router],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/72 p-3 backdrop-blur-xl sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close search"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-secondary/15 bg-[#160d0d]/96 shadow-radar signal-glow sm:max-h-[calc(100dvh-3rem)]">
        <div className="border-b border-border/10 p-4 sm:p-5">
          <div className="flex items-center gap-3 rounded-2xl border border-border/10 bg-[#0f0808]/58 px-4 py-3 focus-within:border-secondary/35">
            <Search className="h-5 w-5 shrink-0 text-secondary" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const firstResult = results[0];
                  runSearch(
                    firstResult?.query ?? normalizedQuery,
                    firstResult?.trend.slug,
                  );
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/55"
              placeholder="Search trends, sources, evidence, angles..."
              aria-label="Search Trend Finder"
            />
            {isLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-secondary" />
            ) : null}
            {query ? (
              <button
                type="button"
                onClick={() => updateQuery("")}
                className="rounded-full p-1 text-muted-foreground/55 transition hover:bg-muted hover:text-foreground"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 text-muted-foreground/55 transition hover:bg-muted hover:text-foreground"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {scopeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScope(option.value)}
                className={
                  option.value === scope
                    ? "rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                    : "rounded-full border border-border/10 bg-card/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground/74 transition hover:border-secondary/30 hover:text-foreground"
                }
              >
                {option.label}
              </button>
            ))}
            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-border/10 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground/65 sm:inline-flex">
              <Database className="h-3.5 w-3.5 text-secondary" />
              Server search · Ctrl K · /
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {error ? (
            <SearchEmptyState
              title="Search database is not ready"
              description={error}
            />
          ) : normalizedQuery ? (
            results.length > 0 ? (
              <div className="space-y-5">
                <SearchInsightSummary summary={summary} query={normalizedQuery} />
                {groupedResults.map((group) => (
                  <section key={group.kind} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-fit">
                          {resultKindConfig[group.kind].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground/62">
                          {group.items.length} match
                          {group.items.length === 1 ? "" : "es"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((result) => (
                        <SearchResultButton
                          key={result.id}
                          result={result}
                          query={normalizedQuery}
                          onSelect={() =>
                            runSearch(result.query, result.trend.slug)
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : isLoading ? (
              <SearchLoadingState message="Searching the radar database..." />
            ) : (
              <SearchEmptyState
                title={`No results for “${normalizedQuery}”`}
                description="Try a category, source name, repo keyword, content angle or a shorter phrase."
              />
            )
          ) : isLoading && suggestions.length === 0 ? (
            <SearchLoadingState message="Loading server-side radar suggestions..." />
          ) : (
            <SearchStartState
              recentSearches={recentSearches}
              suggestions={suggestions}
              onRunSearch={(value) => runSearch(value)}
              onSetQuery={updateQuery}
              onClearRecent={() => {
                clearRecentDashboardSearches();
                setRecentSearches([]);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SearchInsightSummary({
  query,
  summary,
}: {
  query: string;
  summary: DashboardSearchApiSummary;
}) {
  return (
    <div className="rounded-3xl border border-secondary/15 bg-secondary/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
            Database search active
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
            {summary.total} ranked result{summary.total === 1 ? "" : "s"} for “
            {query}”
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground/76">
            Ranked on the server from the current radar window across trend names,
            aliases, sources, evidence titles and content angles.
          </p>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground/72 sm:min-w-56">
          {summary.bestMatch ? (
            <span className="rounded-full border border-border/10 bg-card/45 px-3 py-1.5">
              Best: {summary.bestMatch.title}
            </span>
          ) : null}
          {summary.topCategory ? (
            <span className="rounded-full border border-border/10 bg-card/45 px-3 py-1.5">
              Category: {summary.topCategory}
            </span>
          ) : null}
          {summary.topSource ? (
            <span className="rounded-full border border-border/10 bg-card/45 px-3 py-1.5">
              Source: {summary.topSource}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SearchResultButton({
  result,
  query,
  onSelect,
}: {
  result: DashboardSearchApiResult;
  query: string;
  onSelect: () => void;
}) {
  const Icon = resultKindConfig[result.kind].icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full rounded-2xl border border-border/10 bg-[#0f0808]/42 p-4 text-left transition hover:border-secondary/30 hover:bg-secondary/10"
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted" className="w-fit">
              {result.badge}
            </Badge>
            <span className="text-xs text-muted-foreground/62">
              {result.metadata}
            </span>
          </div>
          <h4 className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-foreground">
            <HighlightedText text={result.title} query={query} />
          </h4>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground/76">
            <HighlightedText text={result.description} query={query} />
          </p>
          {result.matchedFields.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.matchedFields.map((field) => (
                <span
                  key={field}
                  className="rounded-full border border-border/10 bg-card/45 px-2 py-1 text-[11px] text-muted-foreground/64"
                >
                  {field}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-secondary opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
    </button>
  );
}

function SearchStartState({
  recentSearches,
  suggestions,
  onRunSearch,
  onSetQuery,
  onClearRecent,
}: {
  recentSearches: string[];
  suggestions: string[];
  onRunSearch: (query: string) => void;
  onSetQuery: (query: string) => void;
  onClearRecent: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <QuickSearchCard
          icon={Database}
          title="Server-side search"
          description="Query the current radar database instead of relying only on the browser index."
        />
        <QuickSearchCard
          icon={Link2}
          title="Trace sources"
          description="Search GitHub, HN, RSS, arXiv or other source labels."
        />
        <QuickSearchCard
          icon={Sparkles}
          title="Find angles"
          description="Look up creator hooks, startup angles and action recommendations."
        />
      </div>

      {recentSearches.length > 0 ? (
        <section className="rounded-3xl border border-border/10 bg-[#0f0808]/34 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-secondary" />
              <p className="text-sm font-semibold text-foreground">
                Recent searches
              </p>
            </div>
            <button
              type="button"
              onClick={onClearRecent}
              className="text-xs text-muted-foreground/62 transition hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onRunSearch(item)}
                className="rounded-full border border-border/10 bg-card/45 px-3 py-1.5 text-xs font-medium text-muted-foreground/76 transition hover:border-secondary/30 hover:text-foreground"
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-border/10 bg-[#0f0808]/34 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-secondary" />
          <p className="text-sm font-semibold text-foreground">
            Suggested searches
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(suggestions.length ? suggestions : fallbackSuggestions).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSetQuery(item)}
                className="rounded-full border border-border/10 bg-card/45 px-3 py-1.5 text-xs font-medium text-muted-foreground/76 transition hover:border-secondary/30 hover:text-foreground"
              >
                {item}
              </button>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function QuickSearchCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Search;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/10 bg-[#0f0808]/34 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground/72">
        {description}
      </p>
    </div>
  );
}

function SearchLoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground/70">
      <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      {message}
    </div>
  );
}

function SearchEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-border/10 bg-[#0f0808]/34 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
        <Search className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground/72">
        {description}
      </p>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const terms = normalizeTrendSearchQuery(query)
    .split(" ")
    .filter((term) => term.length > 1)
    .map(escapeRegExp);

  if (terms.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const isMatch = terms.some(
          (term) =>
            part.toLowerCase() === term.replace(/\\/g, "").toLowerCase(),
        );

        return isMatch ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-secondary/25 px-1 text-secondary"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

function groupResultsByKind(results: DashboardSearchApiResult[]) {
  const groups: Array<{
    kind: DashboardSearchResultKind;
    items: DashboardSearchApiResult[];
  }> = [];

  for (const kind of ["trend", "source", "angle", "evidence"] as const) {
    const items = results.filter((result) => result.kind === kind).slice(0, 5);
    if (items.length > 0) groups.push({ kind, items });
  }

  return groups;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const fallbackSuggestions = [
  "agents",
  "automation",
  "coding",
  "local llm",
  "github",
  "research",
  "content gaps",
  "open source",
];
