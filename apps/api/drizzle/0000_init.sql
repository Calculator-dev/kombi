CREATE SEQUENCE "public"."booking_ref_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "blocked_ranges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_dates_check" CHECK ("blocked_ranges"."end_date" >= "blocked_ranges"."start_date")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"status" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"customer_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"contact_channel" text NOT NULL,
	"birth_date" date,
	"license_since" integer,
	"notes" text,
	"extras" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pickup" text NOT NULL,
	"pickup_address" text,
	"pickup_time" text,
	"return_time" text,
	"quote" jsonb NOT NULL,
	"total" integer NOT NULL,
	"hold_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_ref_unique" UNIQUE("ref"),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('pending', 'confirmed', 'declined', 'cancelled')),
	CONSTRAINT "bookings_dates_check" CHECK ("bookings"."end_date" > "bookings"."start_date")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE INDEX "blocked_dates_idx" ON "blocked_ranges" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "bookings_dates_idx" ON "bookings" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");