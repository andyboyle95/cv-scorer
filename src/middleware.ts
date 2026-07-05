// Auth middleware.
//
// Runs on the Edge, so it CANNOT query the DB (Prisma isn't available on
// Edge). It performs a lightweight cookie-presence check: is there a
// NextAuth session cookie? If not, redirect to /login for gated routes.
//
// The actual whitelist re-check (revocation, role change) happens in the
// NextAuth session callback (see src/lib/auth.ts) which runs on every
// getServerSession() call in server components / API routes.
//
// Public routes bypass the check entirely. This includes:
//   - /login and NextAuth's own /api/auth/* endpoints
//   - /tools/*                  → static tools like the WC26 planner (shareable)
//   - /job-spec                 → public lead-gen form
//   - Static Next.js assets, favicon, images, robots, sitemap
//
// The home page `/` is INTENTIONALLY gated — even a peek at the app cards
// requires sign-in. If you want a public landing page instead, add "/" to
// PUBLIC_EXACT below.

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth", // NextAuth endpoints
  "/tools", // static tools like WC26 planner
  "/job-spec", // public lead-gen tool that emails leads back to info@aaronwallis.co.uk
  "/_next",
  "/favicon.ico",
  "/aaron-wallis-logo.png",
];

// Exact-match public paths (paths that must be public but aren't a whole tree).
// Intentionally empty right now — everything, including `/`, is gated.
const PUBLIC_EXACT = new Set<string>();

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// NextAuth session cookie name. In production the __Secure- prefix is used
// (see next-auth docs). Checking both covers dev and prod.
const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => !!req.cookies.get(name)?.value);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  if (!hasSessionCookie(req)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve intended destination so we can bounce them back after sign-in.
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Run on every request except the Next.js internals we explicitly skip.
// (isPublic() handles finer-grained allowlisting inside the matched set.)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
