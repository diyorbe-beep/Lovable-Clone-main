import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SecurityHeaders } from "@/lib/security/headers";

/**
 * Middleware must stay Edge-compatible: no ioredis, winston, or Node-only graphs.
 * Rate limiting belongs in route handlers or an Edge-safe store (e.g. Upstash).
 */

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";
const CSRF_MAX_AGE = 60 * 60 * 24;

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/inngest(.*)",
  "/api/health(.*)",
  "/api/platform/health(.*)",
  "/api/preview(.*)",
  "/api/oauth/github/callback",
  "/",
  "/about(.*)",
  "/pricing(.*)",
  "/docs(.*)",
]);

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getCsrfCookie(req: NextRequest): string | undefined {
  return req.cookies.get(CSRF_COOKIE)?.value;
}

function getCsrfHeader(req: NextRequest): string | undefined {
  return req.headers.get(CSRF_HEADER) ?? undefined;
}

function shouldSkipApiCsrf(pathname: string) {
  return (
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/inngest") ||
    pathname.startsWith("/api/trpc") ||
    pathname.startsWith("/api/vercel/deploy") ||
    pathname.startsWith("/api/preview/")
  );
}

function applyApiCsrf(req: NextRequest, response: NextResponse): NextResponse | null {
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/api/") || shouldSkipApiCsrf(pathname)) {
    return null;
  }

  const method = req.method;

  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    const token = getCsrfCookie(req) ?? generateCsrfToken();
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: CSRF_MAX_AGE,
      path: "/",
    });
    return null;
  }

  const cookieToken = getCsrfCookie(req);
  const headerToken = getCsrfHeader(req);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return SecurityHeaders.setHeaders(
      new NextResponse(
        JSON.stringify({ error: "Invalid CSRF token" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  }

  return null;
}

export default clerkMiddleware(async (auth, req) => {
  const response = SecurityHeaders.setHeaders(NextResponse.next());

  const csrfDenied = applyApiCsrf(req, response);
  if (csrfDenied) {
    return csrfDenied;
  }

  if (isPublicRoute(req)) {
    return response;
  }

  await auth.protect();
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
