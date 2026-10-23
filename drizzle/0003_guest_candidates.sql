CREATE TABLE "guest_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"last_contact_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guest_candidates" ADD CONSTRAINT "guest_candidates_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_candidates_wedding_phone_uq" ON "guest_candidates" USING btree ("wedding_id","phone");