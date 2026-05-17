"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clipboard, Mail, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProductStateCard } from "@/components/common/ProductStateCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDailyBriefAutomationInternalEmailTestPrepUrl } from "@/lib/trends/daily-brief-export-links";
import type { DashboardWindow } from "@/lib/trends/types";

const windows: DashboardWindow[] = ["24h", "7d", "30d"];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
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

export function ManualInternalEmailTestView() {
  const [windowValue, setWindowValue] = useState<DashboardWindow>("7d");
  const [recipient, setRecipient] = useState("");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const loadPrep = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(buildDailyBriefAutomationInternalEmailTestPrepUrl(windowValue), {
        cache: "no-store",
      });
      const nextPayload = await response.json();
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.message ?? "Failed to load email prep package.");
      }
      setPayload(asRecord(nextPayload));
    } catch (loadError) {
      setPayload(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load email prep package.");
    } finally {
      setIsLoading(false);
    }
  }, [windowValue]);

  useEffect(() => {
    void loadPrep();
  }, [loadPrep]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const emailPackage = useMemo(() => {
    const prep = asRecord(payload?.prep);
    const preview = asRecord(prep.emailPreview);
    const subject = stringValue(
      preview.subject,
      `Trend Finder internal test brief (${windowValue})`,
    );
    const body = stringValue(
      preview.body,
      `Manual internal review package for the ${windowValue} Daily Brief.\n\nOpen Reports Hub: /reports\nOpen PDF export manually from the app.`,
    );
    const status = stringValue(prep.sendCapabilityStatus, "blocked");

    return { subject, body, status };
  }, [payload?.prep, windowValue]);

  const copyPayload = useMemo(() => {
    return [
      "Trend Finder manual internal email test",
      `Recipient draft: ${recipient || "[enter internal reviewer manually]"}`,
      `Subject: ${emailPackage.subject}`,
      "",
      emailPackage.body,
      "",
      "Safety note: this app did not send the email, store the recipient, create cron or enable automation.",
    ].join("\n");
  }, [emailPackage.body, emailPackage.subject, recipient]);

  async function handleCopyPackage() {
    try {
      await copyText(copyPayload);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">
              Admin / Internal Email Test
            </p>
            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
              Prepare an internal test email. Do not send from the app.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/78 md:text-base">
              This creates a copyable manual review package only. No provider, recipient list, scheduled job or send action is enabled.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {windows.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={windowValue === option ? "secondary" : "outline"}
                onClick={() => setWindowValue(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </section>

        <Card className="border-primary/15 bg-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldAlert className="h-4 w-4" />
              Safety boundary
            </div>
            <CardTitle>Manual-only mode</CardTitle>
            <CardDescription>
              The recipient field below is local UI text. It is not saved and it is not sent anywhere.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="danger">No send button</Badge>
            <Badge variant="danger">No provider write</Badge>
            <Badge variant="danger">No cron</Badge>
            <Badge variant="danger">No recipients stored</Badge>
          </CardContent>
        </Card>

        {error ? <ProductStateCard variant="error" title="Email prep failed" description={error} /> : null}
        {isLoading ? <ProductStateCard variant="loading" title="Loading email prep" description="Reading the existing internal email test prep endpoint." /> : null}

        <Card className="border-border/10 bg-[#160d0d]/62">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Mail className="h-4 w-4" />
              Manual review package
            </div>
            <CardTitle>Copy package for an internal reviewer</CardTitle>
            <CardDescription>
              Status from prep layer: {emailPackage.status}. Use your normal email client manually after reviewing the content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Internal reviewer email, optional and local-only
              </span>
              <input
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="reviewer@example.com"
                className="w-full rounded-2xl border border-border/10 bg-[#0f0808]/45 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/38 focus:border-secondary/40"
              />
            </label>
            <div className="rounded-2xl border border-border/10 bg-[#0f0808]/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Subject</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{emailPackage.subject}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Body preview</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/25 p-3 text-xs leading-5 text-muted-foreground/88">
                {emailPackage.body}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void handleCopyPackage()}>
                <Clipboard className="mr-2 h-4 w-4" />
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy manual package"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/automation">Open automation diagnostics</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
