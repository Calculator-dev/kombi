ALTER TABLE "bookings" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "jmb" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "id_number" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "license_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "representative" text;--> statement-breakpoint
ALTER TABLE "vans" ADD COLUMN "contract" jsonb DEFAULT '{}'::jsonb NOT NULL;