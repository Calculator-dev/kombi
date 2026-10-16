import { z } from "zod";

export const EXTRA_IDS = ["childSeat", "extraDriver", "crossBorder"] as const;
export type ExtraId = (typeof EXTRA_IDS)[number];

export const PICKUP_IDS = ["office", "address", "airport"] as const;
export type PickupId = (typeof PICKUP_IDS)[number];

const monthDay = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Format MM-DD");
const money = z.number().int().min(0).max(100_000);

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
    label: z.string().min(1).max(80),
    perDay: money.optional(),
    flat: money.optional(),
    enabled: z.boolean().default(true),
  })
  .refine((e) => (e.perDay === undefined) !== (e.flat === undefined), {
    message: "Dodatak ima ili cijenu po danu ili jednokratnu cijenu",
  });
export type Extra = z.infer<typeof extraSchema>;

export const pickupSchema = z.object({
  label: z.string().min(1).max(80),
  fee: money,
  enabled: z.boolean().default(true),
});

export const settingsSchema = z.object({
  currency: z.literal("KM").default("KM"),
  dailyRate: money.min(1),
  weeklyDiscountPct: z.number().int().min(0).max(80),
  deposit: money,
  minDays: z.number().int().min(1).max(60),
  maxDays: z.number().int().min(1).max(365),
  pendingHoldHours: z.number().int().min(1).max(168),
  seasons: z.array(seasonSchema).max(12),
  extras: z.object({
    childSeat: extraSchema,
    extraDriver: extraSchema,
    crossBorder: extraSchema,
  }),
  pickup: z.object({
    office: pickupSchema,
    address: pickupSchema,
    airport: pickupSchema,
  }),
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
  extras: {
    childSeat: { label: "Dječije sjedište", perDay: 10, enabled: true },
    extraDriver: { label: "Dodatni vozač", perDay: 15, enabled: true },
    crossBorder: { label: "Prelazak granice (zeleni karton)", flat: 50, enabled: true },
  },
  pickup: {
    office: { label: "Naša lokacija, Sarajevo", fee: 0, enabled: true },
    address: { label: "Dostava na vašu adresu", fee: 30, enabled: true },
    airport: { label: "Aerodrom Sarajevo", fee: 30, enabled: true },
  },
};
