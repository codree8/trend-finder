"use client";

import { useState } from "react";
import { Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanState = "idle" | "loading" | "success" | "error";

type ScanApiResponse = {
  ok?: boolean;
  message?: string;
  totalSignals?: number;
  fetchedSignals?: number;
  insertedSignals?: number;
  skippedDuplicates?: number;
  topicCount?: number;
  topicClusters?: number;
  snapshotsCreated?: number;
  scanSummary?: {
    message?: string;
    fetchedSignals?: number;
    insertedSignals?: number;
    skippedDuplicates?: number;
    topicClusters?: number;
    snapshotsCreated?: number;
  };
  persistence?: {
    storedSignals?: number;
    storedTopics?: number;
    storedSnapshots?: number;
    insertedSignals?: number;
    skippedDuplicates?: number;
    topicClusters?: number;
    snapshotsCreated?: number;
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

      const fetchedSignals =
        data.scanSummary?.fetchedSignals ??
        data.fetchedSignals ??
        data.totalSignals ??
        0;
      const insertedSignals =
        data.scanSummary?.insertedSignals ??
        data.insertedSignals ??
        data.persistence?.insertedSignals ??
        data.persistence?.storedSignals ??
        0;
      const skippedDuplicates =
        data.scanSummary?.skippedDuplicates ??
        data.skippedDuplicates ??
        data.persistence?.skippedDuplicates ??
        0;
      const topicClusters =
        data.scanSummary?.topicClusters ??
        data.topicClusters ??
        data.persistence?.topicClusters ??
        data.persistence?.storedTopics ??
        data.topicCount ??
        0;
      const snapshotsCreated =
        data.scanSummary?.snapshotsCreated ??
        data.snapshotsCreated ??
        data.persistence?.snapshotsCreated ??
        data.persistence?.storedSnapshots ??
        0;
      const successMessage =
        data.scanSummary?.message ??
        `Scan completed: ${fetchedSignals} fetched, ${insertedSignals} inserted, ${skippedDuplicates} duplicates skipped, ${topicClusters} topic clusters, ${snapshotsCreated} snapshots created.`;

      setState("success");
      setMessage(successMessage);

      window.dispatchEvent(
        new CustomEvent(TREND_SCAN_COMPLETED_EVENT, {
          detail: {
            fetchedSignals,
            insertedSignals,
            skippedDuplicates,
            topicClusters,
            snapshotsCreated,
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
