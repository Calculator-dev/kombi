ALTER TABLE "vans" ADD COLUMN "spin_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vans" ADD COLUMN "spin_photos" jsonb DEFAULT '[]'::jsonb NOT NULL;