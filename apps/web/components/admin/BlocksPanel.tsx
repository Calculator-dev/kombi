"use client";

import { useState } from "react";
import { todayIn } from "@kombi/shared";
import { ApiError, adminApi } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { VanSelect } from "./VanSelect";
import type { Block, OwnerVan } from "./types";

export function BlocksPanel({ vans, blocks, onChange }: { vans: OwnerVan[]; blocks: Block[]; onChange: (b: Block[]) => void }) {
  const today = todayIn();
  const [vanId, setVanId] = useState(vans[0]?.id ?? "");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const names = new Map(vans.map((v) => [v.id, v.name]));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const b = await adminApi<Block>("/blocks", { method: "POST", json: { vanId, start, end, reason: reason || undefined } });
      onChange([...blocks, b].sort((a, z) => a.start.localeCompare(z.start)));
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : "Nije sačuvano.");
    }
  }

  async function remove(id: string) {
    try {
      await adminApi(`/blocks/${id}`, { method: "DELETE" });
      onChange(blocks.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nije uklonjeno.");
    }
  }

  if (!vans.length) {
    return (
      <>
        <h1 className="display h-lg">Blokirani dani</h1>
        <p className="empty">Prvo dodajte kombi.</p>
      </>
    );
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
        {vans.length > 1 && <VanSelect vans={vans} value={vanId} onChange={setVanId} />}
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
              <span className="meta dim">{[vans.length > 1 ? names.get(b.vanId) : null, b.reason].filter(Boolean).join(" · ")}</span>
            </div>
            <button type="button" className="small-btn" onClick={() => remove(b.id)}>Ukloni</button>
          </div>
        ))}
      </div>
    </>
  );
}
