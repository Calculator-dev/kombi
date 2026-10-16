"use client";

import { useState } from "react";
import { addDays, eachDate, todayIn } from "@kombi/shared";
import { MONTHS, km, shortDate } from "@/lib/format";
import { BookingRow } from "./BookingRow";
import type { AdminBooking, Block } from "./types";

interface Props {
  bookings: AdminBooking[];
  blocks: Block[];
  onStatus: (id: string, s: "confirmed" | "declined" | "cancelled") => void;
  onRefresh: () => void;
}

export function Overview({ bookings, blocks, onStatus, onRefresh }: Props) {
  const today = todayIn();
  const [offset, setOffset] = useState(0);
  const pending = bookings.filter((b) => b.status === "pending" && !b.holdExpired);
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const upcoming = confirmed.filter((b) => b.start >= today).sort((a, b) => a.start.localeCompare(b.start));

  const [ty, tm] = today.split("-").map(Number) as [number, number];
  const idx = tm - 1 + offset;
  const y = ty + Math.floor(idx / 12);
  const m = ((idx % 12) + 12) % 12;
  const first = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const monthDates = eachDate(first, addDays(first, days - 1));

  const state = new Map<string, string>();
  for (const bl of blocks) for (const d of eachDate(bl.start, bl.end)) state.set(d, "blocked");
  for (const b of pending) for (const d of eachDate(b.start, b.end)) state.set(d, "pending");
  for (const b of confirmed) for (const d of eachDate(b.start, b.end)) state.set(d, "confirmed");

  const busy = monthDates.filter((d) => state.get(d) === "confirmed").length;
  const monthRevenue = confirmed
    .filter((b) => b.start.slice(0, 7) === first.slice(0, 7))
    .reduce((s, b) => s + b.total, 0);
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <h1 className="display h-lg">Pregled</h1>
        <button type="button" className="small-btn" onClick={onRefresh}>Osvježi</button>
      </div>
      <dl className="stats">
        <div className={pending.length ? "hot" : undefined}><dt>Upiti na čekanju</dt><dd>{pending.length}</dd></div>
        <div><dt>Zauzetost, {MONTHS[m]!.toLowerCase()}</dt><dd>{Math.round((busy / days) * 100)}%</dd></div>
        <div><dt>Sljedeće preuzimanje</dt><dd>{upcoming[0] ? shortDate(upcoming[0].start) : "—"}</dd></div>
        <div><dt>Potvrđeno, {MONTHS[m]!.toLowerCase()}</dt><dd>{km(monthRevenue)}</dd></div>
      </dl>
      <div className="two">
        <section aria-labelledby="pending-h">
          <h2 id="pending-h" className="display h-md" style={{ marginBottom: 16 }}>Novi upiti</h2>
          <div className="req-list">
            {pending.length === 0 && <p className="empty">Nema novih upita. Novi upit stiže i na email.</p>}
            {pending.map((b) => <BookingRow key={b.id} b={b} onStatus={onStatus} />)}
          </div>
        </section>
        <section className="panel-dark mini" aria-labelledby="cal-h">
          <div className="t-bar" style={{ marginBottom: 14 }}>
            <h2 id="cal-h" className="display" style={{ fontSize: 40 }}>{MONTHS[m]} {y}</h2>
            <div className="pager">
              <button type="button" aria-label="Prethodni mjesec" onClick={() => setOffset((o) => o - 1)}>←</button>
              <button type="button" aria-label="Sljedeći mjesec" onClick={() => setOffset((o) => o + 1)}>→</button>
            </div>
          </div>
          <div className="wk" aria-hidden="true">
            <span>Po</span><span>Ut</span><span>Sr</span><span>Če</span><span>Pe</span><span>Su</span><span>Ne</span>
          </div>
          <div className="days">
            {Array.from({ length: lead }, (_, i) => <span key={i} />)}
            {monthDates.map((d) => (
              <span key={d} className="day" data-state={state.get(d) ?? (d < today ? "past" : "free")} data-today={d === today}>
                {Number(d.slice(8))}
              </span>
            ))}
          </div>
          <div className="legend" style={{ marginTop: 14 }}>
            <span><i style={{ background: "var(--dark-text)" }} />Potvrđeno</span>
            <span><i className="mine" />Na čekanju</span>
            <span><i className="taken" />Blokirano</span>
          </div>
        </section>
      </div>
    </>
  );
}
