ALTER TABLE "vans" DROP CONSTRAINT "vans_category_check";--> statement-breakpoint
ALTER TABLE "vans" ADD CONSTRAINT "vans_category_check" CHECK ("vans"."category" in ('passenger', 'cargo', 'car'));