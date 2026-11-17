import { cookies } from "next/headers";
import { sessionToken, COOKIE } from "./token";

/** Second line of defence behind the middleware (which Next skips for the base-path root). */
export async function isSignedIn(): Promise<boolean> {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) return process.env.NODE_ENV !== "production";
  const jar = await cookies();
  return jar.get(COOKIE)?.value === (await sessionToken(password));
}
