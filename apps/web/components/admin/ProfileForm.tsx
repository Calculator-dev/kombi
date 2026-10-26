"use client";

import { useState } from "react";
import { profileSchema } from "@kombi/shared";
import { ApiError, adminApi } from "@/lib/api";
import type { Me } from "./types";

export function ProfileForm({ me, onSaved }: { me: Me; onSaved: (m: Me) => void }) {
  const [name, setName] = useState(me.name ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = profileSchema.safeParse({ name, phone });
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
      {msg && <p className="ok-box" role="status">{msg}</p>}
      <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
        {busy ? "Spremam…" : "Sačuvaj"}
      </button>
    </form>
  );
}
