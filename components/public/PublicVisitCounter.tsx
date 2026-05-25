"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type VisitCounterResponse = {
  ok?: boolean;
  total?: number;
  error?: string;
};

const VISIT_SESSION_KEY = "trend_finder_landing_visit_counted";
const POLL_INTERVAL_MS = 30_000;

function formatCompactCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

async function readVisitTotal(args?: { increment?: boolean; signal?: AbortSignal }) {
  const response = await fetch("/api/visits", {
    method: args?.increment ? "POST" : "GET",
    headers: args?.increment ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
    signal: args?.signal,
  });

  const payload = (await response.json().catch(() => null)) as VisitCounterResponse | null;

  if (!response.ok || !payload?.ok || typeof payload.total !== "number") {
    throw new Error(payload?.error ?? "VISIT_COUNTER_UNAVAILABLE");
  }

  return payload.total;
}

export function PublicVisitCounter({ className }: { className?: string }) {
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const label = useMemo(() => {
    if (status === "loading") return "Counting visits";
    if (status === "error" || total === null) return "Visits unavailable";
    return `${formatCompactCount(total)} total visits`;
  }, [status, total]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function syncCounter() {
      try {
        const hasCountedThisSession =
          typeof window !== "undefined" &&
          window.sessionStorage.getItem(VISIT_SESSION_KEY) === "1";

        const nextTotal = await readVisitTotal({
          increment: !hasCountedThisSession,
          signal: controller.signal,
        });

        if (!hasCountedThisSession && typeof window !== "undefined") {
          window.sessionStorage.setItem(VISIT_SESSION_KEY, "1");
        }

        if (!mounted) return;
        setTotal(nextTotal);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        setStatus("error");
      }
    }

    void syncCounter();

    const intervalId = window.setInterval(() => {
      void readVisitTotal({ signal: controller.signal })
        .then((nextTotal) => {
          if (!mounted) return;
          setTotal(nextTotal);
          setStatus("ready");
        })
        .catch(() => {
          if (controller.signal.aborted || !mounted) return;
          setStatus("error");
        });
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1.5 text-xs font-medium text-secondary shadow-[0_0_24px_rgba(221,169,54,0.08)]",
        status === "error" && "border-border/10 bg-muted/35 text-muted-foreground/70",
        className,
      )}
      title="Total landing page sessions counted through the production database."
    >
      <span className="relative flex h-2 w-2">
        {status === "ready" ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-40" />
        ) : null}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
      </span>
      <Eye className="h-3.5 w-3.5" />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}
