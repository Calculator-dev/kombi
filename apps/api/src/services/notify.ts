import nodemailer, { type Transporter } from "nodemailer";
import type { Config } from "../config";
import type { Booking } from "./bookings";

export interface Notifier {
  /** `ownerEmail`: the van's owner; null for vans the platform runs itself. */
  bookingRequested(b: Booking, ownerEmail: string | null): Promise<void>;
  bookingConfirmed(b: Booking): Promise<void>;
  /** After the rental: asks the customer to rate it. */
  reviewRequest(b: Booking): Promise<void>;
  /** The customer has filmed all four sides at return. */
  renterFilmedReturn(b: Pick<Booking, "ref" | "vanName" | "name" | "start" | "end">, ownerEmail: string | null): Promise<void>;
}

const CHANNEL: Record<string, string> = { viber: "Viber", whatsapp: "WhatsApp", email: "Email", phone: "Poziv" };
const price = (b: Booking) => (b.quote.onRequest ? "cijena po dogovoru" : `${b.total} KM`);
const fmt = (d: string) => d.split("-").reverse().join(".") + ".";

type Send = (to: string[], subject: string, text: string) => Promise<void>;

/** Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
function resendSender(apiKey: string, from: string, fetchImpl: typeof fetch): Send {
  return async (to, subject, text) => {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(`Resend answered ${res.status}: ${body.message ?? res.statusText}`);
    }
  };
}

function smtpSender(config: Config): Send {
  const transport: Transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  });
  return async (to, subject, text) => {
    await transport.sendMail({ from: config.SMTP_FROM, to: to.join(", "), subject, text });
  };
}

/**
 * Sends emails through Resend when RESEND_API_KEY is set, else through SMTP
 * when SMTP_HOST is set, else prints them to the console so nothing is lost
 * during development. Viber/WhatsApp messages can be added here later (e.g.
 * via the Viber Business API).
 */
export function createNotifier(config: Config, fetchImpl: typeof fetch = fetch): Notifier {
  const deliver: Send | null = config.RESEND_API_KEY
    ? resendSender(config.RESEND_API_KEY, config.SMTP_FROM, fetchImpl)
    : config.SMTP_HOST
      ? smtpSender(config)
      : null;

  async function send(to: string | string[] | null | undefined, subject: string, text: string) {
    const recipients = [...new Set([to].flat().filter((e): e is string => Boolean(e)))];
    if (!recipients.length) return;
    if (!deliver) {
      if (config.NODE_ENV !== "test") console.info(`[email → ${recipients.join(", ")}] ${subject}\n${text}\n`);
      return;
    }
    try {
      await deliver(recipients, subject, text);
    } catch (err) {
      // A failed email must never fail the booking itself.
      console.error("[email] failed:", err);
    }
  }

  return {
    async bookingRequested(b, ownerEmail) {
      // The owner decides; the platform gets a copy.
      await send(
        [ownerEmail, config.OWNER_EMAIL].filter((e): e is string => Boolean(e)),
        `Novi upit ${b.ref} za ${b.vanName}: ${fmt(b.start)} – ${fmt(b.end)}, ${price(b)}`,
        [
          `${b.name} šalje upit za ${b.vanName}, ${fmt(b.start)} – ${fmt(b.end)} (${b.quote.days} dana).`,
          b.quote.onRequest ? "Cijena: po dogovoru s kupcem" : `Ukupno: ${b.total} KM`,
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
        `Zdravo ${b.name},\n\nprimili smo upit za ${b.vanName}, ${fmt(b.start)} – ${fmt(b.end)}, ${b.quote.onRequest ? price(b) : `ukupno ${price(b)}`}.\n` +
          `Termin čuvamo za vas dok ga ne potvrdimo. Javit ćemo vam se uskoro.\n\nkombi.ba`,
      );
    },
    async bookingConfirmed(b) {
      await send(
        b.email,
        `kombi.ba — rezervacija ${b.ref} je potvrđena`,
        `Zdravo ${b.name},\n\nvaša rezervacija za ${b.vanName}, ${fmt(b.start)} – ${fmt(b.end)} je potvrđena.\n` +
          `${b.quote.onRequest ? "Cijena: po dogovoru" : `Ukupno: ${b.total} KM`}, depozit ${b.quote.deposit} KM pri preuzimanju.\n` +
          `Javit ćemo vam se da dogovorimo tačno mjesto i vrijeme preuzimanja.\n\n` +
          `Ugovor o najmu možete pročitati prije preuzimanja (link je samo vaš, ne prosljeđujte ga):\n` +
          `${config.WEB_ORIGIN}/ugovor/${b.contractToken}\n\n` +
          `Kad vraćate vozilo, na istom linku snimite telefonom kratak video svake strane vozila. To je vaš dokaz o stanju u kojem ste ga vratili.\n\nkombi.ba`,
      );
    },
    async renterFilmedReturn(b, ownerEmail) {
      await send(
        [ownerEmail, config.OWNER_EMAIL].filter((e): e is string => Boolean(e)),
        `${b.ref}: kupac je snimio vozilo pri povratku`,
        `${b.name} je snimio/la sve četiri strane vozila ${b.vanName} pri povratku (${fmt(b.start)} – ${fmt(b.end)}).\n` +
          `Videi su u rezervaciji, pod „Zapisnik o stanju vozila”: ${config.WEB_ORIGIN}/admin`,
      );
    },
    async reviewRequest(b) {
      await send(
        b.email,
        `kombi.ba — kako je bilo s vozilom ${b.vanName}?`,
        `Zdravo ${b.name.split(" ")[0]},\n\nhvala što ste vozili ${b.vanName} (${fmt(b.start)} – ${fmt(b.end)}).\n` +
          `Ocijenite najam u pola minute. Ocjena pomaže drugima da izaberu, a vlasniku da bude još bolji:\n` +
          `${config.WEB_ORIGIN}/ocjena/${b.reviewToken}\n\nOcjene mogu ostaviti samo kupci koji su stvarno iznajmili vozilo.\n\nkombi.ba`,
      );
    },
  };
}
