export type SourceSignal = {
  source: string;
  externalId: string;
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;
  engagement?: number;
  rawPayload?: unknown;
};

export type SourceConnector = {
  name: string;
  scan: () => Promise<SourceSignal[]>;
};
