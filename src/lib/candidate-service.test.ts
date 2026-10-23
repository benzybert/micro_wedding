import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { setupTestDb, teardownTestDb } from "@/test/db";
import { WHATSAPP_GROUP_LABEL, clearCandidates, decideCandidates, stageCandidates } from "./candidate-service";
import type { Candidate } from "./whatsapp-candidates";

const cand = (name: string, phone: string, at = "2026-09-01T00:00:00Z"): Candidate => ({ name, phone, lastContactAt: new Date(at) });

async function makeWedding() {
  const [w] = await db.insert(schema.weddings).values({ partnerAName: "נועה", partnerBName: "דן" }).returning();
  return w!.id;
}
const rowsOf = (weddingId: string) => db.select().from(schema.guestCandidates).where(eq(schema.guestCandidates.weddingId, weddingId));

describe("candidate service (PGlite)", () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  afterAll(async () => {
    await teardownTestDb();
  });

  it("stages new people and skips phones that are already guests, whatever the stored format", async () => {
    const w = await makeWedding();
    await db.insert(schema.households).values({ weddingId: w, name: "משפחת כהן", phone: "050-123-4567", rsvpToken: "tok_stage_1" });

    const r = await stageCandidates(w, [cand("דנה כהן", "972501234567"), cand("יוסי", "972502222222"), cand("מיכל", "972503333333")]);
    expect(r).toEqual({ added: 2, alreadyGuests: 1, alreadyStaged: 0 });
    expect((await rowsOf(w)).map((c) => c.name).sort()).toEqual(["יוסי", "מיכל"].sort());
  });

  it("is idempotent: staging the same file again adds nothing", async () => {
    const w = await makeWedding();
    const people = [cand("א", "972501111111"), cand("ב", "972502222222")];
    expect((await stageCandidates(w, people)).added).toBe(2);
    expect(await stageCandidates(w, people)).toEqual({ added: 0, alreadyGuests: 0, alreadyStaged: 2 });
    expect(await rowsOf(w)).toHaveLength(2);
  });

  it("keeps the same phone separate per wedding", async () => {
    const [a, b] = [await makeWedding(), await makeWedding()];
    expect((await stageCandidates(a, [cand("דנה", "972501234567")])).added).toBe(1);
    expect((await stageCandidates(b, [cand("דנה", "972501234567")])).added).toBe(1);
  });

  it("approve → household + one guest, labelled and tiered; the candidate row is gone", async () => {
    const w = await makeWedding();
    await stageCandidates(w, [cand("דנה כהן", "972501234567")]);
    const [c] = await rowsOf(w);

    const r = await decideCandidates(w, [{ id: c!.id, decision: "approve" }], { side: "a", tier: "must" });
    expect(r).toEqual({ approved: 1, rejected: 0, alreadyGuests: 0, pendingLeft: 0 });
    expect(await rowsOf(w)).toHaveLength(0);

    const [h] = await db.select().from(schema.households).where(eq(schema.households.weddingId, w));
    expect(h).toMatchObject({ name: "דנה כהן", side: "a", tier: "must", groupLabel: WHATSAPP_GROUP_LABEL, phone: "050-123-4567" });
    expect(h!.rsvpToken.length).toBeGreaterThanOrEqual(20);
    const g = await db.select().from(schema.guests).where(eq(schema.guests.householdId, h!.id));
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ name: "דנה כהן", weddingId: w, attending: "pending", isChild: false });
  });

  it("gives every approved person their own household and a distinct RSVP token", async () => {
    const w = await makeWedding();
    await stageCandidates(w, [cand("א", "972501111111"), cand("ב", "972502222222"), cand("ג", "972503333333")]);
    const rows = await rowsOf(w);
    await decideCandidates(w, rows.map((c) => ({ id: c.id, decision: "approve" as const })), { side: "both", tier: "want" });

    const households = await db.select().from(schema.households).where(eq(schema.households.weddingId, w));
    expect(households.map((h) => h.name).sort()).toEqual(["א", "ב", "ג"]);
    expect(new Set(households.map((h) => h.rsvpToken)).size).toBe(3);
    // each guest points at the household with the same name (token → id mapping did not cross wires)
    for (const h of households) {
      const [g] = await db.select().from(schema.guests).where(eq(schema.guests.householdId, h.id));
      expect(g!.name).toBe(h.name);
    }
  });

  it("reject keeps the row as rejected, so re-uploading does not offer the person again", async () => {
    const w = await makeWedding();
    await stageCandidates(w, [cand("שליח", "972501111111"), cand("חבר", "972502222222")]);
    const rows = await rowsOf(w);
    const courier = rows.find((c) => c.name === "שליח")!;

    const r = await decideCandidates(w, [{ id: courier.id, decision: "reject" }], { side: "both", tier: "want" });
    expect(r).toEqual({ approved: 0, rejected: 1, alreadyGuests: 0, pendingLeft: 1 });
    expect(await db.select().from(schema.households).where(eq(schema.households.weddingId, w))).toHaveLength(0);

    expect(await stageCandidates(w, [cand("שליח", "972501111111")])).toEqual({ added: 0, alreadyGuests: 0, alreadyStaged: 1 });
    const pending = await db.select().from(schema.guestCandidates).where(and(eq(schema.guestCandidates.weddingId, w), eq(schema.guestCandidates.status, "pending")));
    expect(pending.map((c) => c.name)).toEqual(["חבר"]);
  });

  it("leaves undecided people pending and reports how many are left", async () => {
    const w = await makeWedding();
    await stageCandidates(w, [cand("א", "972501111111"), cand("ב", "972502222222"), cand("ג", "972503333333")]);
    const rows = await rowsOf(w);
    const r = await decideCandidates(w, [{ id: rows[0]!.id, decision: "approve" }], { side: "both", tier: "maybe" });
    expect(r.pendingLeft).toBe(2);
  });

  it("never touches another wedding's candidates, even with a valid id", async () => {
    const [mine, theirs] = [await makeWedding(), await makeWedding()];
    await stageCandidates(theirs, [cand("זר", "972509999999")]);
    const [stranger] = await rowsOf(theirs);

    const r = await decideCandidates(mine, [{ id: stranger!.id, decision: "approve" }], { side: "both", tier: "want" });
    expect(r).toEqual({ approved: 0, rejected: 0, alreadyGuests: 0, pendingLeft: 0 });
    expect(await rowsOf(theirs)).toHaveLength(1);
    expect(await db.select().from(schema.households).where(eq(schema.households.weddingId, mine))).toHaveLength(0);
  });

  it("ignores ids that are not candidates and a second decision for an already-decided one", async () => {
    const w = await makeWedding();
    await stageCandidates(w, [cand("א", "972501111111")]);
    const [c] = await rowsOf(w);
    const missing = "00000000-0000-4000-8000-000000000000";

    await decideCandidates(w, [{ id: c!.id, decision: "approve" }, { id: missing, decision: "approve" }], { side: "both", tier: "want" });
    const again = await decideCandidates(w, [{ id: c!.id, decision: "approve" }], { side: "both", tier: "want" });
    expect(again.approved).toBe(0);
    expect(await db.select().from(schema.households).where(eq(schema.households.weddingId, w))).toHaveLength(1);
  });

  it("does not create a second household when the phone became a guest after staging", async () => {
    const w = await makeWedding();
    await stageCandidates(w, [cand("דנה", "972501234567")]);
    const [c] = await rowsOf(w);
    await db.insert(schema.households).values({ weddingId: w, name: "דנה (ידני)", phone: "0501234567", rsvpToken: "tok_race_1" });

    const r = await decideCandidates(w, [{ id: c!.id, decision: "approve" }], { side: "both", tier: "want" });
    expect(r).toMatchObject({ approved: 0, alreadyGuests: 1, pendingLeft: 0 });
    expect(await db.select().from(schema.households).where(eq(schema.households.weddingId, w))).toHaveLength(1);
    expect(await rowsOf(w)).toHaveLength(0);
  });

  it("the last decision wins when the same id is sent twice", async () => {
    const w = await makeWedding();
    await stageCandidates(w, [cand("א", "972501111111")]);
    const [c] = await rowsOf(w);
    const r = await decideCandidates(
      w,
      [
        { id: c!.id, decision: "approve" },
        { id: c!.id, decision: "reject" },
      ],
      { side: "both", tier: "want" },
    );
    expect(r).toMatchObject({ approved: 0, rejected: 1 });
  });

  it("clear: 'rejected' keeps pending people; 'all' empties the list; both stay inside the wedding", async () => {
    const [w, other] = [await makeWedding(), await makeWedding()];
    await stageCandidates(w, [cand("א", "972501111111"), cand("ב", "972502222222")]);
    await stageCandidates(other, [cand("זר", "972509999999")]);
    const rows = await rowsOf(w);
    await decideCandidates(w, [{ id: rows.find((c) => c.name === "א")!.id, decision: "reject" }], { side: "both", tier: "want" });

    expect(await clearCandidates(w, "rejected")).toBe(1);
    expect((await rowsOf(w)).map((c) => c.name)).toEqual(["ב"]);
    expect(await clearCandidates(w, "all")).toBe(1);
    expect(await rowsOf(w)).toHaveLength(0);
    expect(await rowsOf(other)).toHaveLength(1);
  });

  it("deleting the wedding removes its candidates", async () => {
    const w = await makeWedding();
    await stageCandidates(w, [cand("א", "972501111111")]);
    await db.delete(schema.weddings).where(eq(schema.weddings.id, w));
    expect(await rowsOf(w)).toHaveLength(0);
  });
});
