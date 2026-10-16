"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Settings } from "@kombi/shared";
import { ApiError, api } from "@/lib/api";
import { Logo } from "../Header";
import { BlocksPanel } from "./BlocksPanel";
import { BookingList } from "./BookingList";
import { Overview } from "./Overview";
import { SettingsPanel } from "./SettingsPanel";
import type { AdminBooking, Block } from "./types";

const TABS = [
  ["pregled", "Pregled"],
  ["rezervacije", "Rezervacije"],
  ["blokade", "Blokirani dani"],
  ["cijene", "Cijene"],
] as const;
type Tab = (typeof TABS)[number][0];

export function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("pregled");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, bl, s] = await Promise.all([
        api<AdminBooking[]>("/admin/bookings"),
        api<Block[]>("/admin/blocks"),
        api<Settings>("/admin/settings"),
      ]);
      setBookings(b);
      setBlocks(bl);
      setSettings(s);
      setAuthed(true);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuthed(false);
      else setError(e instanceof Error ? e.message : "Podaci se nisu učitali.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "confirmed" | "declined" | "cancelled") {
    try {
      const updated = await api<AdminBooking>(`/admin/bookings/${id}`, { method: "PATCH", json: { status } });
      setBookings((list) => list.map((b) => (b.id === id ? updated : b)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Promjena nije sačuvana.");
    }
  }

  async function logout() {
    await api("/admin/logout", { method: "POST" }).catch(() => undefined);
    setAuthed(false);
  }

  if (authed === null) return <main className="wrap login"><p className="empty">Učitavam…</p></main>;
  if (!authed) return <Login onDone={load} />;

  return (
    <>
      <header className="header">
        <div className="wrap">
          <Logo href="/admin" />
          <nav className="admin-tabs" aria-label="Admin">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
            <Link href="/" target="_blank">Web stranica</Link>
            <button type="button" onClick={logout}>Odjava</button>
          </nav>
        </div>
      </header>
      <main id="sadrzaj" className="wrap admin">
        {error && <p className="alert" role="alert">{error}</p>}
        {tab === "pregled" && <Overview bookings={bookings} blocks={blocks} onStatus={setStatus} onRefresh={load} />}
        {tab === "rezervacije" && <BookingList bookings={bookings} onStatus={setStatus} />}
        {tab === "blokade" && <BlocksPanel blocks={blocks} onChange={setBlocks} />}
        {tab === "cijene" && settings && <SettingsPanel settings={settings} onSaved={setSettings} />}
      </main>
    </>
  );
}

function Login({ onDone }: { onDone: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/admin/login", { method: "POST", json: { password } });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prijava nije uspjela.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="header"><div className="wrap"><Logo /></div></header>
      <main className="wrap login">
        <h1 className="display h-lg">Admin prijava</h1>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <label className="field" data-invalid={Boolean(error)}>
            Lozinka
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <span className="field-error">{error}</span>}
          </label>
          <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
            {busy ? "Prijavljujem…" : "Prijavi se"}
          </button>
        </form>
      </main>
    </>
  );
}
