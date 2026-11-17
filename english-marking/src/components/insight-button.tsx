"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, postJson } from "@/lib/client";

/** Queues an AI write-up and refreshes the page when it is ready. */
export function InsightButton({ body, label, path = "/api/insights", busyLabel = "Reading the marked work…" }: { body: unknown; label: string; path?: string; busyLabel?: string }) {
  const router = useRouter();
  const [job, setJob] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!job) return;
    const t = setInterval(async () => {
      const res = await fetch(api(`/api/jobs?id=${job}`));
      const data = await res.json();
      const j = data.jobs?.[0];
      if (j?.status === "done") {
        setJob(null);
        router.refresh();
      } else if (j?.status === "error") {
        setJob(null);
        setError(j.error ?? "That did not work. Try again.");
      }
    }, 3000);
    return () => clearInterval(t);
  }, [job, router]);
  return (
    <span className="inline-flex flex-col items-end">
      <button
        className="btn-quiet"
        disabled={!!job}
        onClick={async () => {
          setError("");
          try {
            const r = await postJson<{ job: string }>(path, body);
            setJob(r.job);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        {job ? busyLabel : label}
      </button>
      {error && <span className="mt-1 text-xs text-bad">{error}</span>}
    </span>
  );
}
