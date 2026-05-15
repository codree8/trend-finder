import { createHash } from "node:crypto";
import { getSourceProfile } from "@/lib/scoring/source-profiles";
import type { SourceSignal } from "@/lib/sources/types";
import {
  getNormalizedHostname,
  getNormalizedPath,
  normalizeTextForHash,
  normalizeUrl,
} from "@/lib/signals/url-normalization";

export type SignalQualityMeta = {
  normalizedUrl: string;
  contentHash: string;
  signalFingerprint: string;
  qualityScore: number;
};

function hash(value: string, length = 64) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getPayloadString(signal: SourceSignal, key: string) {
  const value = asRecord(signal.rawPayload)[key];
  return typeof value === "string" ? value : null;
}

function getSignalDate(signal: SourceSignal) {
  const candidate =
    signal.publishedAt ??
    getPayloadString(signal, "pushedAt") ??
    getPayloadString(signal, "observedAt");

  if (!candidate) return null;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageInDays(signal: SourceSignal) {
  const date = getSignalDate(signal);
  if (!date) return 14;
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
}

export function buildSignalContentHash(signal: SourceSignal) {
  const normalizedUrl = normalizeUrl(signal.url);
  const title = normalizeTextForHash(signal.title);
  const host = getNormalizedHostname(normalizedUrl);
  const path = getNormalizedPath(normalizedUrl)
    .split("/")
    .filter(Boolean)
    .slice(0, 5)
    .join("/");

  return hash([title, host, path].filter(Boolean).join("|"));
}

export function buildSignalFingerprint(signal: SourceSignal) {
  const sourceKey = normalizeTextForHash(signal.source).replace(/\s+/g, "-");
  const normalizedUrl = normalizeUrl(signal.url);
  const contentHash = buildSignalContentHash(signal);
  const stableIdentity = normalizedUrl || contentHash;

  return hash(`${sourceKey}|${stableIdentity}`);
}

export function calculateSignalQualityScore(signal: SourceSignal) {
  const profile = getSourceProfile(signal.source);
  const titleLength = signal.title.trim().length;
  const titleScore =
    titleLength >= 32 && titleLength <= 140
      ? 88
      : titleLength >= 18
        ? 68
        : 42;
  const urlScore = normalizeUrl(signal.url) ? 82 : 34;
  const recencyScore = Math.max(18, 100 - ageInDays(signal) * 9);
  const engagementScore = Math.min(
    100,
    Math.log10((signal.engagement ?? 0) + 10) * 32,
  );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        profile.credibility * 0.34 +
          recencyScore * 0.24 +
          engagementScore * 0.22 +
          titleScore * 0.12 +
          urlScore * 0.08,
      ),
    ),
  );
}

export function getSignalQualityMeta(signal: SourceSignal): SignalQualityMeta {
  const payload = asRecord(signal.rawPayload);
  const payloadNormalizedUrl = payload.normalizedUrl;
  const payloadContentHash = payload.contentHash;
  const payloadFingerprint = payload.signalFingerprint;
  const payloadQualityScore = payload.qualityScore;

  const normalizedUrl =
    typeof signal.normalizedUrl === "string"
      ? signal.normalizedUrl
      : typeof payloadNormalizedUrl === "string"
        ? payloadNormalizedUrl
        : normalizeUrl(signal.url);
  const contentHash =
    typeof signal.contentHash === "string"
      ? signal.contentHash
      : typeof payloadContentHash === "string"
        ? payloadContentHash
        : buildSignalContentHash(signal);
  const signalFingerprint =
    typeof signal.signalFingerprint === "string"
      ? signal.signalFingerprint
      : typeof payloadFingerprint === "string"
        ? payloadFingerprint
        : buildSignalFingerprint(signal);
  const qualityScore =
    typeof signal.qualityScore === "number"
      ? signal.qualityScore
      : typeof payloadQualityScore === "number"
        ? payloadQualityScore
        : calculateSignalQualityScore(signal);

  return {
    normalizedUrl,
    contentHash,
    signalFingerprint,
    qualityScore,
  };
}

export function prepareSignalForStorage(
  signal: SourceSignal,
  observedAt: Date,
): SourceSignal {
  const meta = getSignalQualityMeta(signal);
  const existingPayload = asRecord(signal.rawPayload);
  const observedAtIso = observedAt.toISOString();

  return {
    ...signal,
    normalizedUrl: meta.normalizedUrl,
    contentHash: meta.contentHash,
    signalFingerprint: meta.signalFingerprint,
    qualityScore: meta.qualityScore,
    rawPayload: {
      ...existingPayload,
      observedAt: observedAtIso,
      normalizedUrl: meta.normalizedUrl,
      contentHash: meta.contentHash,
      signalFingerprint: meta.signalFingerprint,
      qualityScore: meta.qualityScore,
    },
  };
}

export function uniquePreparedSignals(signals: SourceSignal[]) {
  const seen = new Set<string>();
  const unique: SourceSignal[] = [];
  let duplicateCount = 0;

  for (const signal of signals) {
    const fingerprint = getSignalQualityMeta(signal).signalFingerprint;

    if (seen.has(fingerprint)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(fingerprint);
    unique.push(signal);
  }

  return { unique, duplicateCount };
}
