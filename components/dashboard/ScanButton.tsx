"use client";

import { useState } from "react";
import { Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanState = "idle" | "loading" | "success" | "error";

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
        body: JSON.stringify({ windowDays: 7 }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "Scan failed");
      }

      setState("success");
      setMessage(`${data.totalSignals ?? 0} live signals scanned`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Scan failed");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message ? (
        <span
          className={`hidden text-xs md:inline ${state === "error" ? "text-primary" : "text-secondary"}`}
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
