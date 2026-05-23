export type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function readApiErrorMessage(
  payload: ApiErrorPayload | null | undefined,
  fallback: string,
) {
  const message = asText(payload?.message) || fallback;
  const detail = asText(payload?.error);

  if (!detail || detail === message) return message;
  return `${message} ${detail}`;
}

export function isMissingDatabaseConfigError(message: string | null | undefined) {
  return /DATABASE_URL\s+is\s+not\s+configured/i.test(message ?? "");
}
