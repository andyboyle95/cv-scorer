"use client";
import { BASE } from "./base";
export { BASE };
export const api = (path: string) => `${BASE}${path}`;

export async function postJson<T = unknown>(path: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(api(path), { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}
