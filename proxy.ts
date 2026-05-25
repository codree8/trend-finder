import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  getRequiredRoleForRequest,
  hasRequiredRole,
  readAccessToken,
} from "@/lib/access/session";

function jsonUnauthorized(requiredRole: string, code: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message:
        requiredRole === "admin"
          ? "Admin access is required for this operation."
          : "Demo access is required for this operation.",
    },
    { status },
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requiredRole = getRequiredRoleForRequest(pathname, request.method);

  if (!requiredRole) return NextResponse.next();

  const appAccessSecret = process.env.APP_ACCESS_SECRET?.trim();
  const isApiRequest = pathname.startsWith("/api/");

  if (!appAccessSecret) {
    if (isApiRequest) {
      return NextResponse.json(
        {
          ok: false,
          code: "APP_ACCESS_SECRET_NOT_CONFIGURED",
          message: "App access protection is not configured.",
        },
        { status: 503 },
      );
    }

    const accessUrl = new URL("/access", request.url);
    accessUrl.searchParams.set("configuration", "missing");
    accessUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(accessUrl);
  }

  const session = await readAccessToken(
    request.cookies.get(ACCESS_COOKIE_NAME)?.value,
    appAccessSecret,
  );
  const role = session?.role ?? null;

  if (hasRequiredRole(role, requiredRole)) return NextResponse.next();

  if (isApiRequest) {
    return jsonUnauthorized(
      requiredRole,
      role ? "INSUFFICIENT_ACCESS" : "ACCESS_REQUIRED",
      role ? 403 : 401,
    );
  }

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("from", `${pathname}${request.nextUrl.search}`);
  accessUrl.searchParams.set("required", requiredRole);
  if (role) accessUrl.searchParams.set("denied", "1");

  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
