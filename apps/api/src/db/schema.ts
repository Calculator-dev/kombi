import { sql } from "drizzle-orm";
import { check, date, index, integer, jsonb, pgSequence, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { BookingStatus, ContactChannel, ExtraId, PickupId, Quote, Settings } from "@kombi/shared";

/** Human-readable booking numbers: KB-2026-0001, KB-2026-0002, … */
export const bookingRefSeq = pgSequence("booking_ref_seq", { startWith: 1 });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull().unique(),
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
    extras: jsonb("extras").$type<ExtraId[]>().notNull().default([]),
    pickup: text("pickup").$type<PickupId>().notNull(),
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
    index("bookings_dates_idx").on(t.start, t.end),
    index("bookings_status_idx").on(t.status),
    check("bookings_status_check", sql`${t.status} in ('pending', 'confirmed', 'declined', 'cancelled')`),
    check("bookings_dates_check", sql`${t.end} > ${t.start}`),
  ],
);

export const blockedRanges = pgTable(
  "blocked_ranges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    start: date("start_date", { mode: "string" }).notNull(),
    end: date("end_date", { mode: "string" }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blocked_dates_idx").on(t.start, t.end), check("blocked_dates_check", sql`${t.end} >= ${t.start}`)],
);

/** Single-row table with the owner's prices and rules. */
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    data: jsonb("data").$type<Settings>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("settings_single_row", sql`${t.id} = 1`)],
);

export type BookingRow = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BlockRow = typeof blockedRanges.$inferSelect;
