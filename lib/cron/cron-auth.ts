import { NextResponse } from "next/server";

type CronAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function getPresentedSecret(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  return (
    bearer ||
    request.headers.get("x-cron-secret")?.trim() ||
    new URL(request.url).searchParams.get("secret")?.trim() ||
    ""
  );
}

export function requireCronSecret(request: Request): CronAuthResult {
  const configuredSecret = process.env.CRON_SECRET?.trim();

  if (!configuredSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          code: "CRON_SECRET_NOT_CONFIGURED",
          message:
            "CRON_SECRET is not configured. Add it to the deployment environment before enabling scheduled jobs.",
        },
        { status: 503 },
      ),
    };
  }

  const presentedSecret = getPresentedSecret(request);

  if (presentedSecret !== configuredSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          code: "INVALID_CRON_SECRET",
          message: "Cron request is not authorized.",
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true };
}
