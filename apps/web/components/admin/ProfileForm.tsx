"use client";

import { useState } from "react";
import { DOCUMENT_KINDS, DOCUMENT_LABELS, KEEP_DOCUMENTS_DAYS, NO_DOCUMENTS, profileSchema, type DocumentRule, type DocumentRules } from "@kombi/shared";
import { ApiError, adminApi } from "@/lib/api";
import { LogoUpload } from "./LogoUpload";
import type { Me } from "./types";

export function ProfileForm({ me, onSaved }: { me: Me; onSaved: (m: Me) => void }) {
  const [name, setName] = useState(me.name ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [address, setAddress] = useState(me.address ?? "");
  const [companyId, setCompanyId] = useState(me.companyId ?? "");
  const [representative, setRepresentative] = useState(me.representative ?? "");
  const [vatRegistered, setVatRegistered] = useState(Boolean(me.vatRegistered));
  const [documents, setDocuments] = useState<DocumentRules>(me.documents ?? NO_DOCUMENTS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = profileSchema.safeParse({ name, phone, address, companyId, representative, vatRegistered, documents });
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      onSaved(await adminApi<Me>("/me", { method: "PUT", json: r.data }));
      setMsg("Sačuvano.");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Nije sačuvano.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <LogoUpload me={me} onSaved={onSaved} />
      <div className="fields">
        <label className="field" data-invalid={Boolean(errors.name)}>
          Ime i prezime ili firma
          <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label className="field" data-invalid={Boolean(errors.phone)}>
          Telefon (Viber / WhatsApp)
          <input type="tel" autoComplete="tel" placeholder="+387" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </label>
      </div>
      <div className="fields">
        <label className="field">
          Adresa (za ugovor, neobavezno)
          <input autoComplete="street-address" placeholder="Ulica i broj, poštanski broj i mjesto" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="field">
          ID broj firme ili obrta (neobavezno)
          <input inputMode="numeric" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
        </label>
        <label className="field">
          Zastupanje (neobavezno)
          <input placeholder="npr. zastupana po vlasniku obrta Imenu Prezimenu" value={representative} onChange={(e) => setRepresentative(e.target.value)} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={vatRegistered} onChange={(e) => setVatRegistered(e.target.checked)} />
        U sistemu sam PDV-a: cijene mojih vozila uključuju PDV
      </label>
      <p className="caption" style={{ marginTop: -16 }}>
        Na oglasu piše „Cijene uključuju PDV" ili „Iznajmljivač nije u sistemu PDV-a", zavisno od ovoga. Stavka „PDV" u
        listi „Uključeno u cijenu" prikazuje se samo ako ste obveznik.
      </p>
      <fieldset className="doc-rules">
        <legend>Dokumenti uz upit za rezervaciju</legend>
        <p className="caption">
          Kupac uz upit šalje fotografiju dokumenta. Vidite je samo vi, u rezervaciji. Fotografije se čuvaju šifrovane i
          brišu se same kad odbijete ili otkažete upit, odnosno {KEEP_DOCUMENTS_DAYS} dana nakon povratka vozila.
        </p>
        <div className="fields">
          {DOCUMENT_KINDS.map((k) => (
            <label key={k} className="field">
              {DOCUMENT_LABELS[k]}
              <select value={documents[k]} onChange={(e) => setDocuments((d) => ({ ...d, [k]: e.target.value as DocumentRule }))}>
                <option value="off">Ne tražim</option>
                <option value="optional">Neobavezno: kupac može poslati</option>
                <option value="required">Obavezno: bez toga nema upita</option>
              </select>
            </label>
          ))}
        </div>
      </fieldset>
      {msg && <p className="ok-box" role="status">{msg}</p>}
      <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
        {busy ? "Spremam…" : "Sačuvaj"}
      </button>
    </form>
  );
}
