"use client";

import { useState } from "react";
import type { BookingStatus } from "@kombi/shared";
import { BookingRow } from "./BookingRow";
import { VanSelect } from "./VanSelect";
import type { AdminBooking, OwnerVan } from "./types";

export function BookingList({
  vans,
  bookings,
  onStatus,
}: {
  vans: OwnerVan[];
  bookings: AdminBooking[];
  onStatus: (id: string, s: "confirmed" | "declined" | "cancelled") => void;
}) {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [vanId, setVanId] = useState("");
  const list = bookings.filter((b) => (filter === "all" || b.status === filter) && (!vanId || b.vanId === vanId));
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <h1 className="display h-lg">Rezervacije</h1>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {vans.length > 1 && <VanSelect vans={vans} value={vanId} onChange={setVanId} allLabel="Svi kombiji" />}
        <label className="field" style={{ minWidth: 220 }}>
          Prikaži
          <select value={filter} onChange={(e) => setFilter(e.target.value as BookingStatus | "all")}>
            <option value="all">Sve</option>
            <option value="pending">Na čekanju</option>
            <option value="confirmed">Potvrđene</option>
            <option value="declined">Odbijene</option>
            <option value="cancelled">Otkazane</option>
          </select>
        </label>
        </div>
      </div>
      <div className="req-list">
        {list.length === 0 && <p className="empty">Nema rezervacija u ovoj grupi.</p>}
        {list.map((b) => <BookingRow key={b.id} b={b} onStatus={onStatus} />)}
      </div>
    </>
  );
}
