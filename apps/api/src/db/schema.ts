import { sql } from "drizzle-orm";
import { check, date, index, integer, jsonb, pgSequence, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { BookingStatus, ContactChannel, Quote, Settings, Terms, UserRole, UserStatus, VanStatus } from "@kombi/shared";

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
    role: text("role").$type<UserRole>().notNull().default("owner"),
    status: text("status").$type<UserStatus>().notNull().default("pending"),
    ...timestamps,
  },
  (t) => [
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

export const vans = pgTable(
  "vans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null: run by the platform itself. */
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    status: text("status").$type<VanStatus>().notNull().default("draft"),
    name: text("name").notNull(),
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
    /** Prices, seasons, extras and pickup places of this van. */
    pricing: jsonb("pricing").$type<Settings>().notNull(),
    /** Rental terms (driver age, cancellation, what's included…). */
    terms: jsonb("terms").$type<Partial<Terms>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [
    index("vans_owner_idx").on(t.ownerId),
    index("vans_search_idx").on(t.status, t.seats),
    check("vans_status_check", sql`${t.status} in ('draft', 'published')`),
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
    ...timestamps,
  },
  (t) => [
    index("bookings_dates_idx").on(t.vanId, t.start, t.end),
    index("bookings_status_idx").on(t.status),
    check("bookings_status_check", sql`${t.status} in ('pending', 'confirmed', 'declined', 'cancelled')`),
    check("bookings_dates_check", sql`${t.end} > ${t.start}`),
  ],
).enableRLS();

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

export type BookingRow = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BlockRow = typeof blockedRanges.$inferSelect;
export type VanRow = typeof vans.$inferSelect;
export type UserRow = typeof users.$inferSelect;
