"use client";

import { km, shortDate } from "@/lib/format";
import type { AdminBooking } from "./types";

const STATUS: Record<string, string> = {
  pending: "Na čekanju",
  confirmed: "Potvrđeno",
  declined: "Odbijeno",
  cancelled: "Otkazano",
  expired: "Isteklo čekanje",
};
const CHANNEL: Record<string, string> = { viber: "Viber", whatsapp: "WhatsApp", email: "Email", phone: "Poziv" };
const PICKUP: Record<string, string> = { office: "Naša lokacija", address: "Adresa", airport: "Aerodrom" };

export function contactHref(b: AdminBooking): string {
  const digits = b.phone.replace(/[^\d+]/g, "");
  if (b.contactChannel === "whatsapp") return `https://wa.me/${digits.replace("+", "")}`;
  if (b.contactChannel === "viber") return `viber://chat?number=${encodeURIComponent(digits)}`;
  if (b.contactChannel === "email") return `mailto:${b.email}`;
  return `tel:${digits}`;
}

export function BookingRow({
  b,
  onStatus,
}: {
  b: AdminBooking;
  onStatus: (id: string, s: "confirmed" | "declined" | "cancelled") => void;
}) {
  const s = b.status === "pending" && b.holdExpired ? "expired" : b.status;
  const extras = b.quote.extraLines.map((l) => l.label);
  return (
    <article className="req">
      <div className="who">
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <strong>{b.name}</strong>
          <span className="badge" data-s={s}>{STATUS[s]}</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{b.ref} · {b.vanName}</span>
        </div>
        <div className="meta">
          {shortDate(b.start)} → {shortDate(b.end)}, {b.quote.days} dana, <strong>{km(b.total)}</strong>
        </div>
        <div className="meta dim">
          {[
            ...extras,
            (b.quote.pickupLabel ?? PICKUP[b.pickup] ?? b.pickup) + (b.pickupAddress ? `: ${b.pickupAddress}` : ""),
            b.pickupTime ? `u ${b.pickupTime}` : null,
          ]
            .filter(Boolean)
            .join(", ")}
        </div>
        <div className="meta dim">
          <a href={contactHref(b)}>{CHANNEL[b.contactChannel]}: {b.phone}</a>, <a href={`mailto:${b.email}`}>{b.email}</a>
          {b.licenseSince ? `, vozačka od ${b.licenseSince}.` : ""}
        </div>
        {b.notes && <div className="meta dim">„{b.notes}"</div>}
      </div>
      <div className="btns">
        {b.status === "pending" && (
          <>
            <button type="button" className="small-btn" onClick={() => onStatus(b.id, "declined")}>Odbij</button>
            <button type="button" className="small-btn dark" onClick={() => onStatus(b.id, "confirmed")}>Potvrdi</button>
          </>
        )}
        {b.status === "confirmed" && (
          <button
            type="button"
            className="small-btn"
            onClick={() => confirm(`Otkazati rezervaciju ${b.ref}? Termin postaje slobodan.`) && onStatus(b.id, "cancelled")}
          >
            Otkaži
          </button>
        )}
      </div>
    </article>
  );
}
