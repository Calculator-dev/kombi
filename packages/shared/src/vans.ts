import { z } from "zod";
import { NO_DOCUMENTS, documentRulesSchema, type DocumentRules } from "./documents";
import { isIsoDate } from "./dates";
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
/**
 * Passenger vans carry people; cargo vans carry things (moving house,
 * furniture, building material); cars are ordinary passenger cars.
 */
export const CATEGORIES = ["passenger", "cargo", "car"] as const;
export type Category = (typeof CATEGORIES)[number];
/** Packages count vans and cars separately: the same number of each. */
export type VehicleKind = "van" | "car";
export const kindOf = (category: Category | undefined): VehicleKind => (category === "car" ? "car" : "van");

export const MAX_PHOTOS = 12;

/**
 * The 360° view: one photo from each clock position around the van, seen from
 * above with the front at 12 o'clock, taken walking clockwise.
 */
export const SPIN_SLOTS = 12;

/** Equipment a van can have; customers can filter by it. */
export const FEATURES = [
  ["ac", "Klima"],
  ["towbar", "Kuka za prikolicu"],
  ["roofRack", "Krovni nosač"],
  ["isofix", "ISOFIX"],
  ["navigation", "Navigacija"],
  ["carplay", "Apple CarPlay / Android Auto"],
  ["cruise", "Tempomat"],
  ["parkingSensors", "Parking senzori"],
  ["rearCamera", "Kamera za vožnju unazad"],
  ["winterTyres", "Zimske gume"],
] as const;
export type FeatureId = (typeof FEATURES)[number][0];
export const FEATURE_IDS = FEATURES.map(([id]) => id) as [FeatureId, ...FeatureId[]];
export const featureLabel = (id: string) => FEATURES.find(([f]) => f === id)?.[1] ?? id;

/** What an owner fills in about a van. */
export const vanDetailsSchema = z.object({
  name: z.string().trim().min(2, "Upišite naziv").max(80),
  category: z.enum(CATEGORIES).default("passenger"),
  /** Cargo space in m³ (cargo vans); 0 = not given. */
  cargoM3: z.number().min(0).max(100, "Najviše 100 m³").default(0),
  /** Payload in kg (cargo vans); 0 = not given. */
  payloadKg: z.number().int().min(0).max(10000, "Najviše 10000 kg").default(0),
  year: z.number().int().min(1990, "Neispravno godište").max(2100, "Neispravno godište"),
  seats: z.number().int().min(2, "Najmanje 2 sjedišta").max(30),
  fuel: z.enum(FUELS),
  gearbox: z.enum(GEARBOXES),
  engine: z.string().trim().max(40).default(""),
  license: z.string().trim().min(1).max(10).default("B"),
  location: z.string().trim().min(2, "Upišite grad").max(80),
  description: z.string().trim().max(2000).default(""),
  /** Large suitcases that fit with all seats in use. */
  luggage: z.number().int().min(0).max(40).default(0),
  /** Engine power in horsepower; 0 = not given. */
  powerHp: z.number().int().min(0).max(1000).default(0),
  features: z
    .array(z.enum(FEATURE_IDS))
    .max(FEATURE_IDS.length)
    .default([])
    .transform((f) => [...new Set(f)]),
});
export type VanDetails = z.infer<typeof vanDetailsSchema>;

/** Kasko: included in the price, available for a fee, not offered; "" = the owner hasn't said. */
export const KASKO = ["", "included", "extra", "no"] as const;
export type Kasko = (typeof KASKO)[number];

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
  /** Comprehensive insurance (kasko): "" = not said. */
  kasko: z.enum(KASKO).default(""),
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
  included: ["Obavezno osiguranje (AO)", "Pomoć na putu 0–24h"],
  kasko: "",
  notes: "",
};

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Upišite ime ili naziv firme").max(100),
  phone: z.string().trim().regex(/^\+?[\d\s/-]{6,20}$/, "Neispravan broj telefona"),
  // Printed on rental contracts as the lessor; optional.
  address: z.string().trim().max(200).default(""),
  /** Company or trade ID number (ID broj). */
  companyId: z.string().trim().max(30).default(""),
  /** In the VAT system (PDV obveznik): the site then says prices include PDV. */
  vatRegistered: z.boolean().default(false),
  /** Who signs for a company, e.g. "zastupana po vlasniku obrta …". */
  representative: z.string().trim().max(200).default(""),
  /** Photos of documents the customer uploads with a booking request. */
  documents: documentRulesSchema.default(NO_DOCUMENTS),
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
  /** The 360° view, in clock order; only when it's switched on and every slot has a photo. */
  spin?: PhotoUrls[] | null;
  pricing: Settings;
  terms: Terms;
  /** Who rents it out: the owner's profile name; null when kombi.ba runs it itself. */
  owner?: string | null;
  /** Whether the owner is in the VAT system; null when not known (kombi.ba's own vans). */
  vat?: boolean | null;
  /** Mileage and damage terms, as far as the owner has filled them in for the contract. */
  limits?: VanLimits;
  /** Which document photos the owner asks for with a booking request. */
  documents?: DocumentRules;
  /** Ratings from finished rentals. */
  reviews?: ReviewSummary;
}

export interface VanLimits {
  /** Kilometres included per day; 0 = unlimited. */
  kmPerDay?: number;
  /** Price of kilometres above the limit, one tier per line. */
  extraKm?: string;
  /** The renter's share in any damage, in KM. */
  damageFee?: number;
}

export interface PublicReview {
  rating: number;
  comment: string;
  name: string;
  /** ISO date the review was written. */
  date: string;
}

export interface ReviewSummary {
  count: number;
  /** Average stars, one decimal; 0 without reviews. */
  average: number;
  /** Newest first, at most 20. */
  items: PublicReview[];
}

/** What a customer sends to rate a finished rental. */
export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Odaberite ocjenu").max(5),
  comment: z.string().trim().max(1000, "Najviše 1000 znakova").default(""),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

/** A van in a list, optionally with availability and price for chosen dates. */
export interface VanCard
  extends Pick<VanDetails, "name" | "year" | "seats" | "fuel" | "gearbox" | "location" | "luggage" | "powerHp" | "features" | "category" | "cargoM3" | "payloadKg"> {
  id: string;
  slug: string;
  photo: PhotoUrls | null;
  dailyRate: number;
  /** "Cijena po dogovoru": show no price for this van. */
  priceOnRequest?: boolean;
  /** Average stars and how many reviews; only when there are any. */
  rating?: { average: number; count: number };
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

export const SORTS = [
  ["total", "Najjeftinije ukupno"],
  ["daily", "Najjeftinije po danu"],
  ["seats", "Najviše sjedišta"],
  ["newest", "Najnovije godište"],
] as const;
export type Sort = (typeof SORTS)[number][0];

export const SEARCH_PAGE_SIZE = 24;

const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().min(min).max(max).optional());

/**
 * The search on /kombiji, as it appears in the address (?start=…&seats=8…).
 * Shared so the page and the API read the same parameters the same way.
 */
export const vanSearchSchema = z
  .object({
    /** Free text: words matched against the van's name, city and description. */
    q: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined), z.string().max(80).optional()).catch(undefined),
    /** Passenger or cargo vans only. */
    type: z.enum(CATEGORIES).optional().catch(undefined),
    start: z.string().refine(isIsoDate).optional().catch(undefined),
    end: z.string().refine(isIsoDate).optional().catch(undefined),
    seats: optInt(1, 60).catch(undefined),
    luggage: optInt(0, 40).catch(undefined),
    gearbox: z.enum(GEARBOXES).optional().catch(undefined),
    fuel: z.enum(FUELS).optional().catch(undefined),
    city: z.string().trim().max(80).optional().catch(undefined),
    priceMin: optInt(0, 100_000).catch(undefined),
    priceMax: optInt(0, 100_000).catch(undefined),
    yearMin: optInt(1990, 2100).catch(undefined),
    /** Comma-separated: the van must have all of them. */
    features: z
      .preprocess(
        (v) => (typeof v === "string" ? v.split(",").filter(Boolean) : v),
        z.array(z.enum(FEATURE_IDS)).max(FEATURE_IDS.length),
      )
      .optional()
      .catch(undefined),
    sort: z.enum(SORTS.map(([s]) => s) as [Sort, ...Sort[]]).optional().catch(undefined),
    /** With dates: also list vans that are taken then. */
    taken: z.preprocess((v) => v === "1" || v === true, z.boolean()).optional().catch(undefined),
    page: optInt(1, 1000).catch(undefined),
  })
  .transform((q) => {
    // Dates only count as a pair, in the right order.
    const dated = q.start && q.end && q.end > q.start;
    return { ...q, start: dated ? q.start : undefined, end: dated ? q.end : undefined };
  });
export type VanSearch = z.infer<typeof vanSearchSchema>;

/** The search back as a query string, leaving out empty values. */
export function searchToQuery(q: Partial<VanSearch>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === "" || v === false || (Array.isArray(v) && !v.length)) continue;
    if (k === "page" && v === 1) continue;
    p.set(k, Array.isArray(v) ? v.join(",") : v === true ? "1" : String(v));
  }
  return p.toString();
}

export interface SearchResult {
  items: VanCard[];
  /** Matching vans, before paging. */
  total: number;
  /** Of those, free on the chosen dates (equals total without dates). */
  free: number;
  page: number;
  pageSize: number;
  /** Cities that have vans, for the city filter. */
  cities: string[];
}
