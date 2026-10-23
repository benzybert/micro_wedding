import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

/*
 * Every table has RLS enabled with NO policies. The app connects with the table
 * owner role (bypasses RLS), while Supabase's public REST API (anon/authenticated
 * roles) is denied by default. Guest names and phone numbers must never be
 * readable through PostgREST.
 */

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ───────────────────────── workspace ───────────────────────── */

export type CalendarCustom = "ashkenaz" | "sepharad";
export type CeremonyTrack = "rabbinate" | "private_rabbi" | "civil_abroad" | "other";

export const weddings = pgTable("weddings", {
  id: id(),
  partnerAName: text("partner_a_name").notNull(),
  partnerBName: text("partner_b_name").notNull(),
  /** ISO date (YYYY-MM-DD); null until the couple picks one. */
  weddingDate: date("wedding_date", { mode: "string" }),
  dateLocked: boolean("date_locked").notNull().default(false),
  /** Maximum number of seats (the "micro" in micro wedding). */
  guestCap: integer("guest_cap").notNull().default(40),
  budgetTotal: integer("budget_total"),
  calendarCustom: text("calendar_custom").$type<CalendarCustom>().notNull().default("ashkenaz"),
  ceremonyTrack: text("ceremony_track").$type<CeremonyTrack>().notNull().default("rabbinate"),
  /** Key into the city list used for sunset / candle-lighting times. */
  city: text("city").notNull().default("Tel Aviv"),
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  /** "HH:MM" */
  startTime: text("start_time"),
  rsvpDeadline: date("rsvp_deadline", { mode: "string" }),
  /** Free text shown on the RSVP page (dress code, parking, kids policy ...). */
  rsvpNote: text("rsvp_note"),
  invitationTemplate: text("invitation_template"),
  reminderTemplate: text("reminder_template"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS();

export type MemberRole = "owner" | "partner";

export const weddingMembers = pgTable(
  "wedding_members",
  {
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull().default("partner"),
    /** Which partner this member is: drives "side" defaults and score attribution labels. */
    partner: text("partner").$type<"a" | "b">(),
    joinedAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.weddingId, t.userId] }),
    index("wedding_members_user_idx").on(t.userId),
    // One identity per partner slot (the open-access mode creates them on demand).
    uniqueIndex("wedding_members_partner_uq").on(t.weddingId, t.partner).where(sql`${t.partner} is not null`),
  ],
).enableRLS();

/** Unused since the site became open (no accounts); kept so no migration has to drop it. */
export const weddingInvites = pgTable(
  "wedding_invites",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    /** sha256(token) — the plain token only exists in the link we hand out once. */
    tokenHash: text("token_hash").notNull().unique(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedBy: text("accepted_by").references(() => user.id, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("wedding_invites_wedding_idx").on(t.weddingId)],
).enableRLS();

/* ───────────────────────── guests ───────────────────────── */

export type Side = "a" | "b" | "both";
/** must = A-list, want = B-list, maybe = C-list (the cut line moves between them). */
export type Tier = "must" | "want" | "maybe";
export type Attending = "pending" | "yes" | "no";
export type Diet = "regular" | "vegetarian" | "vegan" | "gluten_free";

export const households = pgTable(
  "households",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    side: text("side").$type<Side>().notNull().default("both"),
    groupLabel: text("group_label"),
    tier: text("tier").$type<Tier>().notNull().default("want"),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    /** Random URL-safe token for the public RSVP link. */
    rsvpToken: text("rsvp_token").notNull().unique(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    rsvpMessage: text("rsvp_message"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("households_wedding_idx").on(t.weddingId)],
).enableRLS();

export const seatingTables = pgTable(
  "seating_tables",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull().default(8),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("seating_tables_wedding_idx").on(t.weddingId)],
).enableRLS();

export const guests = pgTable(
  "guests",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isChild: boolean("is_child").notNull().default(false),
    attending: text("attending").$type<Attending>().notNull().default("pending"),
    diet: text("diet").$type<Diet>().notNull().default("regular"),
    allergies: text("allergies"),
    tableId: uuid("table_id").references(() => seatingTables.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [
    index("guests_wedding_idx").on(t.weddingId),
    index("guests_household_idx").on(t.householdId),
    index("guests_table_idx").on(t.tableId),
  ],
).enableRLS();

export type CandidateStatus = "pending" | "rejected";

/**
 * People pulled from the couple's WhatsApp chats who wait for a yes/no. Approved rows are deleted
 * (they become households + guests); rejected rows stay so the same person is not offered again.
 * These are not guests, so the whole table is meant to be emptied once the review is done.
 */
export const guestCandidates = pgTable(
  "guest_candidates",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Digits-only international form (see normalizePhone). */
    phone: text("phone").notNull(),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }).notNull(),
    status: text("status").$type<CandidateStatus>().notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("guest_candidates_wedding_phone_uq").on(t.weddingId, t.phone)],
).enableRLS();

/* ───────────────────────── decisions ───────────────────────── */

export type DecisionStatus = "open" | "researching" | "decided" | "parked";
export type CostType = "total" | "per_guest";

export const decisions = pgTable(
  "decisions",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull().default("other"),
    description: text("description"),
    status: text("status").$type<DecisionStatus>().notNull().default("open"),
    priority: text("priority").$type<"high" | "normal" | "low">().notNull().default("normal"),
    dueDate: date("due_date", { mode: "string" }),
    /** Days before the wedding; used for template decisions until an explicit dueDate is set. */
    dueOffsetDays: integer("due_offset_days"),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    chosenOptionId: uuid("chosen_option_id"),
    decisionNote: text("decision_note"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByUserId: text("decided_by_user_id").references(() => user.id, { onDelete: "set null" }),
    templateKey: text("template_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("decisions_wedding_idx").on(t.weddingId),
    uniqueIndex("decisions_template_uq").on(t.weddingId, t.templateKey),
  ],
).enableRLS();

export const decisionOptions = pgTable(
  "decision_options",
  {
    id: id(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    details: text("details"),
    costAmount: integer("cost_amount"),
    costType: text("cost_type").$type<CostType>().notNull().default("total"),
    url: text("url"),
    pros: text("pros"),
    cons: text("cons"),
    rejected: boolean("rejected").notNull().default(false),
    vendorId: uuid("vendor_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("decision_options_decision_idx").on(t.decisionId), index("decision_options_wedding_idx").on(t.weddingId)],
).enableRLS();

export const decisionCriteria = pgTable(
  "decision_criteria",
  {
    id: id(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** 1 (nice to have) … 5 (critical) */
    weight: smallint("weight").notNull().default(3),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("decision_criteria_decision_idx").on(t.decisionId)],
).enableRLS();

export const decisionScores = pgTable(
  "decision_scores",
  {
    optionId: uuid("option_id")
      .notNull()
      .references(() => decisionOptions.id, { onDelete: "cascade" }),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => decisionCriteria.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** 1 … 5 */
    score: smallint("score").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.optionId, t.criterionId, t.userId] }), index("decision_scores_criterion_idx").on(t.criterionId)],
).enableRLS();

export const decisionComments = pgTable(
  "decision_comments",
  {
    id: id(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("decision_comments_decision_idx").on(t.decisionId)],
).enableRLS();

/* ───────────────────────── money, vendors, tasks ───────────────────────── */

export type VendorStatus = "idea" | "contacted" | "quoted" | "booked" | "declined";

export const vendors = pgTable(
  "vendors",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("other"),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    url: text("url"),
    instagram: text("instagram"),
    status: text("status").$type<VendorStatus>().notNull().default("idea"),
    quoteAmount: integer("quote_amount"),
    depositAmount: integer("deposit_amount"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("vendors_wedding_idx").on(t.weddingId)],
).enableRLS();

export const budgetItems = pgTable(
  "budget_items",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("other"),
    title: text("title").notNull(),
    /** Estimate in whole ₪. When perGuest, this is the price per seat. */
    plannedAmount: integer("planned_amount").notNull().default(0),
    perGuest: boolean("per_guest").notNull().default(false),
    /** Real quote/invoice in whole ₪ (null until known). When perGuest, per seat as well. */
    actualAmount: integer("actual_amount"),
    paidAmount: integer("paid_amount").notNull().default(0),
    dueDate: date("due_date", { mode: "string" }),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    decisionId: uuid("decision_id").references(() => decisions.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("budget_items_wedding_idx").on(t.weddingId)],
).enableRLS();

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    category: text("category").notNull().default("other"),
    /** Explicit date wins; otherwise weddingDate - dueOffsetDays. */
    dueDate: date("due_date", { mode: "string" }),
    dueOffsetDays: integer("due_offset_days"),
    /** Hard deadline (e.g. rabbinate file ≥45 days before) vs. recommended timing. */
    hardDeadline: boolean("hard_deadline").notNull().default(false),
    done: boolean("done").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    assigneeUserId: text("assignee_user_id").references(() => user.id, { onDelete: "set null" }),
    linkHref: text("link_href"),
    templateKey: text("template_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("tasks_wedding_idx").on(t.weddingId),
    uniqueIndex("tasks_template_uq").on(t.weddingId, t.templateKey),
  ],
).enableRLS();

export const timelineItems = pgTable(
  "timeline_items",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    /** "HH:MM" */
    startTime: text("start_time").notNull(),
    durationMin: integer("duration_min"),
    title: text("title").notNull(),
    notes: text("notes"),
    owner: text("owner"),
    createdAt: createdAt(),
  },
  (t) => [index("timeline_items_wedding_idx").on(t.weddingId)],
).enableRLS();

export const dateCandidates = pgTable(
  "date_candidates",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("date_candidates_uq").on(t.weddingId, t.date)],
).enableRLS();

/* ───────────────────────── activity feed ───────────────────────── */

export const activity = pgTable(
  "activity",
  {
    id: id(),
    weddingId: uuid("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    /** null when the actor is a guest answering an RSVP. */
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    href: text("href"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_wedding_created_idx").on(t.weddingId, t.createdAt)],
).enableRLS();
