"use client";

import { useState } from "react";
import { ApiError, adminApi } from "@/lib/api";
import type { Me } from "./types";

/** The company's logo: on its vehicles, its company page and its contracts. */
export function LogoUpload({ me, onSaved }: { me: Me; onSaved: (m: Me) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(call: () => Promise<Me>) {
    setBusy(true);
    setError(null);
    try {
      onSaved(await call());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Nije sačuvano.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="logo-upload">
      <div className="logo-box" aria-hidden={!me.logo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {me.logo ? <img src={me.logo} alt="Logo firme" width={96} height={96} /> : <span>Logo</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <strong>Logo ili profilna slika firme</strong>
        <span className="caption" style={{ margin: 0 }}>
          Prikazuje se na vašim vozilima, stranici firme i ugovoru. Najbolje kvadratna slika (PNG s prozirnom pozadinom).
        </span>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label className="small-btn video-pick" aria-disabled={busy}>
            {busy ? "Spremam…" : me.logo ? "Zamijeni" : "Dodaj logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const body = new FormData();
                body.append("logo", f);
                void run(() => adminApi<Me>("/me/logo", { method: "PUT", body }));
              }}
            />
          </label>
          {me.logo && (
            <button type="button" className="link" disabled={busy} onClick={() => void run(() => adminApi<Me>("/me/logo", { method: "DELETE" }))}>
              Ukloni
            </button>
          )}
          {me.slug && me.status === "approved" && (
            <a href={`/firma/${me.slug}`} target="_blank" rel="noopener" className="link">Stranica firme ↗</a>
          )}
        </div>
        {error && <p className="alert" role="alert">{error}</p>}
      </div>
    </div>
  );
}
