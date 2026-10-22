"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { isValidIsoDate } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";
import { logActivity, rescheduleTemplates } from "@/lib/wedding-service";
import { textOrNull } from "@/lib/utils";
import { formatDateLong } from "@/lib/format";

function refresh() {
  for (const p of ["/date", "/home", "/tasks", "/decisions", "/settings"]) revalidatePath(p);
}

export async function addCandidateAction(fd: FormData) {
  const ws = await requireWorkspace();
  const date = String(fd.get("date") ?? "");
  if (!isValidIsoDate(date)) return;
  await db
    .insert(schema.dateCandidates)
    .values({ weddingId: ws.wedding.id, date, note: textOrNull(fd.get("note"), 200) })
    .onConflictDoNothing();
  refresh();
}

export async function removeCandidateAction(fd: FormData) {
  const ws = await requireWorkspace();
  await db
    .delete(schema.dateCandidates)
    .where(and(eq(schema.dateCandidates.id, String(fd.get("id") ?? "")), eq(schema.dateCandidates.weddingId, ws.wedding.id)));
  refresh();
}

/** Make a date THE wedding date: moves every task and decision that is derived from it. */
export async function setWeddingDateAction(fd: FormData) {
  const ws = await requireWorkspace();
  const date = String(fd.get("date") ?? "");
  if (!isValidIsoDate(date)) return;
  await db.update(schema.weddings).set({ weddingDate: date }).where(eq(schema.weddings.id, ws.wedding.id));
  await rescheduleTemplates(ws.wedding.id, date);
  await logActivity(ws.wedding.id, { actorUserId: ws.user.id, kind: "date", text: `תאריך החתונה נקבע: ${formatDateLong(date)}`, href: "/date" });
  refresh();
}

export async function clearWeddingDateAction() {
  const ws = await requireWorkspace();
  await db.update(schema.weddings).set({ weddingDate: null }).where(eq(schema.weddings.id, ws.wedding.id));
  await rescheduleTemplates(ws.wedding.id, null);
  refresh();
}
