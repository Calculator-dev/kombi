import { z } from "zod";

const monthDay = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Format MM-DD");
const money = z.number().int().min(0).max(100_000);

/** Stable key of an extra or pickup option; bookings store it. */
export const optionId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "Neispravan ključ opcije");

export const MAX_EXTRAS = 20;
export const MAX_PICKUPS = 10;

export const seasonSchema = z.object({
  name: z.string().min(1).max(60),
  from: monthDay,
  to: monthDay,
  dailyRate: money,
  minDays: z.number().int().min(1).max(60).optional(),
});
export type Season = z.infer<typeof seasonSchema>;

export const extraSchema = z
  .object({
    id: optionId,
    label: z.string().trim().min(1).max(80),
    perDay: money.optional(),
    flat: money.optional(),
    enabled: z.boolean().default(true),
  })
  .refine((e) => (e.perDay === undefined) !== (e.flat === undefined), {
    message: "Dodatak ima ili cijenu po danu ili jednokratnu cijenu",
  });
export type Extra = z.infer<typeof extraSchema>;

export const pickupSchema = z.object({
  id: optionId,
  label: z.string().trim().min(1).max(80),
  fee: money,
  /** Label of the field the customer must fill in (address, flight number). Empty: nothing to fill in. */
  detailsLabel: z.string().trim().max(80).default(""),
  enabled: z.boolean().default(true),
});
export type Pickup = z.infer<typeof pickupSchema>;

const uniqueIds = (what: string) => (list: { id: string }[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  for (const { id } of list) {
    if (seen.has(id)) ctx.addIssue({ code: "custom", message: `${what}: ključ „${id}" se ponavlja` });
    seen.add(id);
  }
};

export const settingsSchema = z.object({
  currency: z.literal("KM").default("KM"),
  dailyRate: money.min(1),
  weeklyDiscountPct: z.number().int().min(0).max(80),
  deposit: money,
  minDays: z.number().int().min(1).max(60),
  maxDays: z.number().int().min(1).max(365),
  pendingHoldHours: z.number().int().min(1).max(168),
  seasons: z.array(seasonSchema).max(12),
  extras: z.array(extraSchema).max(MAX_EXTRAS).superRefine(uniqueIds("Dodaci")),
  pickup: z
    .array(pickupSchema)
    .min(1)
    .max(MAX_PICKUPS)
    .superRefine(uniqueIds("Preuzimanje"))
    .refine((list) => list.some((p) => p.enabled), { message: "Barem jedno mjesto preuzimanja mora biti ponuđeno" }),
});
export type Settings = z.infer<typeof settingsSchema>;

/**
 * Starting values. Every number here is a placeholder for the owner to change
 * in the admin panel; they are stored in the database on first start.
 */
export const DEFAULT_SETTINGS: Settings = {
  currency: "KM",
  dailyRate: 120,
  weeklyDiscountPct: 10,
  deposit: 500,
  minDays: 1,
  maxDays: 60,
  pendingHoldHours: 24,
  seasons: [{ name: "Ljeto", from: "07-01", to: "08-31", dailyRate: 150, minDays: 3 }],
  extras: [
    { id: "childSeat", label: "Dječije sjedište", perDay: 10, enabled: true },
    { id: "extraDriver", label: "Dodatni vozač", perDay: 15, enabled: true },
    { id: "crossBorder", label: "Prelazak granice (zeleni karton)", flat: 50, enabled: true },
  ],
  pickup: [
    { id: "office", label: "Naša lokacija, Sarajevo", fee: 0, detailsLabel: "", enabled: true },
    { id: "address", label: "Dostava na vašu adresu", fee: 30, detailsLabel: "Adresa preuzimanja", enabled: true },
    { id: "airport", label: "Aerodrom Sarajevo", fee: 30, detailsLabel: "Broj leta ili napomena", enabled: true },
  ],
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Brings stored settings up to the current shape. Older versions kept extras and
 * pickup as fixed objects keyed by id ({ childSeat: {...} }); now they are lists.
 */
export function upgradeSettings(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const toList = (v: unknown) =>
    isObject(v) ? Object.entries(v).map(([id, o]) => (isObject(o) ? { id, ...o } : o)) : v;
  const pickup = toList(raw.pickup);
  return {
    ...raw,
    extras: toList(raw.extras),
    pickup: Array.isArray(pickup)
      ? pickup.map((p) =>
          isObject(p) && p.detailsLabel === undefined
            ? { ...p, detailsLabel: DEFAULT_SETTINGS.pickup.find((d) => d.id === p.id)?.detailsLabel ?? "" }
            : p,
        )
      : pickup,
  };
}

export const findExtra = (settings: Settings, id: string) => settings.extras.find((e) => e.id === id);
export const findPickup = (settings: Settings, id: string) => settings.pickup.find((p) => p.id === id);
