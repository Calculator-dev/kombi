"use client";

import { useState } from "react";
import { todayIn } from "@kombi/shared";
import { ApiError, api } from "@/lib/api";
import { shortDate } from "@/lib/format";
import type { Block } from "./types";

export function BlocksPanel({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const today = todayIn();
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const b = await api<Block>("/admin/blocks", { method: "POST", json: { start, end, reason: reason || undefined } });
      onChange([...blocks, b].sort((a, z) => a.start.localeCompare(z.start)));
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : "Nije sačuvano.");
    }
  }

  async function remove(id: string) {
    await api(`/admin/blocks/${id}`, { method: "DELETE" });
    onChange(blocks.filter((b) => b.id !== id));
  }

  return (
    <>
      <div>
        <h1 className="display h-lg">Blokirani dani</h1>
        <p className="lead" style={{ marginTop: 16 }}>
          Dani kada kombi nije za najam: servis, lična upotreba ili rezervacija dogovorena telefonom.
        </p>
      </div>
      <form onSubmit={add} className="fields" style={{ alignItems: "end" }}>
        <label className="field">Od<input type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} required /></label>
        <label className="field">Do (uključivo)<input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required /></label>
        <label className="field">Razlog (vidite samo vi)<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="npr. servis" /></label>
        <button className="btn-dark" type="submit">Blokiraj</button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="req-list">
        {blocks.length === 0 && <p className="empty">Nema blokiranih dana.</p>}
        {blocks.map((b) => (
          <div className="req" key={b.id}>
            <div className="who">
              <strong>{shortDate(b.start)} → {shortDate(b.end)}</strong>
              {b.reason && <span className="meta dim">{b.reason}</span>}
            </div>
            <button type="button" className="small-btn" onClick={() => remove(b.id)}>Ukloni</button>
          </div>
        ))}
      </div>
    </>
  );
}
