"use client";

import { useState } from "react";
import { Loader2, Radar } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AiCategory } from "@/lib/config/ai-categories";
import type { ScanMode } from "@/lib/config/scan-keyword-limits";

type ScanState = "idle" | "loading" | "success" | "error";

type ScanApiResponse = {
  ok?: boolean;
  message?: string;
  scanMode?: ScanMode;
  scanModeLabel?: string;
  selectedCategory?: string | null;
  keywordCount?: number;
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

type ScanCompletedEventDetail = {
  fetchedSignals: number;
  insertedSignals: number;
  skippedDuplicates: number;
  topicClusters: number;
  snapshotsCreated: number;
  scanMode?: ScanMode;
  scanModeLabel?: string;
  selectedCategory?: string | null;
  keywordCount?: number;
};

type ScanButtonProps = {
  scanMode?: ScanMode;
  category?: AiCategory | null;
  windowDays?: number;
  label?: string;
  loadingLabel?: string;
  showMessage?: boolean;
  messageClassName?: string;
  onScanComplete?: (detail: ScanCompletedEventDetail) => void;
} & Pick<ButtonProps, "size" | "variant" | "className">;

export const TREND_SCAN_COMPLETED_EVENT = "trend-finder:scan-completed";

function defaultScanLabel(scanMode: ScanMode, category?: AiCategory | null) {
  if (scanMode === "deep" && category) return `Deep scan ${category}`;
  if (scanMode === "category" && category) return `Scan ${category}`;

  return "Scan Trends Now";
}

export function ScanButton({
  scanMode = "balanced",
  category = null,
  windowDays = 30,
  label,
  loadingLabel = "Scanning",
  showMessage = true,
  messageClassName,
  onScanComplete,
  size = "sm",
  variant = "default",
  className,
}: ScanButtonProps = {}) {
  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleScan() {
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          windowDays,
          scanMode,
          ...(category ? { category } : {}),
        }),
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
      const scanLabel = data.scanModeLabel ?? defaultScanLabel(scanMode, category);
      const keywordText = data.keywordCount
        ? ` across ${data.keywordCount} scan keywords`
        : "";
      const successMessage =
        data.scanSummary?.message ??
        `${scanLabel} completed: ${fetchedSignals} signals checked${keywordText}, ${insertedSignals} new, ${skippedDuplicates} duplicates filtered, ${topicClusters} topics grouped, ${snapshotsCreated} trend updates prepared.`;

      const detail: ScanCompletedEventDetail = {
        fetchedSignals,
        insertedSignals,
        skippedDuplicates,
        topicClusters,
        snapshotsCreated,
        scanMode: data.scanMode,
        scanModeLabel: data.scanModeLabel,
        selectedCategory: data.selectedCategory,
        keywordCount: data.keywordCount,
      };

      setState("success");
      setMessage(successMessage);
      onScanComplete?.(detail);

      window.dispatchEvent(
        new CustomEvent(TREND_SCAN_COMPLETED_EVENT, { detail }),
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Scan failed");
    }
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showMessage && message ? (
        <span
          className={cn(
            "hidden max-w-[520px] truncate text-xs md:inline",
            state === "error" ? "text-primary" : "text-secondary",
            messageClassName,
          )}
          title={message}
        >
          {message}
        </span>
      ) : null}
      <Button size={size} variant={variant} onClick={handleScan} disabled={state === "loading"}>
        {state === "loading" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Radar className="mr-2 h-4 w-4" />
        )}
        {state === "loading" ? loadingLabel : (label ?? defaultScanLabel(scanMode, category))}
      </Button>
    </div>
  );
}
