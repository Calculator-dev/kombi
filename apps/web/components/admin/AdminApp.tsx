"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, adminApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Logo } from "../Header";
import { AuthScreens, NewPassword } from "./AuthScreens";
import { BlocksPanel } from "./BlocksPanel";
import { BookingList } from "./BookingList";
import { Overview } from "./Overview";
import { ProfileForm } from "./ProfileForm";
import { UsersPanel } from "./UsersPanel";
import { VansPanel } from "./VansPanel";
import type { AdminBooking, Block, Me, OwnerVan } from "./types";

const TABS = [
  ["pregled", "Pregled"],
  ["rezervacije", "Rezervacije"],
  ["kombiji", "Kombiji"],
  ["blokade", "Blokirani dani"],
  ["vlasnici", "Vlasnici"],
  ["profil", "Profil"],
] as const;
type Tab = (typeof TABS)[number][0];

type Session = "loading" | "out" | "recovery" | "in";

export function AdminApp() {
  const [session, setSession] = useState<Session>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>("pregled");
  const [vans, setVans] = useState<OwnerVan[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, v, b, bl] = await Promise.all([
        adminApi<Me>("/me"),
        adminApi<OwnerVan[]>("/vans"),
        adminApi<AdminBooking[]>("/bookings"),
        adminApi<Block[]>("/blocks"),
      ]);
      setMe(m);
      setVans(v);
      setBookings(b);
      setBlocks(bl);
      setError(null);
      if (!v.length) setTab((t) => (t === "pregled" ? "kombiji" : t));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setSession("out");
      else setError(e instanceof Error ? e.message : "Podaci se nisu učitali.");
    }
  }, []);

  useEffect(() => {
    let auth;
    try {
      auth = supabase().auth;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSession("out");
      return;
    }
    const { data } = auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setSession("recovery");
      else if (event === "SIGNED_OUT" || !s) setSession("out");
      else setSession((cur) => (cur === "recovery" ? cur : "in"));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === "in") void load();
  }, [session, load]);

  async function setStatus(id: string, status: "confirmed" | "declined" | "cancelled") {
    try {
      const updated = await adminApi<AdminBooking>(`/bookings/${id}`, { method: "PATCH", json: { status } });
      setBookings((list) => list.map((b) => (b.id === id ? updated : b)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Promjena nije sačuvana.");
    }
  }

  async function logout() {
    await supabase().auth.signOut();
    setMe(null);
  }

  if (session === "loading") return <main className="wrap login"><p className="empty">Učitavam…</p></main>;
  if (session === "recovery") return <NewPassword onDone={() => setSession("in")} />;
  if (session === "out") return <>{error && <p className="alert wrap">{error}</p>}<AuthScreens /></>;
  if (!me) return <main className="wrap login">{error ? <p className="alert" role="alert">{error}</p> : <p className="empty">Učitavam…</p>}</main>;

  // A new owner fills in who they are before anything else.
  if (!me.name || !me.phone) {
    return (
      <>
        <header className="header"><div className="wrap"><Logo href="/admin" /></div></header>
        <main className="wrap login">
          <h1 className="display h-lg">Dobrodošli</h1>
          <p className="lead">Upišite ime (ili naziv firme) i telefon. Kupci ih vide kad potvrdite rezervaciju.</p>
          <ProfileForm me={me} onSaved={setMe} />
        </main>
      </>
    );
  }

  const tabs = TABS.filter(([id]) => id !== "vlasnici" || me.role === "admin");
  return (
    <>
      <header className="header">
        <div className="wrap">
          <Logo href="/admin" />
          <nav className="admin-tabs" aria-label="Admin">
            {tabs.map(([id, label]) => (
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
        {me.status === "pending" && (
          <p className="note-box" role="status">
            Vaš račun čeka odobrenje. Već sada možete dodati kombi, fotografije i cijene; na stranici se pojavljuje nakon odobrenja.
          </p>
        )}
        {error && <p className="alert" role="alert">{error}</p>}
        {tab === "pregled" && <Overview vans={vans} bookings={bookings} blocks={blocks} onStatus={setStatus} onRefresh={load} />}
        {tab === "rezervacije" && <BookingList vans={vans} bookings={bookings} onStatus={setStatus} />}
        {tab === "kombiji" && <VansPanel me={me} vans={vans} onChange={setVans} />}
        {tab === "blokade" && <BlocksPanel vans={vans} blocks={blocks} onChange={setBlocks} />}
        {tab === "vlasnici" && me.role === "admin" && <UsersPanel vans={vans} onVansChange={setVans} />}
        {tab === "profil" && (
          <>
            <h1 className="display h-lg">Profil</h1>
            <p className="lead">{me.email}</p>
            <ProfileForm me={me} onSaved={setMe} />
          </>
        )}
      </main>
    </>
  );
}
