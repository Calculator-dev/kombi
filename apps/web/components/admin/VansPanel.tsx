"use client";

import { useState } from "react";
import { FUELS, GEARBOXES, vanDetailsSchema, type VanDetails } from "@kombi/shared";
import { ApiError, adminApi } from "@/lib/api";
import { km } from "@/lib/format";
import { PhotoManager } from "./PhotoManager";
import { SettingsPanel } from "./SettingsPanel";
import { TermsForm } from "./TermsForm";
import type { Me, OwnerVan } from "./types";

const STATUS = { draft: "Skica", published: "Objavljen" };

interface Props {
  me: Me;
  vans: OwnerVan[];
  onChange: (v: OwnerVan[]) => void;
}

/** The owner's vans; pick one to edit, or add a new one. */
export function VansPanel({ me, vans, onChange }: Props) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const replace = (v: OwnerVan) => onChange(vans.some((x) => x.id === v.id) ? vans.map((x) => (x.id === v.id ? v : x)) : [...vans, v]);

  if (editing === "new") {
    return (
      <>
        <BackLink onClick={() => setEditing(null)} />
        <h1 className="display h-lg">Novi kombi</h1>
        <DetailsForm
          onSaved={(v) => {
            replace(v);
            setEditing(v.id);
          }}
        />
      </>
    );
  }
  const current = vans.find((v) => v.id === editing);
  if (current) {
    return (
      <VanEditor
        me={me}
        van={current}
        onBack={() => setEditing(null)}
        onSaved={replace}
        onDeleted={() => {
          onChange(vans.filter((v) => v.id !== current.id));
          setEditing(null);
        }}
      />
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <h1 className="display h-lg">Kombiji</h1>
        <button type="button" className="btn-dark" onClick={() => setEditing("new")}>+ Dodaj kombi</button>
      </div>
      {vans.length === 0 && (
        <p className="empty">Još nemate kombi. Dodajte ga: osnovni podaci, fotografije, cijene, i objavite.</p>
      )}
      <div className="van-admin-list">
        {vans.map((v) => (
          <button key={v.id} type="button" className="van-admin-row" onClick={() => setEditing(v.id)}>
            {v.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.photos[0].thumbUrl} alt="" width={120} height={90} />
            ) : (
              <span className="no-photo">Bez slike</span>
            )}
            <span className="who">
              <strong>{v.name}</strong>
              <span className="meta dim">
                {v.year}, {v.seats} sjedišta, {v.location} · od {km(v.pricing.dailyRate)}/dan
              </span>
            </span>
            <span className="badge" data-s={v.status === "published" ? "confirmed" : "pending"}>{STATUS[v.status]}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="link" onClick={onClick} style={{ alignSelf: "flex-start" }}>
      ← Svi kombiji
    </button>
  );
}

function VanEditor({
  me,
  van,
  onBack,
  onSaved,
  onDeleted,
}: {
  me: Me;
  van: OwnerVan;
  onBack: () => void;
  onSaved: (v: OwnerVan) => void;
  onDeleted: () => void;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "draft" | "published") {
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await adminApi<OwnerVan>(`/vans/${van.id}/status`, { method: "PATCH", json: { status } }));
      setMsg({
        ok: true,
        text:
          status === "draft"
            ? "Kombi je sakriven sa stranice."
            : me.status === "approved"
              ? "Kombi je objavljen."
              : "Kombi je spreman. Pojavit će se na stranici kad odobrimo vaš račun.",
      });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Nije uspjelo." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Obrisati ${van.name}? Fotografije i cijene se brišu zauvijek.`)) return;
    try {
      await adminApi(`/vans/${van.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Nije obrisano." });
    }
  }

  const live = van.status === "published";
  return (
    <>
      <BackLink onClick={onBack} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 className="display h-lg">{van.name}</h1>
          <p className="mono" style={{ margin: "8px 0 0", color: "var(--muted)" }}>
            {STATUS[van.status]}
            {live && (
              <>
                {" · "}
                <a href={`/kombi/${van.slug}`} target="_blank" rel="noreferrer">/kombi/{van.slug}</a>
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {live ? (
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setStatus("draft")}>Sakrij</button>
          ) : (
            <button type="button" className="btn-dark" disabled={busy} onClick={() => setStatus("published")}>Objavi</button>
          )}
        </div>
      </div>
      {msg && <p className={msg.ok ? "ok-box" : "alert"} role="status">{msg.text}</p>}

      <section>
        <h2 className="display h-md" style={{ marginBottom: 8 }}>Fotografije</h2>
        <PhotoManager van={van} onSaved={onSaved} />
      </section>

      <section>
        <h2 className="display h-md" style={{ marginBottom: 8 }}>Podaci</h2>
        <DetailsForm van={van} onSaved={onSaved} />
      </section>

      <SettingsPanel
        key={van.id}
        settings={van.pricing}
        onSave={async (pricing) => {
          const saved = await adminApi<OwnerVan>(`/vans/${van.id}/pricing`, { method: "PUT", json: pricing });
          onSaved(saved);
          return saved.pricing;
        }}
      />

      <TermsForm key={`terms-${van.id}`} van={van} onSaved={onSaved} />

      <section className="danger-zone">
        <h2 className="display h-md" style={{ marginBottom: 8 }}>Brisanje</h2>
        <p className="lead">Kombi s rezervacijama se ne može obrisati; sakrijte ga umjesto toga.</p>
        <button type="button" className="small-btn" onClick={remove}>Obriši kombi</button>
      </section>
    </>
  );
}

const EMPTY: VanDetails = {
  name: "",
  year: new Date().getFullYear(),
  seats: 9,
  fuel: "Dizel",
  gearbox: "Manuelni",
  engine: "",
  license: "B",
  location: "",
  description: "",
};

function DetailsForm({ van, onSaved }: { van?: OwnerVan; onSaved: (v: OwnerVan) => void }) {
  const [d, setD] = useState<VanDetails>(van ? pick(van) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof VanDetails>(k: K, v: VanDetails[K]) => setD((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = vanDetailsSchema.safeParse(d);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = await adminApi<OwnerVan>(van ? `/vans/${van.id}` : "/vans", { method: van ? "PUT" : "POST", json: r.data });
      onSaved(saved);
      setMsg({ ok: true, text: van ? "Sačuvano." : "Kombi je dodan. Sada dodajte fotografije i cijene." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : "Nije sačuvano." });
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof VanDetails, label: string, input: React.ReactNode) => (
    <label className="field" data-invalid={Boolean(errors[k])}>
      {label}
      {input}
      {errors[k] && <span className="field-error">{errors[k]}</span>}
    </label>
  );
  const int = (v: string) => (v === "" ? 0 : Number(v.replace(/\D/g, "")));

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="fields">
        {field("name", "Naziv (marka i model)", <input value={d.name} placeholder="npr. Toyota Proace Verso 8+1" onChange={(e) => set("name", e.target.value)} />)}
        {field("location", "Grad", <input value={d.location} placeholder="npr. Sarajevo" onChange={(e) => set("location", e.target.value)} />)}
        {field("year", "Godište", <input inputMode="numeric" value={d.year || ""} onChange={(e) => set("year", int(e.target.value))} />)}
        {field("seats", "Broj sjedišta (s vozačem)", <input inputMode="numeric" value={d.seats || ""} onChange={(e) => set("seats", int(e.target.value))} />)}
        {field(
          "fuel",
          "Gorivo",
          <select value={d.fuel} onChange={(e) => set("fuel", e.target.value as VanDetails["fuel"])}>
            {FUELS.map((f) => <option key={f}>{f}</option>)}
          </select>,
        )}
        {field(
          "gearbox",
          "Mjenjač",
          <select value={d.gearbox} onChange={(e) => set("gearbox", e.target.value as VanDetails["gearbox"])}>
            {GEARBOXES.map((g) => <option key={g}>{g}</option>)}
          </select>,
        )}
        {field("engine", "Motor (neobavezno)", <input value={d.engine} placeholder="npr. 2.0 D-4D" onChange={(e) => set("engine", e.target.value)} />)}
        {field("license", "Vozačka kategorija", <input value={d.license} onChange={(e) => set("license", e.target.value)} />)}
      </div>
      {field(
        "description",
        "Opis (oprema, prtljag, napomene)",
        <textarea rows={4} value={d.description} onChange={(e) => set("description", e.target.value)} />,
      )}
      {msg && <p className={msg.ok ? "ok-box" : "alert"} role="status">{msg.text}</p>}
      <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
        {busy ? "Spremam…" : van ? "Sačuvaj podatke" : "Dodaj kombi"}
      </button>
    </form>
  );
}

function pick(v: OwnerVan): VanDetails {
  const { name, year, seats, fuel, gearbox, engine, license, location, description } = v;
  return { name, year, seats, fuel, gearbox, engine, license, location, description };
}
