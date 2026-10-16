"use client";

import { useState } from "react";
import type { BookingStatus } from "@kombi/shared";
import { BookingRow } from "./BookingRow";
import type { AdminBooking } from "./types";

export function BookingList({
  bookings,
  onStatus,
}: {
  bookings: AdminBooking[];
  onStatus: (id: string, s: "confirmed" | "declined" | "cancelled") => void;
}) {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const list = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <h1 className="display h-lg">Rezervacije</h1>
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
      <div className="req-list">
        {list.length === 0 && <p className="empty">Nema rezervacija u ovoj grupi.</p>}
        {list.map((b) => <BookingRow key={b.id} b={b} onStatus={onStatus} />)}
      </div>
    </>
  );
}
