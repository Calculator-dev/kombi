CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"role" text DEFAULT 'owner' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('owner', 'admin')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('pending', 'approved', 'suspended'))
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"seats" integer NOT NULL,
	"fuel" text NOT NULL,
	"gearbox" text NOT NULL,
	"engine" text DEFAULT '' NOT NULL,
	"license" text DEFAULT 'B' NOT NULL,
	"location" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pricing" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vans_slug_unique" UNIQUE("slug"),
	CONSTRAINT "vans_status_check" CHECK ("vans"."status" in ('draft', 'published'))
);
--> statement-breakpoint
ALTER TABLE "vans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "blocked_dates_idx";--> statement-breakpoint
DROP INDEX "bookings_dates_idx";--> statement-breakpoint
-- The van the site ran with until now becomes the first van, with its saved prices.
INSERT INTO "vans" ("slug", "status", "name", "year", "seats", "fuel", "gearbox", "engine", "license", "location", "pricing")
VALUES ('toyota-proace-verso', 'published', 'Toyota Proace Verso 8+1', 2024, 9, 'Dizel', 'Manuelni', '2.0 D-4D', 'B', 'Sarajevo',
  coalesce((SELECT "data" FROM "settings" WHERE "id" = 1), '{"currency":"KM","dailyRate":120,"weeklyDiscountPct":10,"deposit":500,"minDays":1,"maxDays":60,"pendingHoldHours":24,"seasons":[{"name":"Ljeto","from":"07-01","to":"08-31","dailyRate":150,"minDays":3}],"extras":[{"id":"childSeat","label":"Dječije sjedište","perDay":10,"enabled":true},{"id":"extraDriver","label":"Dodatni vozač","perDay":15,"enabled":true},{"id":"crossBorder","label":"Prelazak granice (zeleni karton)","flat":50,"enabled":true}],"pickup":[{"id":"office","label":"Naša lokacija, Sarajevo","fee":0,"detailsLabel":"","enabled":true},{"id":"address","label":"Dostava na vašu adresu","fee":30,"detailsLabel":"Adresa preuzimanja","enabled":true},{"id":"airport","label":"Aerodrom Sarajevo","fee":30,"detailsLabel":"Broj leta ili napomena","enabled":true}]}'::jsonb));--> statement-breakpoint
ALTER TABLE "blocked_ranges" ADD COLUMN "van_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "van_id" uuid;--> statement-breakpoint
UPDATE "blocked_ranges" SET "van_id" = (SELECT "id" FROM "vans" WHERE "slug" = 'toyota-proace-verso');--> statement-breakpoint
UPDATE "bookings" SET "van_id" = (SELECT "id" FROM "vans" WHERE "slug" = 'toyota-proace-verso');--> statement-breakpoint
ALTER TABLE "blocked_ranges" ALTER COLUMN "van_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "van_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vans" ADD CONSTRAINT "vans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vans_owner_idx" ON "vans" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "blocked_ranges" ADD CONSTRAINT "blocked_ranges_van_id_vans_id_fk" FOREIGN KEY ("van_id") REFERENCES "public"."vans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_van_id_vans_id_fk" FOREIGN KEY ("van_id") REFERENCES "public"."vans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocked_dates_idx" ON "blocked_ranges" USING btree ("van_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "bookings_dates_idx" ON "bookings" USING btree ("van_id","start_date","end_date");