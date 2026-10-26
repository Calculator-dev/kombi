"use client";

import { useState } from "react";
import { MAX_EXTRAS, MAX_PICKUPS, type Settings } from "@kombi/shared";
import { ApiError } from "@/lib/api";

const num = (v: string) => (v === "" ? 0 : Math.max(0, Math.round(Number(v))));
/** Key for a new option. Bookings keep the key, so it never changes once saved. */
const newId = () => `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A van's prices, seasons, extras and pickup places. */
export function SettingsPanel({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => Promise<Settings> }) {
  const [s, setS] = useState<Settings>(settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const top = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      setS(await onSave(s));
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
        <h2 className="display h-md">Cijene</h2>
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
        {s.extras.map((e, i) => {
          const upd = (patch: Partial<typeof e>) => top("extras", s.extras.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          const perDay = e.perDay !== undefined;
          return (
            <div className="season" key={e.id}>
              <label className="field">Naziv<input value={e.label} onChange={(ev) => upd({ label: ev.target.value })} /></label>
              <label className="field">
                Naplata
                <select
                  value={perDay ? "perDay" : "flat"}
                  onChange={(ev) =>
                    upd(ev.target.value === "perDay" ? { perDay: e.flat ?? 0, flat: undefined } : { flat: e.perDay ?? 0, perDay: undefined })
                  }
                >
                  <option value="perDay">Po danu</option>
                  <option value="flat">Jednokratno</option>
                </select>
              </label>
              {perDay
                ? numberField("KM / dan", e.perDay ?? 0, (n) => upd({ perDay: n }))
                : numberField("KM jednokratno", e.flat ?? 0, (n) => upd({ flat: n }))}
              <label className="check"><input type="checkbox" checked={e.enabled} onChange={(ev) => upd({ enabled: ev.target.checked })} />Nudi se</label>
              <button type="button" className="small-btn" onClick={() => top("extras", s.extras.filter((_, j) => j !== i))}>Ukloni</button>
            </div>
          );
        })}
        {s.extras.length < MAX_EXTRAS && (
          <button
            type="button"
            className="small-btn"
            style={{ marginTop: 16 }}
            onClick={() => top("extras", [...s.extras, { id: newId(), label: "Novi dodatak", flat: 0, enabled: true }])}
          >
            + Dodaj dodatak
          </button>
        )}
      </section>

      <section>
        <h2 className="display h-md" style={{ marginBottom: 8 }}>Preuzimanje</h2>
        {s.pickup.map((p, i) => {
          const upd = (patch: Partial<typeof p>) => top("pickup", s.pickup.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div className="season" key={p.id}>
              <label className="field">Naziv<input value={p.label} onChange={(ev) => upd({ label: ev.target.value })} /></label>
              {numberField("Naknada (KM)", p.fee, (n) => upd({ fee: n }))}
              <label className="field">
                Kupac upisuje (prazno = ništa)
                <input value={p.detailsLabel} placeholder="npr. Adresa preuzimanja" onChange={(ev) => upd({ detailsLabel: ev.target.value })} />
              </label>
              <label className="check"><input type="checkbox" checked={p.enabled} onChange={(ev) => upd({ enabled: ev.target.checked })} />Nudi se</label>
              {s.pickup.length > 1 && (
                <button type="button" className="small-btn" onClick={() => top("pickup", s.pickup.filter((_, j) => j !== i))}>Ukloni</button>
              )}
            </div>
          );
        })}
        {s.pickup.length < MAX_PICKUPS && (
          <button
            type="button"
            className="small-btn"
            style={{ marginTop: 16 }}
            onClick={() => top("pickup", [...s.pickup, { id: newId(), label: "Novo mjesto", fee: 0, detailsLabel: "", enabled: true }])}
          >
            + Dodaj mjesto preuzimanja
          </button>
        )}
      </section>
    </>
  );
}
