"use client";
import { useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { postJson, BASE } from "@/lib/client";
import { BRAND } from "@/lib/brand";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Wordmark size="lg" />
      <p className="mt-2 text-muted">{BRAND.school}</p>
      <form
        className="mt-10 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await postJson("/api/login", { password });
            const next = new URLSearchParams(window.location.search).get("next") || "/";
            window.location.href = `${BASE}${next.startsWith("/") ? next : "/"}`;
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <div>
          <label className="label" htmlFor="pw">Staff password</label>
          <input id="pw" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={error ? "pw-err" : undefined} autoFocus />
          {error && <p id="pw-err" className="mt-2 text-sm text-bad">{error}</p>}
        </div>
        <button className="btn-primary w-full justify-center" disabled={busy || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-8 text-xs text-muted">Student data is kept in the school&apos;s own database. Sign out by closing your browser.</p>
    </div>
  );
}
