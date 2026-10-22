"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { BUDGET_CATEGORIES } from "@/data/budget";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { normalizePhone } from "@/lib/phone";
import { requireWorkspace } from "@/lib/session";

function refresh() {
  revalidatePath("/vendors");
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const money = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v.replace(/[,\s₪]/g, ""))))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 10_000_000), "סכום לא תקין");

const categoryKeys = BUDGET_CATEGORIES.map((c) => c.key) as [string, ...string[]];

const vendorSchema = z.object({
  name: z.string().trim().min(1, "חסר שם לספק").max(120),
  category: z.enum(categoryKeys),
  contactName: optText(120),
  phone: optText(40).refine((v) => v === null || normalizePhone(v) !== null, "מספר הטלפון לא נראה תקין"),
  email: optText(160).refine((v) => v === null || z.email().safeParse(v).success, "כתובת האימייל לא תקינה"),
  url: optText(300).refine((v) => v === null || /^https?:\/\//i.test(v), "האתר צריך להתחיל ב-http"),
  instagram: optText(60),
  status: z.enum(["idea", "contacted", "quoted", "booked", "declined"]),
  quoteAmount: money,
  depositAmount: money,
  notes: optText(1000),
});

export async function saveVendorAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = vendorSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
  const id = String(fd.get("id") ?? "");
  if (id) {
    const res = await db
      .update(schema.vendors)
      .set(parsed.data)
      .where(and(eq(schema.vendors.id, id), eq(schema.vendors.weddingId, ws.wedding.id)))
      .returning({ id: schema.vendors.id });
    if (!res.length) return fail("הספק לא נמצא");
  } else {
    await db.insert(schema.vendors).values({ ...parsed.data, weddingId: ws.wedding.id });
  }
  refresh();
  return ok("נשמר");
}

export async function setVendorStatusAction(fd: FormData) {
  const ws = await requireWorkspace();
  const status = z.enum(["idea", "contacted", "quoted", "booked", "declined"]).safeParse(fd.get("status"));
  if (!status.success) return;
  await db
    .update(schema.vendors)
    .set({ status: status.data })
    .where(and(eq(schema.vendors.id, String(fd.get("id") ?? "")), eq(schema.vendors.weddingId, ws.wedding.id)));
  refresh();
}

export async function deleteVendorAction(fd: FormData) {
  const ws = await requireWorkspace();
  await db.delete(schema.vendors).where(and(eq(schema.vendors.id, String(fd.get("id") ?? "")), eq(schema.vendors.weddingId, ws.wedding.id)));
  refresh();
}
