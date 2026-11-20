CREATE TABLE "booking_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_documents_kind_check" CHECK ("booking_documents"."kind" in ('id', 'license'))
);
--> statement-breakpoint
ALTER TABLE "booking_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "document_rules" jsonb DEFAULT '{"id":"off","license":"off"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_documents" ADD CONSTRAINT "booking_documents_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_documents_booking_idx" ON "booking_documents" USING btree ("booking_id");