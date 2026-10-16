import { z } from "zod";
import { isIsoDate } from "./dates";
import { MAX_EXTRAS, findPickup, optionId, type Settings } from "./settings";

export const CONTACT_CHANNELS = ["viber", "whatsapp", "email", "phone"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const BOOKING_STATUSES = ["pending", "confirmed", "declined", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const isoDate = z.string().refine(isIsoDate, "Neispravan datum");

/**
 * What the public booking form sends to the API. Depends on the settings,
 * because each pickup option decides whether the customer must add details.
 */
export function bookingRequestSchema(settings: Settings) {
  return z
    .object({
      start: isoDate,
      end: isoDate,
      extras: z.array(optionId).max(MAX_EXTRAS).default([]),
      pickup: optionId,
      pickupAddress: z.string().trim().max(200).optional(),
      pickupTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      returnTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      name: z.string().trim().min(3, "Upišite ime i prezime").max(100),
      email: z.email("Neispravan email").max(200),
      phone: z.string().trim().regex(/^\+?[\d\s/-]{6,20}$/, "Neispravan broj telefona"),
      contactChannel: z.enum(CONTACT_CHANNELS),
      birthDate: isoDate.optional(),
      licenseSince: z.number().int().min(1950).max(2100).optional(),
      notes: z.string().trim().max(1000).optional(),
      acceptTerms: z.literal(true, { error: "Potrebno je prihvatiti uslove najma" }),
      /** Honeypot: real people never fill this hidden field. */
      website: z.string().max(200).optional(),
    })
    .refine(
      (b) =>
        !findPickup(settings, b.pickup)?.detailsLabel ||
        (typeof b.pickupAddress === "string" && b.pickupAddress.length >= 3),
      {
        path: ["pickupAddress"],
        message: "Upišite adresu ili broj leta",
        // Also report this while other fields are still invalid, so the form shows every problem at once.
        when: (payload) => typeof payload.value === "object" && payload.value !== null,
      },
    );
}
export type BookingRequest = z.infer<ReturnType<typeof bookingRequestSchema>>;

export interface Availability {
  from: string;
  to: string;
  /** Every date (YYYY-MM-DD) on which the van is not available. */
  unavailable: string[];
}
