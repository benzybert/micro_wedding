"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ACUM_FAMILY_EVENT_2026, BUDGET_CATEGORIES } from "@/data/budget";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { suggestAllocation } from "@/lib/budget";
import { isValidIsoDate } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";
import { textOrNull } from "@/lib/utils";

function refresh() {
  revalidatePath("/budget");
  revalidatePath("/home");
  revalidatePath("/settings");
}

const money = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(/[,\s₪]/g, ""))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 10_000_000), `${label} לא תקין`);

const categoryKeys = BUDGET_CATEGORIES.map((c) => c.key) as [string, ...string[]];

const itemSchema = z.object({
  title: z.string().trim().min(1, "חסר שם לסעיף").max(160),
  category: z.enum(categoryKeys),
  plannedAmount: money("הסכום המתוכנן").transform((v) => v ?? 0),
  actualAmount: money("הסכום בפועל"),
  paidAmount: money("הסכום ששולם").transform((v) => v ?? 0),
  dueDate: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || isValidIsoDate(v), "תאריך לא תקין")
    .nullable(),
});

export async function saveBudgetItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = itemSchema.safeParse({
    title: fd.get("title") ?? "",
    category: fd.get("category") ?? "other",
    plannedAmount: fd.get("plannedAmount") ?? "",
    actualAmount: fd.get("actualAmount") ?? "",
    paidAmount: fd.get("paidAmount") ?? "",
    dueDate: fd.get("dueDate") ?? "",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
  const values = { ...parsed.data, perGuest: fd.get("perGuest") === "on", notes: textOrNull(fd.get("notes"), 500) };

  const id = String(fd.get("id") ?? "");
  if (id) {
    const res = await db
      .update(schema.budgetItems)
      .set(values)
      .where(and(eq(schema.budgetItems.id, id), eq(schema.budgetItems.weddingId, ws.wedding.id)))
      .returning({ id: schema.budgetItems.id });
    if (!res.length) return fail("הסעיף לא נמצא");
  } else {
    await db.insert(schema.budgetItems).values({ ...values, weddingId: ws.wedding.id });
  }
  refresh();
  return ok("נשמר");
}

export async function deleteBudgetItemAction(fd: FormData) {
  const ws = await requireWorkspace();
  await db.delete(schema.budgetItems).where(and(eq(schema.budgetItems.id, String(fd.get("id") ?? "")), eq(schema.budgetItems.weddingId, ws.wedding.id)));
  refresh();
}

export async function setBudgetTotalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = money("התקציב").safeParse(fd.get("budgetTotal") ?? "");
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "תקציב לא תקין");
  await db.update(schema.weddings).set({ budgetTotal: parsed.data }).where(eq(schema.weddings.id, ws.wedding.id));
  refresh();
  return ok("התקציב עודכן");
}

/** One line per standard category, sized from the total budget. Only when the budget is still empty. */
export async function seedBudgetAction(): Promise<ActionState> {
  const ws = await requireWorkspace();
  if (!ws.wedding.budgetTotal) return fail("קודם קובעים תקציב כולל.");
  const existing = await db.select({ id: schema.budgetItems.id }).from(schema.budgetItems).where(eq(schema.budgetItems.weddingId, ws.wedding.id)).limit(1);
  if (existing.length) return fail("כבר יש סעיפים בתקציב.");

  const labels = new Map(BUDGET_CATEGORIES.map((c) => [c.key, c.he] as const));
  const rows = suggestAllocation(ws.wedding.budgetTotal).map((r) => ({
    weddingId: ws.wedding.id,
    category: r.key,
    title: labels.get(r.key) ?? r.key,
    plannedAmount: r.amount,
  }));
  await db.insert(schema.budgetItems).values(rows);
  refresh();
  return ok("נוצר תקציב התחלתי לפי חלוקה מקובלת. עדכנו כל סעיף למציאות.");
}

export async function addAcumAction(): Promise<ActionState> {
  const ws = await requireWorkspace();
  await db.insert(schema.budgetItems).values({
    weddingId: ws.wedding.id,
    category: "music",
    title: "רישיון אקו״ם לאירוע משפחתי",
    plannedAmount: Math.ceil(ACUM_FAMILY_EVENT_2026),
    notes: "תעריף 2026: 395.30 ₪ כולל מע״מ. לשלם לפחות 72 שעות לפני האירוע ולוודא מי משלם (DJ או אתם).",
  });
  refresh();
  return ok("נוסף");
}
