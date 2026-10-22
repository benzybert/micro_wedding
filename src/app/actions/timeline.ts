"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { TIMELINE_TEMPLATE, addMinutes } from "@/data/timeline-template";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { requireWorkspace } from "@/lib/session";
import { textOrNull } from "@/lib/utils";

function refresh() {
  revalidatePath("/timeline");
}

const itemSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "שעה לא תקינה"),
  title: z.string().trim().min(1, "חסר שם לשלב").max(160),
  durationMin: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 600), "משך לא תקין")
    .nullable(),
});

export async function saveTimelineItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = itemSchema.safeParse({ startTime: fd.get("startTime"), title: fd.get("title") ?? "", durationMin: fd.get("durationMin") ?? "" });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
  const values = { ...parsed.data, notes: textOrNull(fd.get("notes"), 500), owner: textOrNull(fd.get("owner"), 80) };

  const id = String(fd.get("id") ?? "");
  if (id) {
    await db
      .update(schema.timelineItems)
      .set(values)
      .where(and(eq(schema.timelineItems.id, id), eq(schema.timelineItems.weddingId, ws.wedding.id)));
  } else {
    await db.insert(schema.timelineItems).values({ ...values, weddingId: ws.wedding.id });
  }
  refresh();
  return ok("נשמר");
}

export async function deleteTimelineItemAction(fd: FormData) {
  const ws = await requireWorkspace();
  await db.delete(schema.timelineItems).where(and(eq(schema.timelineItems.id, String(fd.get("id") ?? "")), eq(schema.timelineItems.weddingId, ws.wedding.id)));
  refresh();
}

/** Fill an empty timeline from the template, anchored on the chuppah time. */
export async function seedTimelineAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const chuppah = String(fd.get("chuppah") ?? "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(chuppah)) return fail("שעת חופה לא תקינה");
  const existing = await db.select({ id: schema.timelineItems.id }).from(schema.timelineItems).where(eq(schema.timelineItems.weddingId, ws.wedding.id)).limit(1);
  if (existing.length) return fail("כבר יש שלבים בלו״ז.");
  await db.insert(schema.timelineItems).values(
    TIMELINE_TEMPLATE.map((t) => ({
      weddingId: ws.wedding.id,
      startTime: addMinutes(chuppah, t.offsetMin),
      durationMin: t.durationMin || null,
      title: t.title,
      notes: t.notes ?? null,
    })),
  );
  refresh();
  return ok("נוצר לו״ז לדוגמה. התאימו אותו לכם.");
}
