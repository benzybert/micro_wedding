import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db, schema, type Db } from "@/db";
import { templatesForTrack } from "@/data/task-templates";
import { DECISION_TEMPLATES, decisionTemplatesForTrack } from "@/data/decision-templates";
import { TASK_TEMPLATES } from "@/data/task-templates";
import { compressOffset, daysUntilWedding } from "@/lib/plan-schedule";
import { todayIso } from "@/lib/format";
import type { CalendarCustom, CeremonyTrack } from "@/db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

export type NewWedding = {
  userId: string;
  partnerAName: string;
  partnerBName: string;
  weddingDate: string | null;
  guestCap: number;
  calendarCustom: CalendarCustom;
  ceremonyTrack: CeremonyTrack;
  city: string;
};

/** Create a workspace, make the user its owner (partner A) and seed the starter checklist and decisions. */
export async function createWedding(input: NewWedding): Promise<string> {
  return db.transaction(async (tx) => {
    const [wedding] = await tx
      .insert(schema.weddings)
      .values({
        partnerAName: input.partnerAName,
        partnerBName: input.partnerBName,
        weddingDate: input.weddingDate,
        guestCap: input.guestCap,
        calendarCustom: input.calendarCustom,
        ceremonyTrack: input.ceremonyTrack,
        city: input.city,
      })
      .returning({ id: schema.weddings.id });
    const weddingId = wedding!.id;
    await tx.insert(schema.weddingMembers).values({ weddingId, userId: input.userId, role: "owner", partner: "a" });
    await ensureTemplates(tx, weddingId, input.ceremonyTrack, input.weddingDate);
    return weddingId;
  });
}

/**
 * Idempotently add template tasks and decisions for a ceremony track. Existing (and edited) rows are never
 * touched; (wedding_id, template_key) is unique, so re-running or switching tracks only adds what is missing.
 */
export async function ensureTemplates(
  executor: Executor,
  weddingId: string,
  track: CeremonyTrack,
  weddingDate: string | null,
  today: string = todayIso(),
) {
  const daysLeft = daysUntilWedding(weddingDate, today);
  const tasks = templatesForTrack(track);
  if (tasks.length) {
    await executor
      .insert(schema.tasks)
      .values(
        tasks.map((t, i) => ({
          weddingId,
          title: t.title,
          notes: t.notes ?? null,
          category: t.category,
          dueOffsetDays: compressOffset(t.offsetDays, { hard: t.hard, daysLeft }),
          hardDeadline: t.hard ?? false,
          linkHref: t.link ?? null,
          templateKey: t.key,
          sortOrder: i,
        })),
      )
      .onConflictDoNothing();
  }

  const templates = decisionTemplatesForTrack(track);
  const existing = await executor
    .select({ key: schema.decisions.templateKey })
    .from(schema.decisions)
    .where(and(eq(schema.decisions.weddingId, weddingId), inArray(schema.decisions.templateKey, templates.map((t) => t.key))));
  const have = new Set(existing.map((e) => e.key));

  for (const [i, t] of templates.entries()) {
    if (have.has(t.key)) continue;
    const [d] = await executor
      .insert(schema.decisions)
      .values({
        weddingId,
        title: t.title,
        category: t.category,
        description: t.description,
        priority: t.priority,
        dueOffsetDays: compressOffset(t.offsetDays, { daysLeft }),
        templateKey: t.key,
        sortOrder: i,
      })
      .onConflictDoNothing()
      .returning({ id: schema.decisions.id });
    if (!d) continue;
    await executor.insert(schema.decisionCriteria).values(
      t.criteria.map((c, ci) => ({ decisionId: d.id, weddingId, name: c.name, weight: c.weight, sortOrder: ci })),
    );
    if (t.options?.length) {
      await executor.insert(schema.decisionOptions).values(
        t.options.map((o, oi) => ({ decisionId: d.id, weddingId, name: o.name, details: o.details ?? null, sortOrder: oi })),
      );
    }
  }
}

export async function logActivity(
  weddingId: string,
  entry: { actorUserId?: string | null; kind: string; text: string; href?: string | null },
  executor: Executor = db,
) {
  await executor.insert(schema.activity).values({
    weddingId,
    actorUserId: entry.actorUserId ?? null,
    kind: entry.kind,
    text: entry.text.slice(0, 300),
    href: entry.href ?? null,
  });
}

/**
 * The wedding date changed: re-derive the offsets of template tasks/decisions that are still open and have no
 * explicit date, so a closer (or further) date compresses (or relaxes) the plan. Edited dates are never touched.
 */
export async function rescheduleTemplates(weddingId: string, weddingDate: string | null, today: string = todayIso()) {
  const daysLeft = daysUntilWedding(weddingDate, today);
  await db.transaction(async (tx) => {
    const tasks = await tx
      .select({ id: schema.tasks.id, key: schema.tasks.templateKey })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.weddingId, weddingId), isNotNull(schema.tasks.templateKey), eq(schema.tasks.done, false)));
    const taskTpl = new Map(TASK_TEMPLATES.map((t) => [t.key, t] as const));
    for (const t of tasks) {
      const tpl = t.key ? taskTpl.get(t.key) : undefined;
      if (!tpl) continue;
      await tx
        .update(schema.tasks)
        .set({ dueOffsetDays: compressOffset(tpl.offsetDays, { hard: tpl.hard, daysLeft }) })
        .where(eq(schema.tasks.id, t.id));
    }

    const decisions = await tx
      .select({ id: schema.decisions.id, key: schema.decisions.templateKey })
      .from(schema.decisions)
      .where(and(eq(schema.decisions.weddingId, weddingId), isNotNull(schema.decisions.templateKey), isNotDecided()));
    const decTpl = new Map(DECISION_TEMPLATES.map((t) => [t.key, t] as const));
    for (const d of decisions) {
      const tpl = d.key ? decTpl.get(d.key) : undefined;
      if (!tpl) continue;
      await tx
        .update(schema.decisions)
        .set({ dueOffsetDays: compressOffset(tpl.offsetDays, { daysLeft }) })
        .where(eq(schema.decisions.id, d.id));
    }
  });
}

function isNotDecided() {
  return ne(schema.decisions.status, "decided");
}
