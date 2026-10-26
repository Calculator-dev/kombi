import nodemailer, { type Transporter } from "nodemailer";
import type { Config } from "../config";
import type { Booking } from "./bookings";

export interface Notifier {
  /** `ownerEmail`: the van's owner; null for vans the platform runs itself. */
  bookingRequested(b: Booking, ownerEmail: string | null): Promise<void>;
  bookingConfirmed(b: Booking): Promise<void>;
}

const CHANNEL: Record<string, string> = { viber: "Viber", whatsapp: "WhatsApp", email: "Email", phone: "Poziv" };
const fmt = (d: string) => d.split("-").reverse().join(".") + ".";

/**
 * Sends emails when SMTP is configured, otherwise prints them to the console
 * so nothing is lost during development. Viber/WhatsApp messages can be added
 * here later (e.g. via the Viber Business API).
 */
export function createNotifier(config: Config): Notifier {
  const transport: Transporter | null = config.SMTP_HOST
    ? nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
      })
    : null;

  async function send(to: string | undefined, subject: string, text: string) {
    if (!to) return;
    if (!transport) {
      if (config.NODE_ENV !== "test") console.info(`[email → ${to}] ${subject}\n${text}\n`);
      return;
    }
    try {
      await transport.sendMail({ from: config.SMTP_FROM, to, subject, text });
    } catch (err) {
      // A failed email must never fail the booking itself.
      console.error("[email] failed:", err);
    }
  }

  return {
    async bookingRequested(b, ownerEmail) {
      // The owner decides; the platform gets a copy.
      const to = [...new Set([ownerEmail, config.OWNER_EMAIL].filter((e): e is string => Boolean(e)))].join(", ");
      await send(
        to || undefined,
        `Novi upit ${b.ref} za ${b.vanName}: ${fmt(b.start)} – ${fmt(b.end)}, ${b.total} KM`,
        [
          `${b.name} šalje upit za ${b.vanName}, ${fmt(b.start)} – ${fmt(b.end)} (${b.quote.days} dana).`,
          `Ukupno: ${b.total} KM`,
          b.quote.extraLines.length ? `Dodaci: ${b.quote.extraLines.map((l) => l.label).join(", ")}` : "",
          `Kontakt: ${b.phone} (${CHANNEL[b.contactChannel] ?? b.contactChannel}), ${b.email}`,
          `Preuzimanje: ${b.quote.pickupLabel ?? b.pickup}${b.pickupAddress ? `, ${b.pickupAddress}` : ""}${b.pickupTime ? ` u ${b.pickupTime}` : ""}`,
          b.notes ? `Napomena: ${b.notes}` : "",
          "",
          `Potvrdite ili odbijte: ${config.WEB_ORIGIN}/admin`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      await send(
        b.email,
        `kombi.ba — primili smo vaš upit ${b.ref}`,
        `Zdravo ${b.name},\n\nprimili smo upit za ${b.vanName}, ${fmt(b.start)} – ${fmt(b.end)}, ukupno ${b.total} KM.\n` +
          `Termin čuvamo za vas dok ga ne potvrdimo. Javit ćemo vam se uskoro.\n\nkombi.ba`,
      );
    },
    async bookingConfirmed(b) {
      await send(
        b.email,
        `kombi.ba — rezervacija ${b.ref} je potvrđena`,
        `Zdravo ${b.name},\n\nvaša rezervacija za ${b.vanName}, ${fmt(b.start)} – ${fmt(b.end)} je potvrđena.\n` +
          `Ukupno: ${b.total} KM, depozit ${b.quote.deposit} KM pri preuzimanju.\n` +
          `Javit ćemo vam se da dogovorimo tačno mjesto i vrijeme preuzimanja.\n\nkombi.ba`,
      );
    },
  };
}
