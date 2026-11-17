"use client";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { postJson } from "@/lib/client";

/** Posts JSON, then refreshes the page. Shows errors in place. */
export function ActionButton({
  path, body, method = "POST", children, className = "btn-quiet", confirm, done,
}: { path: string; body?: unknown; method?: string; children: ReactNode; className?: string; confirm?: string; done?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        className={className}
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setMsg(null);
          try {
            await postJson(path, body ?? {}, method);
            if (done) setMsg({ ok: true, text: done });
            router.refresh();
          } catch (e) {
            setMsg({ ok: false, text: (e as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : children}
      </button>
      {msg && <span className={`mt-1 text-xs ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</span>}
    </span>
  );
}
