import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decisionTemplatesForTrack } from "@/data/decision-templates";
import { templatesForTrack } from "@/data/task-templates";
import { addDays, todayIso } from "@/lib/format";
import { setupTestDb, teardownTestDb } from "@/test/db";
import { createWedding, ensureTemplates, rescheduleTemplates } from "./wedding-service";

let n = 0;
async function makeUser() {
  const id = `u${++n}`;
  await db.insert(schema.user).values({ id, name: "נועה", email: `${id}@example.com` });
  return id;
}

const base = { partnerAName: "נועה", partnerBName: "דן", guestCap: 40, calendarCustom: "ashkenaz" as const, city: "Tel Aviv" };

describe("wedding service (PGlite)", () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });

  it("creates the workspace, makes the creator owner/partner A and seeds tasks, decisions, criteria and options", async () => {
    const userId = await makeUser();
    const id = await createWedding({ ...base, userId, weddingDate: null, ceremonyTrack: "rabbinate" });

    const [member] = await db.select().from(schema.weddingMembers).where(eq(schema.weddingMembers.weddingId, id));
    expect(member).toMatchObject({ userId, role: "owner", partner: "a" });

    const tasks = await db.select().from(schema.tasks).where(eq(schema.tasks.weddingId, id));
    expect(tasks).toHaveLength(templatesForTrack("rabbinate").length);
    expect(tasks.find((t) => t.templateKey === "open-marriage-file")?.hardDeadline).toBe(true);

    const decisions = await db.select().from(schema.decisions).where(eq(schema.decisions.weddingId, id));
    expect(decisions).toHaveLength(decisionTemplatesForTrack("rabbinate").length);
    const criteria = await db.select().from(schema.decisionCriteria).where(eq(schema.decisionCriteria.weddingId, id));
    expect(criteria.length).toBeGreaterThanOrEqual(decisions.length * 3);
    const track = decisions.find((d) => d.templateKey === "ceremony-track")!;
    const options = await db.select().from(schema.decisionOptions).where(eq(schema.decisionOptions.decisionId, track.id));
    expect(options.length).toBe(5);
  });

  it("is idempotent and never overwrites edits; switching track only adds what is missing", async () => {
    const userId = await makeUser();
    const id = await createWedding({ ...base, userId, weddingDate: null, ceremonyTrack: "rabbinate" });
    const count = async () => (await db.select().from(schema.tasks).where(eq(schema.tasks.weddingId, id))).length;
    const before = await count();

    await db.update(schema.tasks).set({ title: "הכותרת שלי" }).where(and(eq(schema.tasks.weddingId, id), eq(schema.tasks.templateKey, "budget")));
    await ensureTemplates(db, id, "rabbinate", null);
    expect(await count()).toBe(before);
    const [edited] = await db.select().from(schema.tasks).where(and(eq(schema.tasks.weddingId, id), eq(schema.tasks.templateKey, "budget")));
    expect(edited?.title).toBe("הכותרת שלי");

    await ensureTemplates(db, id, "civil_abroad", null);
    const keys = (await db.select({ k: schema.tasks.templateKey }).from(schema.tasks).where(eq(schema.tasks.weddingId, id))).map((r) => r.k);
    expect(keys).toContain("civil-register");
    expect(keys).toContain("open-marriage-file"); // the religious tasks are not removed
  });

  it("compresses long-horizon offsets for a close wedding but keeps the rabbinate deadline honest", async () => {
    const userId = await makeUser();
    const today = todayIso();
    const id = await createWedding({ ...base, userId, weddingDate: addDays(today, 100), ceremonyTrack: "rabbinate" });
    const tasks = await db.select().from(schema.tasks).where(eq(schema.tasks.weddingId, id));

    const soft = tasks.filter((t) => !t.hardDeadline && (t.dueOffsetDays ?? 0) > 30);
    expect(soft.every((t) => (t.dueOffsetDays ?? 0) <= 97)).toBe(true); // nothing scheduled before today
    const file = tasks.find((t) => t.templateKey === "open-marriage-file")!;
    expect(file.dueOffsetDays).toBe(75); // 100 days left: nominal, still ≥ 45
    const acum = tasks.find((t) => t.templateKey === "acum")!;
    expect(acum.dueOffsetDays).toBe(7);
  });

  it("reschedules open template items when the date moves, leaving done tasks and explicit dates alone", async () => {
    const userId = await makeUser();
    const today = todayIso();
    const id = await createWedding({ ...base, userId, weddingDate: addDays(today, 400), ceremonyTrack: "rabbinate" });
    const get = async (key: string) => (await db.select().from(schema.tasks).where(and(eq(schema.tasks.weddingId, id), eq(schema.tasks.templateKey, key))))[0]!;

    expect((await get("venue")).dueOffsetDays).toBe(160);
    await db.update(schema.tasks).set({ done: true }).where(and(eq(schema.tasks.weddingId, id), eq(schema.tasks.templateKey, "budget")));
    await db.update(schema.tasks).set({ dueDate: "2027-01-01" }).where(and(eq(schema.tasks.weddingId, id), eq(schema.tasks.templateKey, "pick-date")));

    await rescheduleTemplates(id, addDays(today, 70));
    expect((await get("venue")).dueOffsetDays).toBeLessThan(160);
    expect((await get("venue")).dueOffsetDays).toBeLessThanOrEqual(67);
    expect((await get("budget")).dueOffsetDays).toBe(180); // done → untouched
    expect((await get("pick-date")).dueDate).toBe("2027-01-01"); // explicit date preserved

    await rescheduleTemplates(id, addDays(today, 400));
    expect((await get("venue")).dueOffsetDays).toBe(160); // relaxed again
  });
});
