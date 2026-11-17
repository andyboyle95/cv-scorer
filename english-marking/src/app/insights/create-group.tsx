"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export function CreateGroupButton({ yearGroup, defaultName, studentIds }: { yearGroup: number; defaultName: string; studentIds: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [tutor, setTutor] = useState("");
  const [error, setError] = useState("");
  if (!open) return <button className="btn-quiet" onClick={() => setOpen(true)}>Make this a group</button>;
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const r = await postJson<{ id: string }>("/api/interventions", { mode: "create", name, tutor, yearGroup, studentIds, startDate: new Date().toISOString().slice(0, 10) });
          router.push(`/interventions/${r.id}`);
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <input className="field w-56" value={name} onChange={(e) => setName(e.target.value)} aria-label="Group name" />
      <input className="field w-40" value={tutor} onChange={(e) => setTutor(e.target.value)} placeholder="Tutor" aria-label="Tutor" />
      <button className="btn-primary">Create group</button>
      {error && <span className="text-xs text-bad">{error}</span>}
    </form>
  );
}
