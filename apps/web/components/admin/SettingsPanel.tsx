"use client";

import { useState } from "react";
import { EXTRA_IDS, PICKUP_IDS, type Settings } from "@kombi/shared";
import { ApiError, api } from "@/lib/api";

const num = (v: string) => (v === "" ? 0 : Math.max(0, Math.round(Number(v))));

export function SettingsPanel({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const [s, setS] = useState<Settings>(settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const top = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const saved = await api<Settings>("/admin/settings", { method: "PUT", json: s });
      onSaved(saved);
      setS(saved);
      setMsg({ ok: true, text: "Sačuvano. Nove cijene vrijede za nove upite." });
    } catch (e) {
      const text = e instanceof ApiError ? Object.entries(e.fields).map(([k, v]) => `${k}: ${v}`).join("; ") || e.message : "Nije sačuvano.";
      setMsg({ ok: false, text });
    } finally {
      setBusy(false);
    }
  }

  const numberField = (label: string, value: number, onChange: (n: number) => void) => (
    <label className="field">
      {label}
      <input inputMode="numeric" value={value} onChange={(e) => onChange(num(e.target.value.replace(/\D/g, "")))} />
    </label>
  );

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <h1 className="display h-lg">Cijene</h1>
        <button type="button" className="btn-dark" onClick={save} disabled={busy}>
          {busy ? "Spremam…" : "Sačuvaj cijene"}
        </button>
      </div>
      {msg && <p className={msg.ok ? "ok-box" : "alert"} role="status">{msg.text}</p>}

      <section className="fields">
        {numberField("Cijena po danu (KM)", s.dailyRate, (n) => top("dailyRate", n))}
        {numberField("Popust 7+ dana (%)", s.weeklyDiscountPct, (n) => top("weeklyDiscountPct", n))}
        {numberField("Depozit (KM)", s.deposit, (n) => top("deposit", n))}
        {numberField("Najmanje dana", s.minDays, (n) => top("minDays", n))}
        {numberField("Najviše dana", s.maxDays, (n) => top("maxDays", n))}
        {numberField("Čuvanje termina za upit (sati)", s.pendingHoldHours, (n) => top("pendingHoldHours", n))}
      </section>

      <section>
        <h2 className="display h-md" style={{ marginBottom: 8 }}>Sezone</h2>
        {s.seasons.map((season, i) => {
          const upd = (patch: Partial<typeof season>) =>
            top("seasons", s.seasons.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div className="season" key={i}>
              <label className="field">Naziv<input value={season.name} onChange={(e) => upd({ name: e.target.value })} /></label>
              <label className="field">Od (MM-DD)<input value={season.from} onChange={(e) => upd({ from: e.target.value })} placeholder="07-01" /></label>
              <label className="field">Do (MM-DD)<input value={season.to} onChange={(e) => upd({ to: e.target.value })} placeholder="08-31" /></label>
              {numberField("KM / dan", season.dailyRate, (n) => upd({ dailyRate: n }))}
              {numberField("Najmanje dana", season.minDays ?? 1, (n) => upd({ minDays: n || 1 }))}
              <button type="button" className="small-btn" onClick={() => top("seasons", s.seasons.filter((_, j) => j !== i))}>Ukloni</button>
            </div>
          );
        })}
        <button
          type="button"
          className="small-btn"
          style={{ marginTop: 16 }}
          onClick={() => top("seasons", [...s.seasons, { name: "Nova sezona", from: "12-20", to: "01-05", dailyRate: s.dailyRate }])}
        >
          + Dodaj sezonu
        </button>
      </section>

      <section>
        <h2 className="display h-md" style={{ marginBottom: 8 }}>Dodaci</h2>
        {EXTRA_IDS.map((id) => {
          const e = s.extras[id];
          const upd = (patch: Partial<typeof e>) => top("extras", { ...s.extras, [id]: { ...e, ...patch } });
          return (
            <div className="season" key={id}>
              <label className="field">Naziv<input value={e.label} onChange={(ev) => upd({ label: ev.target.value })} /></label>
              {e.perDay !== undefined
                ? numberField("KM / dan", e.perDay, (n) => upd({ perDay: n }))
                : numberField("KM jednokratno", e.flat ?? 0, (n) => upd({ flat: n }))}
              <label className="check"><input type="checkbox" checked={e.enabled} onChange={(ev) => upd({ enabled: ev.target.checked })} />Nudi se</label>
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="display h-md" style={{ marginBottom: 8 }}>Preuzimanje</h2>
        {PICKUP_IDS.map((id) => {
          const p = s.pickup[id];
          const upd = (patch: Partial<typeof p>) => top("pickup", { ...s.pickup, [id]: { ...p, ...patch } });
          return (
            <div className="season" key={id}>
              <label className="field">Naziv<input value={p.label} onChange={(ev) => upd({ label: ev.target.value })} /></label>
              {numberField("Naknada (KM)", p.fee, (n) => upd({ fee: n }))}
              <label className="check"><input type="checkbox" checked={p.enabled} disabled={id === "office"} onChange={(ev) => upd({ enabled: ev.target.checked })} />Nudi se</label>
            </div>
          );
        })}
      </section>
    </>
  );
}
