"use client";

import { useState } from "react";
import { ApiError, adminApi } from "@/lib/api";
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
  // A confirmed rental whose return day has come can be rated by the customer.
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Sarajevo" });
  const over = b.status === "confirmed" && b.end <= today;
  const [asked, setAsked] = useState(Boolean(b.reviewRequestedAt));
  const [busy, setBusy] = useState(false);
  async function askReview() {
    setBusy(true);
    try {
      await adminApi(`/bookings/${b.id}/review-request`, { method: "POST" });
      setAsked(true);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Email nije poslan. Pokušajte ponovo.");
    } finally {
      setBusy(false);
    }
  }
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
          {shortDate(b.start)} → {shortDate(b.end)}, {b.quote.days} dana, <strong>{b.quote.onRequest ? "cijena po dogovoru" : km(b.total)}</strong>
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
        {(b.status === "pending" || b.status === "confirmed") && (
          <a className="small-btn" href={`/admin/ugovor?id=${b.id}`} target="_blank" rel="noopener">Ugovor</a>
        )}
        {b.status === "pending" && (
          <>
            <button type="button" className="small-btn" onClick={() => onStatus(b.id, "declined")}>Odbij</button>
            <button type="button" className="small-btn dark" onClick={() => onStatus(b.id, "confirmed")}>Potvrdi</button>
          </>
        )}
        {over && (
          <button
            type="button"
            className="small-btn"
            disabled={busy}
            title="Kupcu šaljemo email s linkom za ocjenu. Ocjena se objavljuje na stranici vozila."
            onClick={() => (!asked || confirm("Ocjena je već zatražena. Poslati email ponovo?")) && void askReview()}
          >
            {asked ? "Ocjena zatražena ✓" : "Zatraži ocjenu"}
          </button>
        )}
        {b.status === "confirmed" && !over && (
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
