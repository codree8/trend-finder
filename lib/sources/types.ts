export type SourceSignal = {
  source: string;
  externalId: string;
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;
  engagement?: number;
  rawPayload?: unknown;
  normalizedUrl?: string;
  contentHash?: string;
  signalFingerprint?: string;
  qualityScore?: number;
};

export type ScanContext = {
  keywords: string[];
  since: Date;
  limitPerSource?: number;
};

export type SourceConnector = {
  name: string;
  scan: (context: ScanContext) => Promise<SourceSignal[]>;
};
