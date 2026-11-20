"use client";

import { useEffect, useState } from "react";
import { SERVICE_TITLES, vanServiceSchema, type VanService } from "@kombi/shared";
import { ApiError, adminApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Sarajevo" });
const blank = () => ({ date: today(), title: "Mali servis", km: "", work: "" });

/**
 * Services and repairs of one vehicle. Shown on its public page, so renters
 * see when it was last serviced and what was replaced.
 */
export function ServicesPanel({ vanId }: { vanId: string }) {
  const [list, setList] = useState<VanService[] | null>(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi<VanService[]>(`/vans/${vanId}/services`).then(setList, () => setList([]));
  }, [vanId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = vanServiceSchema.safeParse({ ...form, km: form.km ? Number(form.km) : 0 });
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      setList(
        await adminApi<VanService[]>(editing ? `/vans/${vanId}/services/${editing}` : `/vans/${vanId}/services`, {
          method: editing ? "PUT" : "POST",
          json: r.data,
        }),
      );
      setForm(blank());
      setEditing(null);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Nije sačuvano.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: VanService) {
    if (!confirm(`Obrisati „${s.title}" od ${shortDate(s.date)}?`)) return;
    try {
      setList(await adminApi<VanService[]>(`/vans/${vanId}/services/${s.id}`, { method: "DELETE" }));
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Nije obrisano.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p className="caption" style={{ margin: 0 }}>
        Upišite servise i popravke: kupci ih vide na stranici vozila, pa znaju da je vozilo održavano.
      </p>
      {list && list.length > 0 && (
        <ul className="service-list">
          {list.map((s) => (
            <li key={s.id}>
              <div>
                <strong>{s.title}</strong> <span className="dim">· {shortDate(s.date)}{s.km ? ` · ${s.km.toLocaleString("bs-BA")} km` : ""}</span>
                {s.work && <p>{s.work}</p>}
              </div>
              <div className="btns">
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setEditing(s.id);
                    setForm({ date: s.date, title: s.title, km: s.km ? String(s.km) : "", work: s.work });
                  }}
                >
                  Uredi
                </button>
                <button type="button" className="link" onClick={() => void remove(s)}>Obriši</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={save} className="service-form">
        <div className="fields">
          <label className="field" data-invalid={Boolean(errors.date)}>
            Datum
            <input type="date" value={form.date} max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            {errors.date && <span className="field-error">{errors.date}</span>}
          </label>
          <label className="field" data-invalid={Boolean(errors.title)}>
            Vrsta
            <input list="service-titles" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <datalist id="service-titles">
              {SERVICE_TITLES.map((t) => <option key={t} value={t} />)}
            </datalist>
            {errors.title && <span className="field-error">{errors.title}</span>}
          </label>
          <label className="field">
            Kilometraža (neobavezno)
            <input inputMode="numeric" placeholder="npr. 145000" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value.replace(/\D/g, "").slice(0, 7) })} />
          </label>
        </div>
        <label className="field">
          Šta je urađeno ili zamijenjeno
          <textarea rows={2} maxLength={1000} placeholder="npr. ulje, filter ulja, filter zraka i kabine" value={form.work} onChange={(e) => setForm({ ...form, work: e.target.value })} />
        </label>
        {msg && <p className="alert" role="alert">{msg}</p>}
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-dark" type="submit" disabled={busy}>{editing ? "Sačuvaj izmjenu" : "Dodaj servis"}</button>
          {editing && (
            <button type="button" className="btn-ghost" onClick={() => (setEditing(null), setForm(blank()))}>Odustani</button>
          )}
        </div>
      </form>
    </div>
  );
}
