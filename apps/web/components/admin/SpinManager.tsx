"use client";

import { useState } from "react";
import { SPIN_SLOTS } from "@kombi/shared";
import { adminApi } from "@/lib/api";
import { SpinViewer } from "../SpinViewer";
import type { OwnerVan } from "./types";

const SIDES: Record<number, string> = { 0: "sprijeda", 3: "desna strana", 6: "straga", 9: "lijeva strana" };
const slotName = (slot: number) => `${slot === 0 ? 12 : slot} h${SIDES[slot] ? ` · ${SIDES[slot]}` : ""}`;

/** The 360° view: a switch, then one photo for each clock position around the van. */
export function SpinManager({ van, onSaved }: { van: OwnerVan; onSaved: (v: OwnerVan) => void }) {
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const on = van.spinEnabled;
  const slots = van.spinSlots;
  const filled = slots.filter(Boolean).length;
  const empty = slots.flatMap((p, slot) => (p ? [] : [slot]));

  async function toggle() {
    setToggling(true);
    setError(null);
    try {
      onSaved(await adminApi<OwnerVan>(`/vans/${van.id}/spin`, { method: "PATCH", json: { enabled: !on } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nije sačuvano.");
    }
    setToggling(false);
  }

  /** Uploads one file per slot, one at a time (each is resized on the server). */
  async function upload(pairs: [number, File][]) {
    if (!pairs.length) return;
    setError(null);
    setBusy(new Set(pairs.map(([slot]) => slot)));
    const failed: string[] = [];
    for (const [slot, file] of pairs) {
      try {
        const body = new FormData();
        body.append("photo", file);
        onSaved(await adminApi<OwnerVan>(`/vans/${van.id}/spin/${slot}`, { method: "PUT", body }));
      } catch (e) {
        failed.push(`${slotName(slot)}: ${e instanceof Error ? e.message : "greška"}`);
      }
      setBusy((b) => new Set([...b].filter((s) => s !== slot)));
    }
    if (failed.length) setError(failed.join(" "));
  }

  /** Several files at once fill the empty slots in file-name order (phones number their photos). */
  function uploadMany(files: FileList | null) {
    if (!files?.length) return;
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    void upload(empty.slice(0, sorted.length).map((slot, i) => [slot, sorted[i]!]));
    if (sorted.length > empty.length) setError(`Dodano ${empty.length}, višak fotografija je preskočen (ukupno ${SPIN_SLOTS} mjesta).`);
  }

  async function remove(slot: number) {
    if (!confirm(`Obrisati fotografiju ${slotName(slot)}?`)) return;
    try {
      onSaved(await adminApi<OwnerVan>(`/vans/${van.id}/spin/${slot}`, { method: "DELETE" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nije obrisano.");
    }
  }

  return (
    <div className="photo-manager">
      <button type="button" role="switch" aria-checked={on} className="switch" disabled={toggling} onClick={toggle}>
        <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
        <span>
          <strong>360° pogled {on ? "uključen" : "isključen"}</strong>
          <small>Kupci povlače prstom ili mišem i okreću kombi sa svih strana.</small>
        </span>
      </button>

      {on && (
        <>
          <p className="lead" style={{ margin: 0 }}>
            Zamislite sat oko kombija gledano odozgo: prednji dio je na 12 h. Stanite na svaku poziciju od 12 do 11 h, uvijek
            na istoj udaljenosti (5–6 m) i u visini grudi, s cijelim kombijem u kadru. Najbolje po oblačnom vremenu.
          </p>
          {filled === SPIN_SLOTS ? (
            <p className="ok-box">Svih {SPIN_SLOTS} fotografija je tu. 360° pogled se prikazuje na stranici kombija.</p>
          ) : (
            <p className="note-box">
              Dodano {filled}/{SPIN_SLOTS}. 360° pogled se prikazuje kada dodate svih {SPIN_SLOTS} fotografija.
            </p>
          )}

          {empty.length > 0 && (
            <label className="upload-btn" aria-busy={busy.size > 0}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={busy.size > 0}
                onChange={(e) => {
                  uploadMany(e.target.files);
                  e.target.value = "";
                }}
              />
              {busy.size > 0 ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Šaljem, još {busy.size}…
                </>
              ) : filled ? (
                `+ Dodaj preostale (${empty.length})`
              ) : (
                `+ Dodaj svih ${SPIN_SLOTS} odjednom`
              )}
            </label>
          )}

          <ol className="spin-slots">
            {slots.map((p, slot) => (
              <li key={slot}>
                <span className="spin-slot-name">{slotName(slot)}</span>
                <label className="spin-slot-photo" data-empty={!p || undefined} aria-busy={busy.has(slot)}>
                  <input
                    id={`spin-${van.id}-${slot}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy.has(slot)}
                    aria-label={`${p ? "Zamijeni" : "Dodaj"} fotografiju ${slotName(slot)}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload([[slot, file]]);
                      e.target.value = "";
                    }}
                  />
                  {busy.has(slot) ? (
                    <span className="spinner" aria-hidden="true" />
                  ) : p ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbUrl} alt="" width={320} height={240} />
                  ) : (
                    <span>+ Dodaj</span>
                  )}
                </label>
                {p && (
                  <div className="photo-actions">
                    <label htmlFor={`spin-${van.id}-${slot}`}>Zamijeni</label>
                    <button type="button" onClick={() => remove(slot)}>Obriši</button>
                  </div>
                )}
              </li>
            ))}
          </ol>

          {filled === SPIN_SLOTS && (
            <div>
              <h3 style={{ margin: "0 0 10px", fontSize: 17 }}>Pregled</h3>
              <SpinViewer photos={slots.filter((p) => p !== null)} name={van.name} />
            </div>
          )}
        </>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
    </div>
  );
}
