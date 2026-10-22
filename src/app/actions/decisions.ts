"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { isValidIsoDate } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";
import { logActivity } from "@/lib/wedding-service";
import { textOrNull } from "@/lib/utils";

function refresh(decisionId?: string) {
  revalidatePath("/decisions");
  if (decisionId) revalidatePath(`/decisions/${decisionId}`);
  revalidatePath("/home");
  revalidatePath("/budget");
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

async function ownDecision(weddingId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [d] = await db
    .select()
    .from(schema.decisions)
    .where(and(eq(schema.decisions.id, id), eq(schema.decisions.weddingId, weddingId)))
    .limit(1);
  return d ?? null;
}

/* ───────── decision ───────── */

const decisionSchema = z.object({
  title: z.string().trim().min(1, "חסרה כותרת").max(160),
  category: z.enum(["date", "venue", "ceremony", "vendors", "attire", "guests", "design", "other"]),
  description: optText(2000),
  priority: z.enum(["high", "normal", "low"]),
  dueDate: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || isValidIsoDate(v), "תאריך לא תקין")
    .nullable(),
});

export async function createDecisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = decisionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
  const [d] = await db
    .insert(schema.decisions)
    .values({ ...parsed.data, weddingId: ws.wedding.id, ownerUserId: ws.user.id, sortOrder: 1000 })
    .returning({ id: schema.decisions.id });
  // A fresh decision starts with sensible default criteria.
  await db.insert(schema.decisionCriteria).values(
    [
      { name: "מחיר", weight: 4 },
      { name: "התאמה לנו", weight: 5 },
      { name: "נוחות", weight: 3 },
    ].map((c, i) => ({ ...c, decisionId: d!.id, weddingId: ws.wedding.id, sortOrder: i })),
  );
  refresh();
  redirect(`/decisions/${d!.id}`);
}

export async function updateDecisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const decision = await ownDecision(ws.wedding.id, String(fd.get("id") ?? ""));
  if (!decision) return fail("ההחלטה לא נמצאה");
  const parsed = decisionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  const status = z.enum(["open", "researching", "parked"]).safeParse(fd.get("status"));
  const owner = String(fd.get("ownerUserId") ?? "");
  await db
    .update(schema.decisions)
    .set({
      ...parsed.data,
      // an edited date replaces the template-derived offset
      dueOffsetDays: parsed.data.dueDate ? null : decision.dueOffsetDays,
      ...(decision.status !== "decided" && status.success ? { status: status.data } : {}),
      ownerUserId: ws.members.some((m) => m.userId === owner) ? owner : null,
    })
    .where(eq(schema.decisions.id, decision.id));
  refresh(decision.id);
  return ok("נשמר");
}

export async function deleteDecisionAction(fd: FormData) {
  const ws = await requireWorkspace();
  const decision = await ownDecision(ws.wedding.id, String(fd.get("id") ?? ""));
  if (decision) await db.delete(schema.decisions).where(eq(schema.decisions.id, decision.id));
  refresh();
  redirect("/decisions");
}

/* ───────── options ───────── */

const optionSchema = z.object({
  name: z.string().trim().min(1, "חסר שם לאפשרות").max(160),
  details: optText(1000),
  costAmount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(/[,\s₪]/g, ""))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 10_000_000), "סכום לא תקין")
    .nullable(),
  costType: z.enum(["total", "per_guest"]),
  url: optText(500).refine((v) => v === null || /^https?:\/\//i.test(v), "הקישור צריך להתחיל ב-http"),
  pros: optText(600),
  cons: optText(600),
});

export async function saveOptionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const decision = await ownDecision(ws.wedding.id, String(fd.get("decisionId") ?? ""));
  if (!decision) return fail("ההחלטה לא נמצאה");
  const parsed = optionSchema.safeParse({
    name: fd.get("name") ?? "",
    details: fd.get("details") ?? "",
    costAmount: fd.get("costAmount") ?? "",
    costType: fd.get("costType") ?? "total",
    url: fd.get("url") ?? "",
    pros: fd.get("pros") ?? "",
    cons: fd.get("cons") ?? "",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  const id = String(fd.get("id") ?? "");
  if (id) {
    const res = await db
      .update(schema.decisionOptions)
      .set(parsed.data)
      .where(and(eq(schema.decisionOptions.id, id), eq(schema.decisionOptions.decisionId, decision.id)))
      .returning({ id: schema.decisionOptions.id });
    if (!res.length) return fail("האפשרות לא נמצאה");
  } else {
    const existing = await db.select({ id: schema.decisionOptions.id }).from(schema.decisionOptions).where(eq(schema.decisionOptions.decisionId, decision.id));
    if (existing.length >= 20) return fail("עד 20 אפשרויות להחלטה");
    await db.insert(schema.decisionOptions).values({ ...parsed.data, decisionId: decision.id, weddingId: ws.wedding.id, sortOrder: existing.length });
    if (decision.status === "open") await db.update(schema.decisions).set({ status: "researching" }).where(eq(schema.decisions.id, decision.id));
  }
  refresh(decision.id);
  return ok("נשמר");
}

export async function toggleRejectOptionAction(fd: FormData) {
  const ws = await requireWorkspace();
  const id = String(fd.get("id") ?? "");
  const [o] = await db
    .select()
    .from(schema.decisionOptions)
    .where(and(eq(schema.decisionOptions.id, id), eq(schema.decisionOptions.weddingId, ws.wedding.id)))
    .limit(1);
  if (!o) return;
  await db.update(schema.decisionOptions).set({ rejected: !o.rejected }).where(eq(schema.decisionOptions.id, o.id));
  refresh(o.decisionId);
}

export async function deleteOptionAction(fd: FormData) {
  const ws = await requireWorkspace();
  const id = String(fd.get("id") ?? "");
  const [o] = await db
    .select({ decisionId: schema.decisionOptions.decisionId })
    .from(schema.decisionOptions)
    .where(and(eq(schema.decisionOptions.id, id), eq(schema.decisionOptions.weddingId, ws.wedding.id)))
    .limit(1);
  if (!o) return;
  await db.delete(schema.decisionOptions).where(eq(schema.decisionOptions.id, id));
  refresh(o.decisionId);
}

/* ───────── criteria ───────── */

const criterionSchema = z.object({
  name: z.string().trim().min(1, "חסר שם לקריטריון").max(100),
  weight: z.coerce.number().int().min(1).max(5),
});

export async function saveCriterionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const decision = await ownDecision(ws.wedding.id, String(fd.get("decisionId") ?? ""));
  if (!decision) return fail("ההחלטה לא נמצאה");
  const parsed = criterionSchema.safeParse({ name: fd.get("name"), weight: fd.get("weight") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  const id = String(fd.get("id") ?? "");
  if (id) {
    await db
      .update(schema.decisionCriteria)
      .set(parsed.data)
      .where(and(eq(schema.decisionCriteria.id, id), eq(schema.decisionCriteria.decisionId, decision.id)));
  } else {
    const existing = await db.select({ id: schema.decisionCriteria.id }).from(schema.decisionCriteria).where(eq(schema.decisionCriteria.decisionId, decision.id));
    if (existing.length >= 12) return fail("עד 12 קריטריונים");
    await db.insert(schema.decisionCriteria).values({ ...parsed.data, decisionId: decision.id, weddingId: ws.wedding.id, sortOrder: existing.length });
  }
  refresh(decision.id);
  return ok("נשמר");
}

export async function deleteCriterionAction(fd: FormData) {
  const ws = await requireWorkspace();
  const id = String(fd.get("id") ?? "");
  const [c] = await db
    .select({ decisionId: schema.decisionCriteria.decisionId })
    .from(schema.decisionCriteria)
    .where(and(eq(schema.decisionCriteria.id, id), eq(schema.decisionCriteria.weddingId, ws.wedding.id)))
    .limit(1);
  if (!c) return;
  await db.delete(schema.decisionCriteria).where(eq(schema.decisionCriteria.id, id));
  refresh(c.decisionId);
}

/* ───────── scores (each partner rates independently) ───────── */

export async function saveScoresAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const decision = await ownDecision(ws.wedding.id, String(fd.get("decisionId") ?? ""));
  if (!decision) return fail("ההחלטה לא נמצאה");

  const [options, criteria] = await Promise.all([
    db.select({ id: schema.decisionOptions.id }).from(schema.decisionOptions).where(eq(schema.decisionOptions.decisionId, decision.id)),
    db.select({ id: schema.decisionCriteria.id }).from(schema.decisionCriteria).where(eq(schema.decisionCriteria.decisionId, decision.id)),
  ]);

  const upserts: { optionId: string; criterionId: string; userId: string; score: number }[] = [];
  const clears: { optionId: string; criterionId: string }[] = [];
  for (const o of options) {
    for (const c of criteria) {
      const raw = fd.get(`s_${o.id}_${c.id}`);
      if (raw === null) continue;
      const n = Number(raw);
      if (n >= 1 && n <= 5 && Number.isInteger(n)) upserts.push({ optionId: o.id, criterionId: c.id, userId: ws.user.id, score: n });
      else if (raw === "0" || raw === "") clears.push({ optionId: o.id, criterionId: c.id });
    }
  }

  await db.transaction(async (tx) => {
    for (const u of upserts) {
      await tx
        .insert(schema.decisionScores)
        .values(u)
        .onConflictDoUpdate({
          target: [schema.decisionScores.optionId, schema.decisionScores.criterionId, schema.decisionScores.userId],
          set: { score: u.score, updatedAt: new Date() },
        });
    }
    for (const c of clears) {
      await tx
        .delete(schema.decisionScores)
        .where(
          and(
            eq(schema.decisionScores.optionId, c.optionId),
            eq(schema.decisionScores.criterionId, c.criterionId),
            eq(schema.decisionScores.userId, ws.user.id),
          ),
        );
    }
  });
  if (upserts.length) {
    await logActivity(ws.wedding.id, { actorUserId: ws.user.id, kind: "scores", text: `${ws.user.name} דירג/ה: ${decision.title}`, href: `/decisions/${decision.id}` });
  }
  refresh(decision.id);
  return ok("הציונים שלך נשמרו");
}

/* ───────── deciding ───────── */

export async function decideAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const decision = await ownDecision(ws.wedding.id, String(fd.get("decisionId") ?? ""));
  if (!decision) return fail("ההחלטה לא נמצאה");

  const optionId = String(fd.get("optionId") ?? "");
  const [option] = await db
    .select()
    .from(schema.decisionOptions)
    .where(and(eq(schema.decisionOptions.id, optionId), eq(schema.decisionOptions.decisionId, decision.id)))
    .limit(1);
  const customChoice = textOrNull(fd.get("customChoice"), 160);
  if (!option && !customChoice) return fail("בחרו אפשרות, או כתבו מה הוחלט.");

  await db.transaction(async (tx) => {
    let chosenId = option?.id ?? null;
    let chosen = option;
    if (!option && customChoice) {
      const [created] = await tx
        .insert(schema.decisionOptions)
        .values({ decisionId: decision.id, weddingId: ws.wedding.id, name: customChoice, sortOrder: 99 })
        .returning();
      chosenId = created!.id;
      chosen = created!;
    }
    await tx
      .update(schema.decisions)
      .set({
        status: "decided",
        chosenOptionId: chosenId,
        decisionNote: textOrNull(fd.get("note"), 1500),
        decidedAt: new Date(),
        decidedByUserId: ws.user.id,
      })
      .where(eq(schema.decisions.id, decision.id));

    if (fd.get("addToBudget") === "on" && chosen && chosen.costAmount != null) {
      await tx.insert(schema.budgetItems).values({
        weddingId: ws.wedding.id,
        category: budgetCategoryFor(decision.category),
        title: `${decision.title}: ${chosen.name}`,
        plannedAmount: chosen.costAmount,
        perGuest: chosen.costType === "per_guest",
        decisionId: decision.id,
      });
    }
    await logActivity(
      ws.wedding.id,
      { actorUserId: ws.user.id, kind: "decided", text: `הוחלט: ${decision.title} → ${chosen?.name ?? ""}`, href: `/decisions/${decision.id}` },
      tx,
    );
  });
  refresh(decision.id);
  return ok("ההחלטה נרשמה");
}

function budgetCategoryFor(decisionCategory: string): string {
  switch (decisionCategory) {
    case "venue":
      return "venue_catering";
    case "attire":
      return "attire";
    case "design":
      return "flowers_design";
    case "ceremony":
      return "ceremony_fees";
    default:
      return "other";
  }
}

export async function reopenDecisionAction(fd: FormData) {
  const ws = await requireWorkspace();
  const decision = await ownDecision(ws.wedding.id, String(fd.get("id") ?? ""));
  if (!decision) return;
  await db
    .update(schema.decisions)
    .set({ status: "researching", chosenOptionId: null, decidedAt: null, decidedByUserId: null })
    .where(eq(schema.decisions.id, decision.id));
  refresh(decision.id);
}

/* ───────── comments ───────── */

export async function addCommentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const decision = await ownDecision(ws.wedding.id, String(fd.get("decisionId") ?? ""));
  if (!decision) return fail("ההחלטה לא נמצאה");
  const body = textOrNull(fd.get("body"), 1500);
  if (!body) return fail("כתבו משהו קודם");
  await db.insert(schema.decisionComments).values({ decisionId: decision.id, userId: ws.user.id, body });
  refresh(decision.id);
  return ok();
}

export async function deleteCommentAction(fd: FormData) {
  const ws = await requireWorkspace();
  const id = String(fd.get("id") ?? "");
  const mine = await db
    .select({ id: schema.decisionComments.id, decisionId: schema.decisionComments.decisionId })
    .from(schema.decisionComments)
    .innerJoin(schema.decisions, eq(schema.decisions.id, schema.decisionComments.decisionId))
    .where(and(eq(schema.decisionComments.id, id), eq(schema.decisionComments.userId, ws.user.id), eq(schema.decisions.weddingId, ws.wedding.id)))
    .limit(1);
  if (!mine[0]) return;
  await db.delete(schema.decisionComments).where(inArray(schema.decisionComments.id, [id]));
  refresh(mine[0].decisionId);
}
