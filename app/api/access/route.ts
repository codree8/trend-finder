import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_COOKIE_NAME,
  createAccessToken,
  normalizeReturnTo,
  readAccessToken,
  type AccessRole,
} from "@/lib/access/session";

export const dynamic = "force-dynamic";

function getAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  };
}

async function readAccessCode(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      code: typeof body.code === "string" ? body.code : "",
      returnTo: typeof body.returnTo === "string" ? body.returnTo : "/dashboard",
    };
  }

  const form = await request.formData();
  return {
    code: String(form.get("code") ?? ""),
    returnTo: String(form.get("returnTo") ?? "/dashboard"),
  };
}

function resolveAccessRole(code: string): AccessRole | null {
  const normalizedCode = code.trim();
  const demoCode = process.env.DEMO_ACCESS_CODE?.trim();
  const adminPassword = process.env.ADMIN_ACCESS_PASSWORD?.trim();

  if (adminPassword && normalizedCode === adminPassword) return "admin";
  if (demoCode && normalizedCode === demoCode) return "demo";

  return null;
}

export async function GET(request: Request) {
  const secret = process.env.APP_ACCESS_SECRET?.trim();
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCESS_COOKIE_NAME}=`))
    ?.split("=")[1];
  const session = await readAccessToken(cookie, secret);

  return NextResponse.json(
    {
      ok: true,
      role: session?.role ?? null,
      expiresAt: session?.expiresAt ?? null,
      configured: Boolean(secret),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const secret = process.env.APP_ACCESS_SECRET?.trim();
  const { code, returnTo } = await readAccessCode(request);
  const target = normalizeReturnTo(returnTo);

  if (!secret) {
    const url = new URL("/access", request.url);
    url.searchParams.set("configuration", "missing");
    url.searchParams.set("from", target);
    return NextResponse.redirect(url, { status: 303 });
  }

  const role = resolveAccessRole(code);

  if (!role) {
    const url = new URL("/access", request.url);
    url.searchParams.set("error", "invalid");
    url.searchParams.set("from", target);
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(target, request.url), {
    status: 303,
  });
  const token = await createAccessToken({ role, secret });
  response.cookies.set(ACCESS_COOKIE_NAME, token, getAccessCookieOptions());

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
