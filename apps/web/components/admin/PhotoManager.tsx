"use client";

import { useRef, useState } from "react";
import { MAX_PHOTOS } from "@kombi/shared";
import { adminApi } from "@/lib/api";
import type { OwnerVan } from "./types";

/** Upload, reorder and delete a van's photos. The first one is the cover. */
export function PhotoManager({ van, onSaved }: { van: OwnerVan; onSaved: (v: OwnerVan) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photos = van.photos;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, MAX_PHOTOS - photos.length);
    setError(null);
    setProgress({ done: 0, total: list.length });
    let latest = van;
    const failed: string[] = [];
    // One at a time: each is resized on the server, and big phone photos add up.
    for (const [i, file] of list.entries()) {
      try {
        const body = new FormData();
        body.append("photo", file);
        latest = await adminApi<OwnerVan>(`/vans/${van.id}/photos`, { method: "POST", body });
        onSaved(latest);
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : "greška"}`);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (failed.length) setError(failed.join(" "));
    if (files.length > list.length) setError((e) => `${e ?? ""} Najviše ${MAX_PHOTOS} fotografija po kombiju.`.trim());
    if (input.current) input.current.value = "";
  }

  async function move(index: number, by: -1 | 1) {
    const ids = photos.map((p) => p.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + by, 0, moved!);
    try {
      onSaved(await adminApi<OwnerVan>(`/vans/${van.id}/photos/order`, { method: "PUT", json: { ids } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redoslijed nije sačuvan.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Obrisati ovu fotografiju?")) return;
    try {
      onSaved(await adminApi<OwnerVan>(`/vans/${van.id}/photos/${id}`, { method: "DELETE" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nije obrisano.");
    }
  }

  return (
    <div className="photo-manager">
      <p className="lead" style={{ margin: 0 }}>
        Prva fotografija je naslovna. Najbolje: kombi spolja, sjedišta, prtljažnik. Lokacija i podaci kamere se brišu automatski.
      </p>
      {photos.length > 0 && (
        <ul className="photo-grid">
          {photos.map((p, i) => (
            <li key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbUrl} alt={`Fotografija ${i + 1}`} width={320} height={240} />
              {i === 0 && <span className="cover">Naslovna</span>}
              <div className="photo-actions">
                <button type="button" aria-label="Pomjeri lijevo" disabled={i === 0} onClick={() => move(i, -1)}>←</button>
                <button type="button" aria-label="Pomjeri desno" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>→</button>
                <button type="button" onClick={() => remove(p.id)}>Obriši</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {photos.length < MAX_PHOTOS && (
        <label className="upload-btn" aria-busy={Boolean(progress)}>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={Boolean(progress)}
            onChange={(e) => upload(e.target.files)}
          />
          {progress ? (
            <>
              <span className="spinner" aria-hidden="true" /> Šaljem {progress.done + 1 > progress.total ? progress.total : progress.done + 1}/{progress.total}…
            </>
          ) : (
            "+ Dodaj fotografije"
          )}
        </label>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
    </div>
  );
}
