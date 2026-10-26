"use client";

import { useEffect, useState } from "react";
import type { UserStatus } from "@kombi/shared";
import { adminApi } from "@/lib/api";
import type { Me, OwnerVan } from "./types";

const STATUS: Record<UserStatus, string> = { pending: "Čeka odobrenje", approved: "Odobren", suspended: "Suspendovan" };
const BADGE: Record<UserStatus, string> = { pending: "pending", approved: "confirmed", suspended: "declined" };

/** Platform admins: approve or suspend owners, and decide who runs each van. */
export function UsersPanel({ vans, onVansChange }: { vans: OwnerVan[]; onVansChange: (v: OwnerVan[]) => void }) {
  const [users, setUsers] = useState<Me[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi<Me[]>("/users").then(setUsers, (e) => setError(e instanceof Error ? e.message : "Nije učitano."));
  }, []);

  async function setStatus(u: Me, status: UserStatus) {
    if (status === "suspended" && !confirm(`Suspendovati ${u.name ?? u.email}? Njegovi kombiji nestaju sa stranice.`)) return;
    try {
      const updated = await adminApi<Me>(`/users/${u.id}`, { method: "PATCH", json: { status } });
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nije sačuvano.");
    }
  }

  async function setOwner(van: OwnerVan, ownerId: string) {
    try {
      const updated = await adminApi<OwnerVan>(`/vans/${van.id}/owner`, { method: "PATCH", json: { ownerId: ownerId || null } });
      onVansChange(vans.map((v) => (v.id === van.id ? updated : v)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nije sačuvano.");
    }
  }

  const owners = users.filter((u) => u.role === "owner");
  return (
    <>
      <h1 className="display h-lg">Vlasnici</h1>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="req-list">
        {owners.length === 0 && <p className="empty">Još nema vlasnika. Prijava je na /admin → „Napravite račun“.</p>}
        {owners.map((u) => (
          <article className="req" key={u.id}>
            <div className="who">
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{u.name ?? "(bez imena)"}</strong>
                <span className="badge" data-s={BADGE[u.status]}>{STATUS[u.status]}</span>
              </div>
              <div className="meta dim">
                {u.email}
                {u.phone ? `, ${u.phone}` : ""} · kombija: {vans.filter((v) => v.ownerId === u.id).length}
              </div>
            </div>
            <div className="btns">
              {u.status !== "approved" && <button type="button" className="small-btn dark" onClick={() => setStatus(u, "approved")}>Odobri</button>}
              {u.status !== "suspended" && <button type="button" className="small-btn" onClick={() => setStatus(u, "suspended")}>Suspenduj</button>}
            </div>
          </article>
        ))}
      </div>

      <section>
        <h2 className="display h-md" style={{ marginBottom: 8 }}>Ko vodi koji kombi</h2>
        <div className="req-list">
          {vans.map((v) => (
            <div className="req" key={v.id}>
              <div className="who"><strong>{v.name}</strong><span className="meta dim">{v.location}</span></div>
              <label className="field" style={{ minWidth: 240 }}>
                Vlasnik
                <select value={v.ownerId ?? ""} onChange={(e) => setOwner(v, e.target.value)}>
                  <option value="">Platforma (kombi.ba)</option>
                  {owners.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
