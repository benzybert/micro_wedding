"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { isValidIsoDate } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";
import { textOrNull } from "@/lib/utils";

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/home");
}

export async function toggleTaskAction(fd: FormData) {
  const ws = await requireWorkspace();
  const id = String(fd.get("id") ?? "");
  const [t] = await db
    .select({ id: schema.tasks.id, done: schema.tasks.done })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.weddingId, ws.wedding.id)))
    .limit(1);
  if (!t) return;
  await db.update(schema.tasks).set({ done: !t.done, doneAt: t.done ? null : new Date() }).where(eq(schema.tasks.id, t.id));
  refresh();
}

const taskSchema = z.object({
  title: z.string().trim().min(1, "חסר שם למשימה").max(200),
  category: z.enum(["planning", "legal", "vendors", "guests", "attire", "logistics", "after"]),
  dueDate: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || isValidIsoDate(v), "תאריך לא תקין")
    .nullable(),
});

export async function createTaskAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = taskSchema.safeParse({ title: fd.get("title"), category: fd.get("category") ?? "planning", dueDate: fd.get("dueDate") ?? "" });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
  await db.insert(schema.tasks).values({ ...parsed.data, weddingId: ws.wedding.id, notes: textOrNull(fd.get("notes"), 600), sortOrder: 1000 });
  refresh();
  return ok("המשימה נוספה");
}

export async function updateTaskDateAction(fd: FormData) {
  const ws = await requireWorkspace();
  const raw = String(fd.get("dueDate") ?? "");
  const date = raw === "" ? null : isValidIsoDate(raw) ? raw : undefined;
  if (date === undefined) return;
  await db
    .update(schema.tasks)
    .set({ dueDate: date, ...(date ? { dueOffsetDays: null } : {}) })
    .where(and(eq(schema.tasks.id, String(fd.get("id") ?? "")), eq(schema.tasks.weddingId, ws.wedding.id)));
  refresh();
}

export async function deleteTaskAction(fd: FormData) {
  const ws = await requireWorkspace();
  await db.delete(schema.tasks).where(and(eq(schema.tasks.id, String(fd.get("id") ?? "")), eq(schema.tasks.weddingId, ws.wedding.id)));
  refresh();
}
