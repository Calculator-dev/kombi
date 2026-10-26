"use client";

import { useState } from "react";
import { termsSchema, type Terms } from "@kombi/shared";
import { ApiError, adminApi } from "@/lib/api";
import type { OwnerVan } from "./types";

/** The van's rental terms, shown under "Uslovi najma" on its page. */
export function TermsForm({ van, onSaved }: { van: OwnerVan; onSaved: (v: OwnerVan) => void }) {
  const [t, setT] = useState<Terms>(van.terms);
  // "Included" is edited as one item per line.
  const [included, setIncluded] = useState(van.terms.included.join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Terms>(k: K, v: Terms[K]) => setT((x) => ({ ...x, [k]: v }));
  const int = (v: string) => (v === "" ? 0 : Number(v.replace(/\D/g, "")));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = termsSchema.safeParse({ ...t, included: included.split("\n").map((l) => l.trim()).filter(Boolean) });
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      onSaved(await adminApi<OwnerVan>(`/vans/${van.id}/terms`, { method: "PUT", json: r.data }));
      setMsg({ ok: true, text: "Uslovi sačuvani." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : "Nije sačuvano." });
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof Terms, label: string, input: React.ReactNode) => (
    <label className="field" data-invalid={Boolean(errors[k])}>
      {label}
      {input}
      {errors[k] && <span className="field-error">{errors[k]}</span>}
    </label>
  );

  return (
    <section>
      <h2 className="display h-md" style={{ marginBottom: 8 }}>Uslovi najma</h2>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="fields">
          {field("minDriverAge", "Vozač najmanje godina", <input inputMode="numeric" value={t.minDriverAge || ""} onChange={(e) => set("minDriverAge", int(e.target.value))} />)}
          {field("minLicenseYears", "Vozačka najmanje godina", <input inputMode="numeric" value={t.minLicenseYears} onChange={(e) => set("minLicenseYears", int(e.target.value))} />)}
          {field("cancellationDays", "Besplatno otkazivanje do (dana prije)", <input inputMode="numeric" value={t.cancellationDays} onChange={(e) => set("cancellationDays", int(e.target.value))} />)}
        </div>
        <div className="fields">
          {field("documents", "Dokumenti", <input value={t.documents} onChange={(e) => set("documents", e.target.value)} />)}
          {field("fuel", "Gorivo", <input value={t.fuel} onChange={(e) => set("fuel", e.target.value)} />)}
          {field("border", "Prelazak granice", <input value={t.border} placeholder="npr. Dozvoljeno uz zeleni karton (HR, ME, RS)" onChange={(e) => set("border", e.target.value)} />)}
        </div>
        {field(
          "included",
          "Uključeno u cijenu (jedno po redu)",
          <textarea rows={4} value={included} placeholder={"Osiguranje\nPDV\nNeograničena kilometraža"} onChange={(e) => setIncluded(e.target.value)} />,
        )}
        {field(
          "notes",
          "Ostali uslovi (neobavezno)",
          <textarea rows={3} value={t.notes} placeholder="npr. Kućni ljubimci uz dogovor. Pušenje nije dozvoljeno." onChange={(e) => set("notes", e.target.value)} />,
        )}
        {msg && <p className={msg.ok ? "ok-box" : "alert"} role="status">{msg.text}</p>}
        <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
          {busy ? "Spremam…" : "Sačuvaj uslove"}
        </button>
      </form>
    </section>
  );
}
