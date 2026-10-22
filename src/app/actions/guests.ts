"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { parseGuestImport } from "@/lib/csv";
import { autoSeat, parseMemberLines } from "@/lib/guests";
import { normalizePhone } from "@/lib/phone";
import { requireWorkspace } from "@/lib/session";
import { newToken } from "@/lib/token";
import { textOrNull } from "@/lib/utils";

function refresh() {
  revalidatePath("/guests", "layout");
  revalidatePath("/home");
  revalidatePath("/budget");
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const householdSchema = z.object({
  name: z.string().trim().min(1, "חסר שם למשק הבית").max(120),
  side: z.enum(["a", "b", "both"]),
  tier: z.enum(["must", "want", "maybe"]),
  groupLabel: optionalText(60),
  phone: optionalText(40).refine((v) => v === null || normalizePhone(v) !== null, "מספר הטלפון לא נראה תקין"),
  email: optionalText(160).refine((v) => v === null || z.email().safeParse(v).success, "כתובת האימייל לא תקינה"),
  notes: optionalText(500),
});

function readHousehold(fd: FormData) {
  return householdSchema.safeParse({
    name: fd.get("name") ?? "",
    side: fd.get("side") ?? "both",
    tier: fd.get("tier") ?? "want",
    groupLabel: fd.get("groupLabel") ?? "",
    phone: fd.get("phone") ?? "",
    email: fd.get("email") ?? "",
    notes: fd.get("notes") ?? "",
  });
}

/** Create a household with its members typed one per line. */
export async function createHouseholdAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = readHousehold(fd);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  const members = parseMemberLines(String(fd.get("members") ?? ""));
  const people = members.length ? members : [{ name: parsed.data.name, isChild: false }];

  await db.transaction(async (tx) => {
    const [h] = await tx
      .insert(schema.households)
      .values({ ...parsed.data, weddingId: ws.wedding.id, rsvpToken: newToken() })
      .returning({ id: schema.households.id });
    await tx.insert(schema.guests).values(people.map((p) => ({ weddingId: ws.wedding.id, householdId: h!.id, name: p.name, isChild: p.isChild })));
  });
  refresh();
  redirect("/guests");
}

export async function updateHouseholdAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const id = String(fd.get("id") ?? "");
  const parsed = readHousehold(fd);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
  const res = await db
    .update(schema.households)
    .set(parsed.data)
    .where(and(eq(schema.households.id, id), eq(schema.households.weddingId, ws.wedding.id)))
    .returning({ id: schema.households.id });
  if (!res.length) return fail("משק הבית לא נמצא");
  refresh();
  return ok("נשמר");
}

export async function deleteHouseholdAction(fd: FormData) {
  const ws = await requireWorkspace();
  const id = String(fd.get("id") ?? "");
  await db.delete(schema.households).where(and(eq(schema.households.id, id), eq(schema.households.weddingId, ws.wedding.id)));
  refresh();
  redirect("/guests");
}

export async function setTierAction(fd: FormData) {
  const ws = await requireWorkspace();
  const tier = z.enum(["must", "want", "maybe"]).safeParse(fd.get("tier"));
  if (!tier.success) return;
  await db
    .update(schema.households)
    .set({ tier: tier.data })
    .where(and(eq(schema.households.id, String(fd.get("id") ?? "")), eq(schema.households.weddingId, ws.wedding.id)));
  refresh();
}

/* ───────── members ───────── */

const memberSchema = z.object({
  name: z.string().trim().min(1, "חסר שם").max(120),
  isChild: z.boolean(),
  attending: z.enum(["pending", "yes", "no"]),
  diet: z.enum(["regular", "vegetarian", "vegan", "gluten_free"]),
  allergies: optionalText(200),
  notes: optionalText(300),
});

export async function saveMemberAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = memberSchema.safeParse({
    name: fd.get("name") ?? "",
    isChild: fd.get("isChild") === "on",
    attending: fd.get("attending") ?? "pending",
    diet: fd.get("diet") ?? "regular",
    allergies: fd.get("allergies") ?? "",
    notes: fd.get("notes") ?? "",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  const id = String(fd.get("id") ?? "");
  const householdId = String(fd.get("householdId") ?? "");
  if (id) {
    const res = await db
      .update(schema.guests)
      .set(parsed.data)
      .where(and(eq(schema.guests.id, id), eq(schema.guests.weddingId, ws.wedding.id)))
      .returning({ id: schema.guests.id });
    if (!res.length) return fail("האורח לא נמצא");
  } else {
    const [h] = await db
      .select({ id: schema.households.id })
      .from(schema.households)
      .where(and(eq(schema.households.id, householdId), eq(schema.households.weddingId, ws.wedding.id)))
      .limit(1);
    if (!h) return fail("משק הבית לא נמצא");
    await db.insert(schema.guests).values({ ...parsed.data, weddingId: ws.wedding.id, householdId: h.id });
  }
  refresh();
  return ok("נשמר");
}

export async function deleteMemberAction(fd: FormData) {
  const ws = await requireWorkspace();
  await db.delete(schema.guests).where(and(eq(schema.guests.id, String(fd.get("id") ?? "")), eq(schema.guests.weddingId, ws.wedding.id)));
  refresh();
}

/* ───────── invitations ───────── */

/** Called when the sender opens WhatsApp for a household, so the list shows who was already contacted. */
export async function markContactedAction(householdId: string, kind: "invite" | "reminder") {
  const ws = await requireWorkspace();
  const now = new Date();
  await db
    .update(schema.households)
    .set(kind === "invite" ? { invitedAt: now } : { remindedAt: now })
    .where(and(eq(schema.households.id, householdId), eq(schema.households.weddingId, ws.wedding.id)));
  refresh();
}

export async function unmarkInvitedAction(fd: FormData) {
  const ws = await requireWorkspace();
  await db
    .update(schema.households)
    .set({ invitedAt: null })
    .where(and(eq(schema.households.id, String(fd.get("id") ?? "")), eq(schema.households.weddingId, ws.wedding.id)));
  refresh();
}

/* ───────── import ───────── */

export async function importGuestsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const text = String(fd.get("csv") ?? "");
  if (text.length > 400_000) return fail("הקובץ גדול מדי.");
  const { guests, errors } = parseGuestImport(text, { a: ws.wedding.partnerAName, b: ws.wedding.partnerBName });
  if (!guests.length) return fail(errors[0] ?? "לא נמצאו אורחים לייבוא.");

  const existing = await db.select({ name: schema.households.name }).from(schema.households).where(eq(schema.households.weddingId, ws.wedding.id));
  const taken = new Set(existing.map((h) => h.name.trim().toLowerCase()));

  const byHousehold = new Map<string, typeof guests>();
  for (const g of guests) {
    const key = g.household.trim().toLowerCase();
    byHousehold.set(key, [...(byHousehold.get(key) ?? []), g]);
  }

  let created = 0;
  let skipped = 0;
  await db.transaction(async (tx) => {
    for (const [key, members] of byHousehold) {
      if (taken.has(key)) {
        skipped += 1;
        continue;
      }
      const first = members[0]!;
      const pick = <K extends keyof typeof first>(k: K) => members.map((m) => m[k]).find(Boolean) ?? first[k];
      const phone = (pick("phone") as string | null) ?? null;
      const [h] = await tx
        .insert(schema.households)
        .values({
          weddingId: ws.wedding.id,
          name: first.household,
          side: first.side,
          tier: first.tier,
          phone: phone && normalizePhone(phone) ? phone : null,
          email: (pick("email") as string | null) ?? null,
          rsvpToken: newToken(),
        })
        .returning({ id: schema.households.id });
      await tx.insert(schema.guests).values(
        members.map((m) => ({
          weddingId: ws.wedding.id,
          householdId: h!.id,
          name: m.name,
          isChild: m.isChild,
          diet: m.diet,
          allergies: m.allergies,
          notes: m.notes,
        })),
      );
      created += 1;
    }
  });
  refresh();
  const parts = [`יובאו ${created} משקי בית`];
  if (skipped) parts.push(`${skipped} דולגו (השם כבר קיים)`);
  if (errors.length) parts.push(errors.slice(0, 2).join(" "));
  return ok(parts.join(". ") + ".");
}

/* ───────── seating ───────── */

export async function createTableAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const capacity = z.coerce.number().int().min(1).max(40).safeParse(fd.get("capacity"));
  if (!capacity.success) return fail("מספר מקומות בין 1 ל-40");
  const existing = await db.select({ id: schema.seatingTables.id }).from(schema.seatingTables).where(eq(schema.seatingTables.weddingId, ws.wedding.id));
  const name = textOrNull(fd.get("name"), 60) ?? `שולחן ${existing.length + 1}`;
  await db.insert(schema.seatingTables).values({ weddingId: ws.wedding.id, name, capacity: capacity.data, sortOrder: existing.length });
  refresh();
  return ok("השולחן נוסף");
}

export async function deleteTableAction(fd: FormData) {
  const ws = await requireWorkspace();
  await db.delete(schema.seatingTables).where(and(eq(schema.seatingTables.id, String(fd.get("id") ?? "")), eq(schema.seatingTables.weddingId, ws.wedding.id)));
  refresh();
}

export async function assignTableAction(fd: FormData) {
  const ws = await requireWorkspace();
  const guestId = String(fd.get("guestId") ?? "");
  const tableId = String(fd.get("tableId") ?? "");
  let target: string | null = null;
  if (tableId) {
    const [t] = await db
      .select({ id: schema.seatingTables.id })
      .from(schema.seatingTables)
      .where(and(eq(schema.seatingTables.id, tableId), eq(schema.seatingTables.weddingId, ws.wedding.id)))
      .limit(1);
    if (!t) return;
    target = t.id;
  }
  await db.update(schema.guests).set({ tableId: target }).where(and(eq(schema.guests.id, guestId), eq(schema.guests.weddingId, ws.wedding.id)));
  refresh();
}

export async function autoSeatAction(): Promise<ActionState> {
  const ws = await requireWorkspace();
  const [tables, households, guests] = await Promise.all([
    db.select().from(schema.seatingTables).where(eq(schema.seatingTables.weddingId, ws.wedding.id)).orderBy(schema.seatingTables.sortOrder),
    db.select().from(schema.households).where(eq(schema.households.weddingId, ws.wedding.id)),
    db.select().from(schema.guests).where(eq(schema.guests.weddingId, ws.wedding.id)),
  ]);
  if (!tables.length) return fail("קודם מוסיפים שולחנות.");
  const { assignments, unplaced } = autoSeat(tables, households, guests);
  await db.transaction(async (tx) => {
    for (const tableId of new Set(assignments.map((a) => a.tableId))) {
      const ids = assignments.filter((a) => a.tableId === tableId).map((a) => a.guestId);
      await tx.update(schema.guests).set({ tableId }).where(and(inArray(schema.guests.id, ids), eq(schema.guests.weddingId, ws.wedding.id)));
    }
  });
  refresh();
  return ok(unplaced.length ? `הושבו ${assignments.length}. ${unplaced.length} נשארו בלי מקום, צריך עוד שולחנות.` : `הושבו ${assignments.length} אורחים.`);
}

export async function clearSeatingAction(): Promise<ActionState> {
  const ws = await requireWorkspace();
  await db.update(schema.guests).set({ tableId: null }).where(eq(schema.guests.weddingId, ws.wedding.id));
  refresh();
  return ok("ההושבה אופסה");
}
