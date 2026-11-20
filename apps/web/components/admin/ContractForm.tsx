"use client";

import { useState } from "react";
import { contractTermsSchema, type ContractTerms } from "@kombi/shared";
import { ApiError, adminApi } from "@/lib/api";
import type { OwnerVan } from "./types";

/**
 * What the rental contract says about this van: its papers and the amounts in
 * the contract. The papers stay private; the mileage and the damage share are
 * also shown on the van's page once saved.
 */
export function ContractForm({ van, onSaved }: { van: OwnerVan; onSaved: (v: OwnerVan) => void }) {
  const [t, setT] = useState<ContractTerms>(van.contract);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ContractTerms>(k: K, v: ContractTerms[K]) => setT((x) => ({ ...x, [k]: v }));
  const int = (v: string) => (v === "" ? 0 : Number(v.replace(/\D/g, "")));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = contractTermsSchema.safeParse(t);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      onSaved(await adminApi<OwnerVan>(`/vans/${van.id}/contract`, { method: "PUT", json: r.data }));
      setMsg({ ok: true, text: "Podaci za ugovor sačuvani." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : "Nije sačuvano." });
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof ContractTerms, label: string, input: React.ReactNode) => (
    <label className="field" data-invalid={Boolean(errors[k])}>
      {label}
      {input}
      {errors[k] && <span className="field-error">{errors[k]}</span>}
    </label>
  );
  const text = (k: "plates" | "vin" | "color" | "place", label: string, placeholder?: string) =>
    field(k, label, <input value={t[k]} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} />);
  const amount = (k: "kmPerDay" | "smokingFee" | "damageFee" | "fineFee" | "lateFeePerHour" | "cleaningFee", label: string) =>
    field(k, label, <input inputMode="numeric" value={t[k]} onChange={(e) => set(k, int(e.target.value))} />);

  return (
    <section>
      <h2 className="display h-md" style={{ marginBottom: 8 }}>Ugovor o najmu</h2>
      <p className="lead" style={{ marginBottom: 20 }}>
        Ovi podaci se upisuju u ugovor koji otvarate dugmetom „Ugovor" na rezervaciji. Registracija, šasija i boja se ne
        prikazuju nigdje. Kilometraža po danu, cijena dodatnih kilometara i učešće u šteti prikazuju se i na oglasu, da
        kupac zna uslove prije upita. Vaši podaci kao najmodavca su u Profilu.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="fields">
          {text("plates", "Registarske oznake")}
          {text("vin", "Broj šasije")}
          {text("color", "Boja")}
          {text("place", "Mjesto zaključenja i suda: „u …\"", "npr. Sarajevu")}
        </div>
        <div className="fields">
          {amount("kmPerDay", "Uključeno km po danu (0 = neograničeno)")}
          {amount("damageFee", "Učešće u šteti (KM)")}
          {amount("lateFeePerHour", "Kašnjenje, po započetom satu (KM)")}
          {amount("smokingFee", "Pušenje u vozilu (KM)")}
          {amount("cleaningFee", "Čišćenje, najmanje (KM)")}
          {amount("fineFee", "Obrada kazne (KM)")}
        </div>
        {field(
          "extraKm",
          "Cijena dodatnih kilometara (jedan red po stavci)",
          <textarea rows={3} value={t.extraKm} onChange={(e) => set("extraKm", e.target.value)} />,
        )}
        {msg && <p className={msg.ok ? "ok-box" : "alert"} role="status">{msg.text}</p>}
        <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
          {busy ? "Spremam…" : "Sačuvaj podatke za ugovor"}
        </button>
      </form>
    </section>
  );
}
