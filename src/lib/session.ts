// Server-side session helpers.
//
// getSession() is a thin wrapper around getServerSession() with the app's
// authOptions bound. requireSession() throws in a way that server actions /
// route handlers can rethrow to bail early. requireAdmin() is the guard used
// by the admin dashboard and admin API routes.

import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "./auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.email) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== Role.ADMIN) {
    throw new Response("Forbidden", { status: 403 });
  }
  return session;
}
