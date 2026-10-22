import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/* Read helpers. Every one is scoped by weddingId; callers get it from requireWorkspace(). */

export async function getGuestData(weddingId: string) {
  const [households, guests, tables] = await Promise.all([
    db.select().from(schema.households).where(eq(schema.households.weddingId, weddingId)).orderBy(asc(schema.households.createdAt)),
    db.select().from(schema.guests).where(eq(schema.guests.weddingId, weddingId)).orderBy(asc(schema.guests.createdAt)),
    db.select().from(schema.seatingTables).where(eq(schema.seatingTables.weddingId, weddingId)).orderBy(asc(schema.seatingTables.sortOrder), asc(schema.seatingTables.createdAt)),
  ]);
  return { households, guests, tables };
}

export function getTasks(weddingId: string) {
  return db.select().from(schema.tasks).where(eq(schema.tasks.weddingId, weddingId)).orderBy(asc(schema.tasks.sortOrder), asc(schema.tasks.createdAt));
}

export function getDecisions(weddingId: string) {
  return db.select().from(schema.decisions).where(eq(schema.decisions.weddingId, weddingId)).orderBy(asc(schema.decisions.sortOrder), asc(schema.decisions.createdAt));
}

export function getBudgetItems(weddingId: string) {
  return db.select().from(schema.budgetItems).where(eq(schema.budgetItems.weddingId, weddingId)).orderBy(asc(schema.budgetItems.createdAt));
}

export function getVendors(weddingId: string) {
  return db.select().from(schema.vendors).where(eq(schema.vendors.weddingId, weddingId)).orderBy(asc(schema.vendors.category), asc(schema.vendors.createdAt));
}

export function getRecentActivity(weddingId: string, limit = 8) {
  return db.select().from(schema.activity).where(eq(schema.activity.weddingId, weddingId)).orderBy(desc(schema.activity.createdAt)).limit(limit);
}

export function getTimeline(weddingId: string) {
  return db.select().from(schema.timelineItems).where(eq(schema.timelineItems.weddingId, weddingId)).orderBy(asc(schema.timelineItems.startTime));
}

export async function getDecisionBundle(weddingId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [decision] = await db
    .select()
    .from(schema.decisions)
    .where(and(eq(schema.decisions.id, id), eq(schema.decisions.weddingId, weddingId)))
    .limit(1);
  if (!decision) return null;
  const [options, criteria, scores, comments] = await Promise.all([
    db.select().from(schema.decisionOptions).where(eq(schema.decisionOptions.decisionId, id)).orderBy(asc(schema.decisionOptions.sortOrder), asc(schema.decisionOptions.createdAt)),
    db.select().from(schema.decisionCriteria).where(eq(schema.decisionCriteria.decisionId, id)).orderBy(asc(schema.decisionCriteria.sortOrder)),
    db
      .select({ optionId: schema.decisionScores.optionId, criterionId: schema.decisionScores.criterionId, userId: schema.decisionScores.userId, score: schema.decisionScores.score })
      .from(schema.decisionScores)
      .innerJoin(schema.decisionOptions, eq(schema.decisionOptions.id, schema.decisionScores.optionId))
      .where(eq(schema.decisionOptions.decisionId, id)),
    db
      .select({ id: schema.decisionComments.id, userId: schema.decisionComments.userId, body: schema.decisionComments.body, createdAt: schema.decisionComments.createdAt, author: schema.user.name })
      .from(schema.decisionComments)
      .innerJoin(schema.user, eq(schema.user.id, schema.decisionComments.userId))
      .where(eq(schema.decisionComments.decisionId, id))
      .orderBy(asc(schema.decisionComments.createdAt)),
  ]);
  return { decision, options, criteria, scores, comments };
}

/** Options, criteria and scores for every decision of a wedding (to show the current leader in the list). */
export async function getAllDecisionScoring(weddingId: string) {
  const [options, criteria, scores] = await Promise.all([
    db.select().from(schema.decisionOptions).where(eq(schema.decisionOptions.weddingId, weddingId)),
    db.select().from(schema.decisionCriteria).where(eq(schema.decisionCriteria.weddingId, weddingId)),
    db
      .select({ optionId: schema.decisionScores.optionId, criterionId: schema.decisionScores.criterionId, userId: schema.decisionScores.userId, score: schema.decisionScores.score })
      .from(schema.decisionScores)
      .innerJoin(schema.decisionOptions, eq(schema.decisionOptions.id, schema.decisionScores.optionId))
      .where(eq(schema.decisionOptions.weddingId, weddingId)),
  ]);
  return { options, criteria, scores };
}
