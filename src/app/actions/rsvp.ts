"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/wedding-service";
import { textOrNull } from "@/lib/utils";

/* Public, unauthenticated endpoint: the secret token in the link is the only credential, and it only
 * unlocks the members of that single household. Everything is validated against what the DB says. */

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  return recent.length > MAX_PER_WINDOW;
}

const answerSchema = z.object({
  attending: z.enum(["yes", "no"], { error: "נא לסמן עבור כל אחד אם מגיעים" }),
  diet: z.enum(["regular", "vegetarian", "vegan", "gluten_free"]).catch("regular"),
});

export async function submitRsvpAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  if (!token || token.length > 64) return fail("הקישור לא תקף.");
  if (limited(token)) return fail("יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");

  const [household] = await db.select().from(schema.households).where(eq(schema.households.rsvpToken, token)).limit(1);
  if (!household) return fail("הקישור לא תקף.");

  const members = await db.select().from(schema.guests).where(eq(schema.guests.householdId, household.id));
  if (!members.length) return fail("אין אורחים במשק הבית הזה.");

  const updates: { id: string; attending: "yes" | "no"; diet: "regular" | "vegetarian" | "vegan" | "gluten_free"; allergies: string | null }[] = [];
  for (const m of members) {
    const parsed = answerSchema.safeParse({ attending: fd.get(`attending_${m.id}`), diet: fd.get(`diet_${m.id}`) });
    if (!parsed.success) return fail(`נא לסמן אם ${m.name} מגיע/ה.`);
    updates.push({
      id: m.id,
      attending: parsed.data.attending,
      diet: parsed.data.attending === "yes" ? parsed.data.diet : "regular",
      allergies: parsed.data.attending === "yes" ? textOrNull(fd.get(`allergies_${m.id}`), 200) : null,
    });
  }

  await db.transaction(async (tx) => {
    for (const u of updates) {
      await tx.update(schema.guests).set({ attending: u.attending, diet: u.diet, allergies: u.allergies }).where(eq(schema.guests.id, u.id));
    }
    await tx
      .update(schema.households)
      .set({ respondedAt: new Date(), rsvpMessage: textOrNull(fd.get("message"), 500), invitedAt: household.invitedAt ?? new Date() })
      .where(eq(schema.households.id, household.id));
    const yes = updates.filter((u) => u.attending === "yes").length;
    const no = updates.length - yes;
    await logActivity(
      household.weddingId,
      {
        kind: "rsvp",
        text: yes ? `${household.name}: ${yes} מגיעים${no ? `, ${no} לא` : ""}` : `${household.name}: לא מגיעים`,
        href: `/guests/${household.id}`,
      },
      tx,
    );
  });

  revalidatePath("/guests", "layout");
  revalidatePath("/home");
  const anyYes = updates.some((u) => u.attending === "yes");
  return ok(anyYes ? "תודה! התשובה נשמרה, ומחכים לראות אתכם." : "תודה שעדכנתם. נתגעגע.");
}
