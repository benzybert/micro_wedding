import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { setupTestDb, teardownTestDb } from "@/test/db";

describe("schema + migrations (PGlite)", () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });

  it("creates a wedding with a household and cascades on delete", async () => {
    const [w] = await db
      .insert(schema.weddings)
      .values({ partnerAName: "נועה", partnerBName: "דן" })
      .returning();
    expect(w!.guestCap).toBe(40);
    expect(w!.calendarCustom).toBe("ashkenaz");

    const [h] = await db
      .insert(schema.households)
      .values({ weddingId: w!.id, name: "משפחת כהן", rsvpToken: "tok_test_1" })
      .returning();
    await db.insert(schema.guests).values([
      { weddingId: w!.id, householdId: h!.id, name: "דנה כהן" },
      { weddingId: w!.id, householdId: h!.id, name: "יוסי כהן", isChild: true },
    ]);

    expect((await db.select().from(schema.guests).where(eq(schema.guests.householdId, h!.id))).length).toBe(2);

    await db.delete(schema.weddings).where(eq(schema.weddings.id, w!.id));
    expect((await db.select().from(schema.guests)).length).toBe(0);
    expect((await db.select().from(schema.households)).length).toBe(0);
  });

  it("enforces one template task per wedding but allows many custom tasks", async () => {
    const [w] = await db.insert(schema.weddings).values({ partnerAName: "א", partnerBName: "ב" }).returning();
    await db.insert(schema.tasks).values({ weddingId: w!.id, title: "x", templateKey: "rabbinate-file" });
    await expect(
      db.insert(schema.tasks).values({ weddingId: w!.id, title: "y", templateKey: "rabbinate-file" }),
    ).rejects.toThrow();
    await db.insert(schema.tasks).values([
      { weddingId: w!.id, title: "custom 1" },
      { weddingId: w!.id, title: "custom 2" },
    ]);
    expect((await db.select().from(schema.tasks).where(eq(schema.tasks.weddingId, w!.id))).length).toBe(3);
  });
});
