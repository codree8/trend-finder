export type AccessRole = "demo" | "admin";

export const ACCESS_COOKIE_NAME = "trend_finder_access";
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

const encoder = new TextEncoder();

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToHex(signature);
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

export function isAccessRole(value: unknown): value is AccessRole {
  return value === "demo" || value === "admin";
}

export async function createAccessToken(args: {
  role: AccessRole;
  secret: string;
  maxAgeSeconds?: number;
}) {
  const expiresAt = Math.floor(
    Date.now() / 1000 + (args.maxAgeSeconds ?? ACCESS_COOKIE_MAX_AGE_SECONDS),
  );
  const payload = `${args.role}.${expiresAt}`;
  const signature = await signPayload(payload, args.secret);

  return `${payload}.${signature}`;
}

export async function readAccessToken(
  token: string | undefined | null,
  secret: string | undefined | null,
): Promise<{ role: AccessRole; expiresAt: number } | null> {
  if (!token || !secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [role, expiresAtRaw, signature] = parts;
  if (!isAccessRole(role)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return null;
  if (expiresAt <= Math.floor(Date.now() / 1000)) return null;

  const payload = `${role}.${expiresAtRaw}`;
  const expectedSignature = await signPayload(payload, secret);

  if (!safeEqual(signature, expectedSignature)) return null;

  return { role, expiresAt };
}

export function hasRequiredRole(
  currentRole: AccessRole | null,
  requiredRole: AccessRole,
) {
  if (currentRole === "admin") return true;
  return currentRole === requiredRole;
}

function matchesPath(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    matchesPath(pathname, "/demo") ||
    matchesPath(pathname, "/access") ||
    matchesPath(pathname, "/api/access") ||
    matchesPath(pathname, "/api/demo-explainer/export") ||
    matchesPath(pathname, "/api/internal/cron") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export function getRequiredRoleForRequest(pathname: string, method: string) {
  if (isPublicPath(pathname)) return null;

  if (matchesPath(pathname, "/admin")) return "admin" as const;

  if (matchesPath(pathname, "/api/scan")) return "admin" as const;

  if (matchesPath(pathname, "/api/watchlist")) {
    return method.toUpperCase() === "GET" ? ("demo" as const) : ("admin" as const);
  }

  if (
    matchesPath(pathname, "/api/trends") ||
    matchesPath(pathname, "/api/action-queue") ||
    matchesPath(pathname, "/api/daily-brief") ||
    matchesPath(pathname, "/api/export")
  ) {
    return "demo" as const;
  }

  if (
    matchesPath(pathname, "/dashboard") ||
    matchesPath(pathname, "/watchlist") ||
    matchesPath(pathname, "/action-queue") ||
    matchesPath(pathname, "/daily-brief") ||
    matchesPath(pathname, "/reports") ||
    matchesPath(pathname, "/settings")
  ) {
    return "demo" as const;
  }

  return null;
}

export function normalizeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  if (matchesPath(value, "/api")) return "/dashboard";
  if (matchesPath(value, "/access")) return "/dashboard";

  return value;
}
