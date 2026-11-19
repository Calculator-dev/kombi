ALTER TABLE "vans" ADD COLUMN "category" text DEFAULT 'passenger' NOT NULL;--> statement-breakpoint
ALTER TABLE "vans" ADD COLUMN "cargo_m3" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vans" ADD COLUMN "payload_kg" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vans" ADD CONSTRAINT "vans_category_check" CHECK ("vans"."category" in ('passenger', 'cargo'));