export const COOKIE = "rl_session";

/** Deterministic HMAC of the password, so changing the password signs everyone out. */
export async function sessionToken(password: string): Promise<string> {
  const secret = process.env.SESSION_SECRET ?? "dev-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`v1:${password}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
