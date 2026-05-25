type ApiErrorBody = {
  ok: false;
  message: string;
  error?: string;
};

export function buildApiErrorBody(
  message: string,
  error: unknown,
): ApiErrorBody {
  const body: ApiErrorBody = { ok: false, message };

  if (process.env.NODE_ENV !== "production") {
    body.error = error instanceof Error ? error.message : "Unknown error";
  }

  return body;
}
