import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getWorkspace } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Everything stored about this wedding, as one JSON file (data portability). */
export async function GET() {
  const ws = await getWorkspace();
  if (!ws) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const id = ws.wedding.id;
  const where = <T extends { weddingId: Parameters<typeof eq>[0] }>(t: T) => eq(t.weddingId, id);

  const [households, guests, tables, decisions, options, criteria, comments, budget, vendors, tasks, timeline, candidates, activity] = await Promise.all([
    db.select().from(schema.households).where(where(schema.households)),
    db.select().from(schema.guests).where(where(schema.guests)),
    db.select().from(schema.seatingTables).where(where(schema.seatingTables)),
    db.select().from(schema.decisions).where(where(schema.decisions)),
    db.select().from(schema.decisionOptions).where(where(schema.decisionOptions)),
    db.select().from(schema.decisionCriteria).where(where(schema.decisionCriteria)),
    db
      .select({ decisionId: schema.decisionComments.decisionId, userId: schema.decisionComments.userId, body: schema.decisionComments.body, createdAt: schema.decisionComments.createdAt })
      .from(schema.decisionComments)
      .innerJoin(schema.decisions, eq(schema.decisions.id, schema.decisionComments.decisionId))
      .where(eq(schema.decisions.weddingId, id)),
    db.select().from(schema.budgetItems).where(where(schema.budgetItems)),
    db.select().from(schema.vendors).where(where(schema.vendors)),
    db.select().from(schema.tasks).where(where(schema.tasks)),
    db.select().from(schema.timelineItems).where(where(schema.timelineItems)),
    db.select().from(schema.dateCandidates).where(where(schema.dateCandidates)),
    db.select().from(schema.activity).where(where(schema.activity)),
  ]);
  const scores = await db
    .select({ optionId: schema.decisionScores.optionId, criterionId: schema.decisionScores.criterionId, userId: schema.decisionScores.userId, score: schema.decisionScores.score })
    .from(schema.decisionScores)
    .innerJoin(schema.decisionOptions, eq(schema.decisionOptions.id, schema.decisionScores.optionId))
    .where(eq(schema.decisionOptions.weddingId, id));

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      wedding: ws.wedding,
      members: ws.members.map((m) => ({ name: m.name, email: m.email, role: m.role })),
      households,
      guests,
      seatingTables: tables,
      decisions: { decisions, options, criteria, scores, comments },
      budgetItems: budget,
      vendors,
      tasks,
      timelineItems: timeline,
      dateCandidates: candidates,
      activity,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wedding-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
