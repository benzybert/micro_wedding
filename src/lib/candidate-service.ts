import { and, count, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Side, Tier } from "@/db/schema";
import { formatPhone } from "@/lib/phone";
import { newToken } from "@/lib/token";
import { phoneSet, type Candidate } from "@/lib/whatsapp-candidates";

/* DB side of "pull guests from WhatsApp": stage candidates, then turn each yes into a household + guest. */

/** Shown in the guest list so the people who came from WhatsApp are easy to find as a batch. */
export const WHATSAPP_GROUP_LABEL = "וואטסאפ";

export type StageResult = { added: number; alreadyGuests: number; alreadyStaged: number };

/** Adds new people to the approval list. Skips phones that are already guests or already staged (pending or rejected). */
export async function stageCandidates(weddingId: string, candidates: readonly Candidate[]): Promise<StageResult> {
  const [households, staged] = await Promise.all([
    db.select({ phone: schema.households.phone }).from(schema.households).where(eq(schema.households.weddingId, weddingId)),
    db.select({ phone: schema.guestCandidates.phone }).from(schema.guestCandidates).where(eq(schema.guestCandidates.weddingId, weddingId)),
  ]);
  const guestPhones = phoneSet(households.map((h) => h.phone));
  const stagedPhones = new Set(staged.map((s) => s.phone));

  const fresh: Candidate[] = [];
  let alreadyGuests = 0;
  let alreadyStaged = 0;
  for (const c of candidates) {
    if (guestPhones.has(c.phone)) alreadyGuests += 1;
    else if (stagedPhones.has(c.phone)) alreadyStaged += 1;
    else fresh.push(c);
  }

  const inserted = fresh.length
    ? await db
        .insert(schema.guestCandidates)
        .values(fresh.map((c) => ({ weddingId, name: c.name, phone: c.phone, lastContactAt: c.lastContactAt })))
        .onConflictDoNothing()
        .returning({ id: schema.guestCandidates.id })
    : [];
  // A concurrent upload can win the unique index between our read and insert.
  return { added: inserted.length, alreadyGuests, alreadyStaged: alreadyStaged + (fresh.length - inserted.length) };
}

export type Decision = { id: string; decision: "approve" | "reject" };
export type DecideResult = { approved: number; rejected: number; alreadyGuests: number; pendingLeft: number };

/**
 * Applies yes/no decisions. Approved people become a household with one guest (the whole person is
 * deleted from the approval list); rejected people stay marked so they are not offered again.
 * Ids that are not pending in this wedding are ignored.
 */
export async function decideCandidates(weddingId: string, decisions: readonly Decision[], opts: { side: Side; tier: Tier }): Promise<DecideResult> {
  const latest = new Map(decisions.map((d) => [d.id, d.decision] as const));
  const ids = [...latest.keys()];

  return db.transaction(async (tx) => {
    const rows = ids.length
      ? await tx
          .select()
          .from(schema.guestCandidates)
          .where(and(eq(schema.guestCandidates.weddingId, weddingId), inArray(schema.guestCandidates.id, ids), eq(schema.guestCandidates.status, "pending")))
      : [];
    const existing = await tx.select({ phone: schema.households.phone }).from(schema.households).where(eq(schema.households.weddingId, weddingId));
    const known = phoneSet(existing.map((h) => h.phone));

    const create: typeof rows = [];
    const consumed: string[] = [];
    const rejected: string[] = [];
    let alreadyGuests = 0;
    for (const row of rows) {
      if (latest.get(row.id) === "reject") {
        rejected.push(row.id);
        continue;
      }
      consumed.push(row.id);
      if (known.has(row.phone)) alreadyGuests += 1;
      else {
        known.add(row.phone);
        create.push(row);
      }
    }

    if (create.length) {
      const tokens = create.map(() => newToken());
      const households = await tx
        .insert(schema.households)
        .values(
          create.map((c, i) => ({
            weddingId,
            name: c.name,
            side: opts.side,
            tier: opts.tier,
            groupLabel: WHATSAPP_GROUP_LABEL,
            phone: formatPhone(c.phone),
            rsvpToken: tokens[i]!,
          })),
        )
        .returning({ id: schema.households.id, rsvpToken: schema.households.rsvpToken });
      const idByToken = new Map(households.map((h) => [h.rsvpToken, h.id] as const));
      await tx.insert(schema.guests).values(create.map((c, i) => ({ weddingId, householdId: idByToken.get(tokens[i]!)!, name: c.name })));
    }
    if (consumed.length) {
      await tx.delete(schema.guestCandidates).where(and(eq(schema.guestCandidates.weddingId, weddingId), inArray(schema.guestCandidates.id, consumed)));
    }
    if (rejected.length) {
      await tx
        .update(schema.guestCandidates)
        .set({ status: "rejected" })
        .where(and(eq(schema.guestCandidates.weddingId, weddingId), inArray(schema.guestCandidates.id, rejected)));
    }

    const [left] = await tx
      .select({ n: count() })
      .from(schema.guestCandidates)
      .where(and(eq(schema.guestCandidates.weddingId, weddingId), eq(schema.guestCandidates.status, "pending")));
    return { approved: create.length, rejected: rejected.length, alreadyGuests, pendingLeft: left?.n ?? 0 };
  });
}

/** "rejected": forget the people who were turned down (they may be offered again). "all": empty the approval list. */
export async function clearCandidates(weddingId: string, scope: "rejected" | "all"): Promise<number> {
  const where =
    scope === "rejected"
      ? and(eq(schema.guestCandidates.weddingId, weddingId), eq(schema.guestCandidates.status, "rejected"))
      : eq(schema.guestCandidates.weddingId, weddingId);
  const deleted = await db.delete(schema.guestCandidates).where(where).returning({ id: schema.guestCandidates.id });
  return deleted.length;
}
