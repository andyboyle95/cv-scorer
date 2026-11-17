import { NextRequest, NextResponse } from "next/server";
import { sessionToken, COOKIE } from "@/lib/auth/token";

// MVP access control: one shared staff password (ACCESS_PASSWORD).
// Per-user Google / Microsoft sign-in replaces this in version 2.
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/login") || path.startsWith("/api/login") || path.startsWith("/api/health")) {
    return NextResponse.next();
  }
  const password = process.env.ACCESS_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("ACCESS_PASSWORD is not set. The app is locked until it is.", { status: 503 });
    }
    return NextResponse.next();
  }
  const expected = await sessionToken(password);
  if (req.cookies.get(COOKIE)?.value === expected) return NextResponse.next();

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in again: your session has ended." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(path)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|pdf.worker.min.mjs).*)"],
};
