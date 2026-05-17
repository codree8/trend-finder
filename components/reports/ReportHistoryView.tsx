"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clipboard, FileText, History, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProductStateCard } from "@/components/common/ProductStateCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteSavedReport,
  readReportHistory,
  reportHistoryChangedEvent,
  type SavedReportHistoryItem,
} from "@/lib/preferences/report-history";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function ReportHistoryView() {
  const [items, setItems] = useState<SavedReportHistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(() => setItems(readReportHistory()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(reportHistoryChangedEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(reportHistoryChangedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!copiedId) return;
    const timeout = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copiedId]);

  async function copyReport(item: SavedReportHistoryItem) {
    await copyText(item.markdown);
    setCopiedId(item.id);
  }

  function removeReport(item: SavedReportHistoryItem) {
    setItems(deleteSavedReport(item.id));
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Reports / History
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Saved report snapshots in this browser.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              Saved reports are stored locally in this browser. This gives you history for local workflow without adding accounts or server persistence yet.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/reports">Open reports hub</Link>
          </Button>
        </section>

        {items.length === 0 ? (
          <ProductStateCard
            title="No saved reports yet"
            description="Open Reports, load a brief and save a snapshot. The history will appear here for quick copy and review."
            secondaryAction={<Link href="/reports">Go to reports</Link>}
          />
        ) : (
          <Card className="border-border/10 bg-[#160d0d]/62">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                <History className="h-4 w-4" />
                Saved reports
              </div>
              <CardTitle>{items.length} local snapshot{items.length === 1 ? "" : "s"}</CardTitle>
              <CardDescription>
                Local history is useful for pitch prep and manual handoff. Add server-backed history later only when accounts exist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 text-secondary" />
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <Badge variant="muted">{item.window}</Badge>
                        <Badge variant="accent">{item.template}</Badge>
                        <Badge variant="secondary">{item.readinessLabel}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground/76">{item.summary}</p>
                      <p className="mt-2 text-xs text-muted-foreground/55">
                        Generated {formatDate(item.generatedAt)} · Saved {formatDate(item.savedAt)} · {item.sectionCount} sections · {item.blockCount} blocks
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => void copyReport(item)}>
                        <Clipboard className="mr-2 h-4 w-4" />
                        {copiedId === item.id ? "Copied" : "Copy markdown"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeReport(item)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
