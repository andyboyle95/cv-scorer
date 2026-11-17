import { NextRequest, NextResponse } from "next/server";
import { sessionToken, COOKIE } from "@/lib/auth/token";
import { audit } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.ACCESS_PASSWORD;
  if (!expected || password !== expected) {
    await new Promise((r) => setTimeout(r, 800));
    await audit("login_failed").catch(() => {});
    return NextResponse.json({ error: "That password is not right. Check with your head of department." }, { status: 401 });
  }
  await audit("login").catch(() => {});
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sessionToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
