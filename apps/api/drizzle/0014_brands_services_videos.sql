CREATE TABLE "handover_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"side" text NOT NULL,
	"key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "handover_videos_stage_check" CHECK ("handover_videos"."stage" in ('pickup', 'return')),
	CONSTRAINT "handover_videos_side_check" CHECK ("handover_videos"."side" in ('front', 'right', 'back', 'left'))
);
--> statement-breakpoint
ALTER TABLE "handover_videos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "van_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"van_id" uuid NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"km" integer DEFAULT 0 NOT NULL,
	"work" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "van_services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "logo" jsonb;--> statement-breakpoint
ALTER TABLE "vans" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "vans" ADD COLUMN "spin_video" jsonb;--> statement-breakpoint
ALTER TABLE "handover_videos" ADD CONSTRAINT "handover_videos_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "van_services" ADD CONSTRAINT "van_services_van_id_vans_id_fk" FOREIGN KEY ("van_id") REFERENCES "public"."vans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "handover_videos_side_idx" ON "handover_videos" USING btree ("booking_id","stage","side");--> statement-breakpoint
CREATE INDEX "van_services_van_idx" ON "van_services" USING btree ("van_id","date");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_slug_unique" UNIQUE("slug");
--> statement-breakpoint
-- Vans saved before makes were asked: guess the make from the name.
UPDATE "vans" SET "brand" = CASE
  WHEN lower(name) LIKE 'vw %' THEN 'volkswagen'
  WHEN lower(name) LIKE 'mercedes%' THEN 'mercedes'
  WHEN lower(name) LIKE 'alfa%' THEN 'alfaromeo'
  WHEN lower(name) LIKE 'citroen%' THEN 'citroen'
  WHEN lower(name) LIKE 'skoda%' THEN 'skoda'
  WHEN lower(name) LIKE 'alfa romeo%' THEN 'alfaromeo'
  WHEN lower(name) LIKE 'audi%' THEN 'audi'
  WHEN lower(name) LIKE 'bmw%' THEN 'bmw'
  WHEN lower(name) LIKE 'chevrolet%' THEN 'chevrolet'
  WHEN lower(name) LIKE 'citroën%' THEN 'citroen'
  WHEN lower(name) LIKE 'cupra%' THEN 'cupra'
  WHEN lower(name) LIKE 'dacia%' THEN 'dacia'
  WHEN lower(name) LIKE 'fiat%' THEN 'fiat'
  WHEN lower(name) LIKE 'ford%' THEN 'ford'
  WHEN lower(name) LIKE 'honda%' THEN 'honda'
  WHEN lower(name) LIKE 'hyundai%' THEN 'hyundai'
  WHEN lower(name) LIKE 'iveco%' THEN 'iveco'
  WHEN lower(name) LIKE 'jeep%' THEN 'jeep'
  WHEN lower(name) LIKE 'kia%' THEN 'kia'
  WHEN lower(name) LIKE 'land rover%' THEN 'landrover'
  WHEN lower(name) LIKE 'lexus%' THEN 'lexus'
  WHEN lower(name) LIKE 'man%' THEN 'man'
  WHEN lower(name) LIKE 'mazda%' THEN 'mazda'
  WHEN lower(name) LIKE 'mercedes-benz%' THEN 'mercedes'
  WHEN lower(name) LIKE 'mini%' THEN 'mini'
  WHEN lower(name) LIKE 'mitsubishi%' THEN 'mitsubishi'
  WHEN lower(name) LIKE 'nissan%' THEN 'nissan'
  WHEN lower(name) LIKE 'opel%' THEN 'opel'
  WHEN lower(name) LIKE 'peugeot%' THEN 'peugeot'
  WHEN lower(name) LIKE 'porsche%' THEN 'porsche'
  WHEN lower(name) LIKE 'renault%' THEN 'renault'
  WHEN lower(name) LIKE 'seat%' THEN 'seat'
  WHEN lower(name) LIKE 'škoda%' THEN 'skoda'
  WHEN lower(name) LIKE 'subaru%' THEN 'subaru'
  WHEN lower(name) LIKE 'suzuki%' THEN 'suzuki'
  WHEN lower(name) LIKE 'tesla%' THEN 'tesla'
  WHEN lower(name) LIKE 'toyota%' THEN 'toyota'
  WHEN lower(name) LIKE 'volkswagen%' THEN 'volkswagen'
  WHEN lower(name) LIKE 'volvo%' THEN 'volvo'
  ELSE NULL END
WHERE "brand" IS NULL;
