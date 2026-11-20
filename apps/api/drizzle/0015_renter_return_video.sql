DROP INDEX "handover_videos_side_idx";--> statement-breakpoint
ALTER TABLE "handover_videos" ADD COLUMN "recorded_by" text DEFAULT 'owner' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "handover_videos_side_by_idx" ON "handover_videos" USING btree ("booking_id","stage","side","recorded_by");--> statement-breakpoint
ALTER TABLE "handover_videos" ADD CONSTRAINT "handover_videos_by_check" CHECK ("handover_videos"."recorded_by" in ('owner', 'renter'));