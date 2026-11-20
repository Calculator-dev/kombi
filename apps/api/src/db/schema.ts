import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgSequence, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { BookingStatus, BrandId, Category, HandoverBy, HandoverSide, HandoverStage, ContactChannel, ContractTerms, DocumentKind, DocumentRules, Plan, Quote, Settings, Terms, UserRole, UserStatus, VanStatus } from "@kombi/shared";

// Row-Level Security is on for every table with no policies: on Supabase this keeps the
// tables closed to its public REST API. The API connects as the table owner, which bypasses RLS.

/** Human-readable booking numbers: KB-2026-0001, KB-2026-0002, … */
export const bookingRefSeq = pgSequence("booking_ref_seq", { startWith: 1 });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** People who log in (via Supabase Auth). The id is the Supabase user id. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    phone: text("phone"),
    /** Printed on rental contracts as the lessor. */
    address: text("address"),
    companyId: text("company_id"),
    representative: text("representative"),
    /** In the VAT system: prices on their vans include PDV. */
    vatRegistered: boolean("vat_registered").notNull().default(false),
    /** Which document photos customers upload with a booking request for this owner's vans. */
    /** Address of the owner's public company page: /firma/<slug>. Set when the profile is first saved. */
    slug: text("slug").unique(),
    /** The company's logo (WebP, square), shown on its vans, page and contracts. */
    logo: jsonb("logo").$type<{ key: string } | null>(),
    documentRules: jsonb("document_rules").$type<DocumentRules>().notNull().default({ id: "off", license: "off" }),
    role: text("role").$type<UserRole>().notNull().default("owner"),
    status: text("status").$type<UserStatus>().notNull().default("pending"),
    /** The owner's package: how many vans they may publish, and whether they see analytics. */
    plan: text("plan").$type<Plan>().notNull().default("free"),
    ...timestamps,
  },
  (t) => [
    check("users_plan_check", sql`${t.plan} in ('free', 'bronze', 'silver', 'gold')`),
    check("users_role_check", sql`${t.role} in ('owner', 'admin')`),
    check("users_status_check", sql`${t.status} in ('pending', 'approved', 'suspended')`),
  ],
).enableRLS();

/** A photo stored in Backblaze: a large version and a thumbnail, both WebP. */
export interface StoredPhoto {
  id: string;
  key: string;
  thumbKey: string;
  width: number;
  height: number;
}

/** A video in the bucket, stored as uploaded. */
export interface StoredVideo {
  key: string;
  contentType: string;
  size: number;
}

/** A photo of the 360° view; slot 0 is 12 o'clock (the front), going clockwise. */
export interface SpinPhoto extends StoredPhoto {
  slot: number;
}

export const vans = pgTable(
  "vans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null: run by the platform itself. */
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    status: text("status").$type<VanStatus>().notNull().default("draft"),
    name: text("name").notNull(),
    /** The make (see BRANDS in @kombi/shared); null = not said. */
    brand: text("brand").$type<BrandId>(),
    /** "passenger" or "cargo" (see CATEGORIES in @kombi/shared). */
    category: text("category").$type<Category>().notNull().default("passenger"),
    /** Cargo space in m³; 0 = not given. */
    cargoM3: real("cargo_m3").notNull().default(0),
    /** Payload in kg; 0 = not given. */
    payloadKg: integer("payload_kg").notNull().default(0),
    year: integer("year").notNull(),
    seats: integer("seats").notNull(),
    fuel: text("fuel").notNull(),
    gearbox: text("gearbox").notNull(),
    engine: text("engine").notNull().default(""),
    license: text("license").notNull().default("B"),
    location: text("location").notNull(),
    description: text("description").notNull().default(""),
    /** Large suitcases that fit with all seats in use. */
    luggage: integer("luggage").notNull().default(0),
    /** Engine power in horsepower; 0 = not given. */
    powerHp: integer("power_hp").notNull().default(0),
    /** Equipment ids (see FEATURES in @kombi/shared). */
    features: jsonb("features").$type<string[]>().notNull().default([]),
    photos: jsonb("photos").$type<StoredPhoto[]>().notNull().default([]),
    /** Whether the 360° view is shown; switching it off keeps its photos. */
    spinEnabled: boolean("spin_enabled").notNull().default(false),
    spinPhotos: jsonb("spin_photos").$type<SpinPhoto[]>().notNull().default([]),
    /** A walk-around video shown with the 360° view. */
    spinVideo: jsonb("spin_video").$type<StoredVideo | null>(),
    /** Prices, seasons, extras and pickup places of this van. */
    pricing: jsonb("pricing").$type<Settings>().notNull(),
    /** Rental terms (driver age, cancellation, what's included…). */
    terms: jsonb("terms").$type<Partial<Terms>>().notNull().default({}),
    /** Papers and amounts for the rental contract; never public. */
    contract: jsonb("contract").$type<Partial<ContractTerms>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [
    index("vans_owner_idx").on(t.ownerId),
    index("vans_search_idx").on(t.status, t.seats),
    check("vans_status_check", sql`${t.status} in ('draft', 'published')`),
    check("vans_category_check", sql`${t.category} in ('passenger', 'cargo', 'car')`),
  ],
).enableRLS();

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull().unique(),
    vanId: uuid("van_id")
      .notNull()
      .references(() => vans.id),
    status: text("status").$type<BookingStatus>().notNull(),
    /** Pickup day. The van is occupied from start through end, both inclusive. */
    start: date("start_date", { mode: "string" }).notNull(),
    /** Return day. Days charged = end − start. */
    end: date("end_date", { mode: "string" }).notNull(),
    name: text("customer_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    contactChannel: text("contact_channel").$type<ContactChannel>().notNull(),
    birthDate: date("birth_date", { mode: "string" }),
    licenseSince: integer("license_since"),
    // For the rental contract; the customer may leave them out.
    address: text("address"),
    jmb: text("jmb"),
    idNumber: text("id_number"),
    licenseNumber: text("license_number"),
    notes: text("notes"),
    extras: jsonb("extras").$type<string[]>().notNull().default([]),
    pickup: text("pickup").notNull(),
    pickupAddress: text("pickup_address"),
    pickupTime: text("pickup_time"),
    returnTime: text("return_time"),
    /** The price breakdown as calculated when the request was made. */
    quote: jsonb("quote").$type<Quote>().notNull(),
    total: integer("total").notNull(),
    /** A pending request keeps its dates until this moment. */
    holdUntil: timestamp("hold_until", { withTimezone: true }),
    /** Secret in the link the customer gets to read the contract; 64 random hex characters. */
    contractToken: text("contract_token")
      .notNull()
      .unique()
      .default(sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`),
    /** Secret in the link the customer gets to rate the rental once it is over. */
    reviewToken: text("review_token")
      .notNull()
      .unique()
      .default(sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`),
    /** When the customer was asked for a review; null = not yet. */
    reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("bookings_dates_idx").on(t.vanId, t.start, t.end),
    index("bookings_status_idx").on(t.status),
    check("bookings_status_check", sql`${t.status} in ('pending', 'confirmed', 'declined', 'cancelled')`),
    check("bookings_dates_check", sql`${t.end} > ${t.start}`),
  ],
).enableRLS();

/**
 * A photo of the customer's ID or driving licence, sent with a booking request.
 * The file is encrypted before it is stored (see services/documents.ts), and is
 * deleted some days after the rental ends.
 */
export const bookingDocuments = pgTable(
  "booking_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    kind: text("kind").$type<DocumentKind>().notNull(),
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_documents_booking_idx").on(t.bookingId), check("booking_documents_kind_check", sql`${t.kind} in ('id', 'license')`)],
).enableRLS();

export type BookingDocumentRow = typeof bookingDocuments.$inferSelect;

/** A video of one side of the vehicle, recorded by the owner at pickup or return. */
export const handoverVideos = pgTable(
  "handover_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    stage: text("stage").$type<HandoverStage>().notNull(),
    side: text("side").$type<HandoverSide>().notNull(),
    /** Who filmed it: the owner or the customer. */
    by: text("recorded_by").$type<HandoverBy>().notNull().default("owner"),
    key: text("key").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("handover_videos_side_by_idx").on(t.bookingId, t.stage, t.side, t.by),
    check("handover_videos_by_check", sql`${t.by} in ('owner', 'renter')`),
    check("handover_videos_stage_check", sql`${t.stage} in ('pickup', 'return')`),
    check("handover_videos_side_check", sql`${t.side} in ('front', 'right', 'back', 'left')`),
  ],
).enableRLS();

export type HandoverVideoRow = typeof handoverVideos.$inferSelect;

/** A service or repair the owner noted for a vehicle; shown on its page. */
export const vanServices = pgTable(
  "van_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vanId: uuid("van_id")
      .notNull()
      .references(() => vans.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    title: text("title").notNull(),
    km: integer("km").notNull().default(0),
    work: text("work").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("van_services_van_idx").on(t.vanId, t.date)],
).enableRLS();

export type VanServiceRow = typeof vanServices.$inferSelect;

export const blockedRanges = pgTable(
  "blocked_ranges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vanId: uuid("van_id")
      .notNull()
      .references(() => vans.id, { onDelete: "cascade" }),
    start: date("start_date", { mode: "string" }).notNull(),
    end: date("end_date", { mode: "string" }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blocked_dates_idx").on(t.vanId, t.start, t.end), check("blocked_dates_check", sql`${t.end} >= ${t.start}`)],
).enableRLS();

/** Daily counters per van, for the owner's analytics. No visitor data is kept. */
export const vanStats = pgTable(
  "van_stats",
  {
    vanId: uuid("van_id")
      .notNull()
      .references(() => vans.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    /** Times the van's page was opened. */
    views: integer("views").notNull().default(0),
    /** Times someone picked dates and opened the booking form. */
    checkouts: integer("checkouts").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.vanId, t.day] })],
).enableRLS();

/**
 * A customer's rating of a finished rental. Only a confirmed booking whose
 * return day has passed can be rated, once, through the link sent to the customer.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    vanId: uuid("van_id")
      .notNull()
      .references(() => vans.id, { onDelete: "cascade" }),
    /** 1–5 stars. */
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    /** The customer's first name, as shown with the review. */
    name: text("name").notNull(),
    /** Hidden by a platform admin (abuse, personal data); kept for the record. */
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_van_idx").on(t.vanId), check("reviews_rating_check", sql`${t.rating} between 1 and 5`)],
).enableRLS();

export type ReviewRow = typeof reviews.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BlockRow = typeof blockedRanges.$inferSelect;
export type VanRow = typeof vans.$inferSelect;
export type UserRow = typeof users.$inferSelect;
