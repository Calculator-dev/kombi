ALTER TABLE "vans" ADD COLUMN "luggage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vans" ADD COLUMN "power_hp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vans" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "vans_search_idx" ON "vans" USING btree ("status","seats");