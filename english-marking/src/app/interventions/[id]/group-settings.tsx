"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client";

export function GroupSettings({ id, tutor, startDate }: { id: string; tutor: string; startDate: string }) {
  const router = useRouter();
  const [t, setT] = useState(tutor);
  const [d, setD] = useState(startDate);
  const [msg, setMsg] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await postJson(`/api/interventions/${id}`, { action: "update", tutor: t, startDate: d });
        setMsg("Saved");
        router.refresh();
      }}
    >
      <div><label className="label" htmlFor="tutor">Tutor</label><input id="tutor" className="field" value={t} onChange={(e) => setT(e.target.value)} /></div>
      <div><label className="label" htmlFor="start">Start date</label><input id="start" type="date" className="field" value={d} onChange={(e) => setD(e.target.value)} /></div>
      <button className="btn-quiet">Save changes</button>
      {msg && <span className="text-sm text-good">{msg}</span>}
    </form>
  );
}
