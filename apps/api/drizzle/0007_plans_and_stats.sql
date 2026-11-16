CREATE TABLE "van_stats" (
	"van_id" uuid NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"checkouts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "van_stats_van_id_day_pk" PRIMARY KEY("van_id","day")
);
--> statement-breakpoint
ALTER TABLE "van_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "van_stats" ADD CONSTRAINT "van_stats_van_id_vans_id_fk" FOREIGN KEY ("van_id") REFERENCES "public"."vans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plan_check" CHECK ("users"."plan" in ('free', 'bronze', 'silver', 'gold'));