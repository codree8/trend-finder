"use client";

import { useState } from "react";
import { Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanState = "idle" | "loading" | "success" | "error";

type ScanApiResponse = {
  ok?: boolean;
  message?: string;
  totalSignals?: number;
  topicCount?: number;
  persistence?: {
    storedSignals?: number;
    storedTopics?: number;
    storedSnapshots?: number;
  };
};

export const TREND_SCAN_COMPLETED_EVENT = "trend-finder:scan-completed";

export function ScanButton() {
  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleScan() {
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowDays: 30 }),
      });
      const data = (await response.json()) as ScanApiResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Scan failed");
      }

      const storedSignals =
        data.persistence?.storedSignals ?? data.totalSignals ?? 0;
      const storedTopics =
        data.persistence?.storedTopics ?? data.topicCount ?? 0;
      const storedSnapshots = data.persistence?.storedSnapshots ?? 0;

      setState("success");
      setMessage(
        `Scan completed: ${storedSignals} signals, ${storedTopics} topic clusters, ${storedSnapshots} snapshots created.`,
      );

      window.dispatchEvent(
        new CustomEvent(TREND_SCAN_COMPLETED_EVENT, {
          detail: {
            storedSignals,
            storedTopics,
            storedSnapshots,
          },
        }),
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Scan failed");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <span
          className={`hidden max-w-[520px] truncate text-xs md:inline ${state === "error" ? "text-primary" : "text-secondary"}`}
          title={message}
        >
          {message}
        </span>
      ) : null}
      <Button size="sm" onClick={handleScan} disabled={state === "loading"}>
        {state === "loading" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Radar className="mr-2 h-4 w-4" />
        )}
        Scan Trends Now
      </Button>
    </div>
  );
}
