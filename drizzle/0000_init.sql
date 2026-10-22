CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"actor_user_id" text,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"href" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"title" text NOT NULL,
	"planned_amount" integer DEFAULT 0 NOT NULL,
	"per_guest" boolean DEFAULT false NOT NULL,
	"actual_amount" integer,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"due_date" date,
	"vendor_id" uuid,
	"decision_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "date_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "date_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "decision_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "decision_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"wedding_id" uuid NOT NULL,
	"name" text NOT NULL,
	"weight" smallint DEFAULT 3 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_criteria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "decision_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"wedding_id" uuid NOT NULL,
	"name" text NOT NULL,
	"details" text,
	"cost_amount" integer,
	"cost_type" text DEFAULT 'total' NOT NULL,
	"url" text,
	"pros" text,
	"cons" text,
	"rejected" boolean DEFAULT false NOT NULL,
	"vendor_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "decision_scores" (
	"option_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"score" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decision_scores_option_id_criterion_id_user_id_pk" PRIMARY KEY("option_id","criterion_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "decision_scores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"due_date" date,
	"due_offset_days" integer,
	"owner_user_id" text,
	"chosen_option_id" uuid,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" text,
	"template_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_child" boolean DEFAULT false NOT NULL,
	"attending" text DEFAULT 'pending' NOT NULL,
	"diet" text DEFAULT 'regular' NOT NULL,
	"allergies" text,
	"table_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"name" text NOT NULL,
	"side" text DEFAULT 'both' NOT NULL,
	"group_label" text,
	"tier" text DEFAULT 'want' NOT NULL,
	"phone" text,
	"email" text,
	"notes" text,
	"invited_at" timestamp with time zone,
	"reminded_at" timestamp with time zone,
	"rsvp_token" text NOT NULL,
	"responded_at" timestamp with time zone,
	"rsvp_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_rsvp_token_unique" UNIQUE("rsvp_token")
);
--> statement-breakpoint
ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seating_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"name" text NOT NULL,
	"capacity" integer DEFAULT 8 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seating_tables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"category" text DEFAULT 'other' NOT NULL,
	"due_date" date,
	"due_offset_days" integer,
	"hard_deadline" boolean DEFAULT false NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"done_at" timestamp with time zone,
	"assignee_user_id" text,
	"link_href" text,
	"template_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "timeline_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"start_time" text NOT NULL,
	"duration_min" integer,
	"title" text NOT NULL,
	"notes" text,
	"owner" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timeline_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"url" text,
	"instagram" text,
	"status" text DEFAULT 'idea' NOT NULL,
	"quote_amount" integer,
	"deposit_amount" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wedding_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wedding_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" text,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wedding_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "wedding_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wedding_members" (
	"wedding_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'partner' NOT NULL,
	"partner" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wedding_members_wedding_id_user_id_pk" PRIMARY KEY("wedding_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "wedding_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "weddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_a_name" text NOT NULL,
	"partner_b_name" text NOT NULL,
	"wedding_date" date,
	"date_locked" boolean DEFAULT false NOT NULL,
	"guest_cap" integer DEFAULT 40 NOT NULL,
	"budget_total" integer,
	"calendar_custom" text DEFAULT 'ashkenaz' NOT NULL,
	"ceremony_track" text DEFAULT 'rabbinate' NOT NULL,
	"city" text DEFAULT 'Tel Aviv' NOT NULL,
	"venue_name" text,
	"venue_address" text,
	"start_time" text,
	"rsvp_deadline" date,
	"rsvp_note" text,
	"invitation_template" text,
	"reminder_template" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weddings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_candidates" ADD CONSTRAINT "date_candidates_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_comments" ADD CONSTRAINT "decision_comments_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_comments" ADD CONSTRAINT "decision_comments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_criteria" ADD CONSTRAINT "decision_criteria_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_criteria" ADD CONSTRAINT "decision_criteria_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_options" ADD CONSTRAINT "decision_options_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_options" ADD CONSTRAINT "decision_options_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_scores" ADD CONSTRAINT "decision_scores_option_id_decision_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."decision_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_scores" ADD CONSTRAINT "decision_scores_criterion_id_decision_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."decision_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_scores" ADD CONSTRAINT "decision_scores_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_table_id_seating_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."seating_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seating_tables" ADD CONSTRAINT "seating_tables_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_invites" ADD CONSTRAINT "wedding_invites_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_invites" ADD CONSTRAINT "wedding_invites_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_invites" ADD CONSTRAINT "wedding_invites_accepted_by_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_members" ADD CONSTRAINT "wedding_members_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_members" ADD CONSTRAINT "wedding_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_wedding_created_idx" ON "activity" USING btree ("wedding_id","created_at");--> statement-breakpoint
CREATE INDEX "budget_items_wedding_idx" ON "budget_items" USING btree ("wedding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "date_candidates_uq" ON "date_candidates" USING btree ("wedding_id","date");--> statement-breakpoint
CREATE INDEX "decision_comments_decision_idx" ON "decision_comments" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "decision_criteria_decision_idx" ON "decision_criteria" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "decision_options_decision_idx" ON "decision_options" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "decision_options_wedding_idx" ON "decision_options" USING btree ("wedding_id");--> statement-breakpoint
CREATE INDEX "decision_scores_criterion_idx" ON "decision_scores" USING btree ("criterion_id");--> statement-breakpoint
CREATE INDEX "decisions_wedding_idx" ON "decisions" USING btree ("wedding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "decisions_template_uq" ON "decisions" USING btree ("wedding_id","template_key");--> statement-breakpoint
CREATE INDEX "guests_wedding_idx" ON "guests" USING btree ("wedding_id");--> statement-breakpoint
CREATE INDEX "guests_household_idx" ON "guests" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "guests_table_idx" ON "guests" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "households_wedding_idx" ON "households" USING btree ("wedding_id");--> statement-breakpoint
CREATE INDEX "seating_tables_wedding_idx" ON "seating_tables" USING btree ("wedding_id");--> statement-breakpoint
CREATE INDEX "tasks_wedding_idx" ON "tasks" USING btree ("wedding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_template_uq" ON "tasks" USING btree ("wedding_id","template_key");--> statement-breakpoint
CREATE INDEX "timeline_items_wedding_idx" ON "timeline_items" USING btree ("wedding_id");--> statement-breakpoint
CREATE INDEX "vendors_wedding_idx" ON "vendors" USING btree ("wedding_id");--> statement-breakpoint
CREATE INDEX "wedding_invites_wedding_idx" ON "wedding_invites" USING btree ("wedding_id");--> statement-breakpoint
CREATE INDEX "wedding_members_user_idx" ON "wedding_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");