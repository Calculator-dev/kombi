import { z } from "zod";
import type { Quote } from "./pricing";
import type { Settings } from "./settings";

export const VAN_STATUSES = ["draft", "published"] as const;
export type VanStatus = (typeof VAN_STATUSES)[number];

export const USER_ROLES = ["owner", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** New owners start as pending; their vans appear on the site once approved. */
export const USER_STATUSES = ["pending", "approved", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const FUELS = ["Dizel", "Benzin", "Hibrid", "Električni"] as const;
export const GEARBOXES = ["Manuelni", "Automatski"] as const;

export const MAX_PHOTOS = 12;

/** What an owner fills in about a van. */
export const vanDetailsSchema = z.object({
  name: z.string().trim().min(2, "Upišite naziv").max(80),
  year: z.number().int().min(1990, "Neispravno godište").max(2100, "Neispravno godište"),
  seats: z.number().int().min(2, "Najmanje 2 sjedišta").max(30),
  fuel: z.enum(FUELS),
  gearbox: z.enum(GEARBOXES),
  engine: z.string().trim().max(40).default(""),
  license: z.string().trim().min(1).max(10).default("B"),
  location: z.string().trim().min(2, "Upišite grad").max(80),
  description: z.string().trim().max(2000).default(""),
});
export type VanDetails = z.infer<typeof vanDetailsSchema>;

/** A van's rental terms, set by its owner and shown on its page. */
export const termsSchema = z.object({
  minDriverAge: z.number().int().min(18, "Najmanje 18").max(99),
  minLicenseYears: z.number().int().min(0).max(50),
  /** Free cancellation up to this many days before pickup; 0 = until the day before. */
  cancellationDays: z.number().int().min(0).max(90),
  documents: z.string().trim().max(300),
  fuel: z.string().trim().max(300),
  border: z.string().trim().max(300),
  included: z.array(z.string().trim().min(1).max(60)).max(12),
  /** Anything else: pets, smoking, mileage limit… */
  notes: z.string().trim().max(1500),
});
export type Terms = z.infer<typeof termsSchema>;

export const DEFAULT_TERMS: Terms = {
  minDriverAge: 21,
  minLicenseYears: 2,
  cancellationDays: 3,
  documents: "Lična karta ili pasoš i vozačka dozvola.",
  fuel: "Preuzimate pun rezervoar, vraćate pun rezervoar.",
  border: "Najavite u upitu, pripremamo zeleni karton.",
  included: ["Osiguranje", "PDV", "Pomoć na putu 0–24h"],
  notes: "",
};

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Upišite ime ili naziv firme").max(100),
  phone: z.string().trim().regex(/^\+?[\d\s/-]{6,20}$/, "Neispravan broj telefona"),
});
export type Profile = z.infer<typeof profileSchema>;

export interface PhotoUrls {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

/** A van as the public site shows it. */
export interface PublicVan extends VanDetails {
  id: string;
  slug: string;
  photos: PhotoUrls[];
  pricing: Settings;
  terms: Terms;
}

/** A van in a list, optionally with availability and price for chosen dates. */
export interface VanCard extends Pick<VanDetails, "name" | "year" | "seats" | "fuel" | "gearbox" | "location"> {
  id: string;
  slug: string;
  photo: PhotoUrls | null;
  dailyRate: number;
  /** Only when dates were given. */
  available?: boolean;
  quote?: Pick<Quote, "days" | "total" | "errors">;
}

/** Turns "Toyota Proace Verso 8+1" into "toyota-proace-verso-8-1". */
export function slugify(text: string): string {
  const map: Record<string, string> = { č: "c", ć: "c", š: "s", ž: "z", đ: "dj" };
  return (
    text
      .toLowerCase()
      .replace(/[čćšžđ]/g, (c) => map[c] ?? c)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "kombi"
  );
}
