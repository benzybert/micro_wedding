import "server-only";
import { asc, desc, eq } from "drizzle-orm";
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
