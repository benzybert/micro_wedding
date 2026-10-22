"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { CITIES } from "@/data/cities";
import { isValidIsoDate } from "@/lib/format";
import { newToken, sha256 } from "@/lib/token";
import { requireUser, requireWorkspace, getWorkspace } from "@/lib/session";
import { createWedding, ensureTemplates, logActivity, rescheduleTemplates } from "@/lib/wedding-service";
import { textOrNull } from "@/lib/utils";

const cityKeys = CITIES.map((c) => c.key);

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || isValidIsoDate(v), "תאריך לא תקין")
  .nullable();

const onboardingSchema = z.object({
  partnerAName: z.string().trim().min(1, "איך קוראים לך?").max(60),
  partnerBName: z.string().trim().min(1, "איך קוראים לבן/בת הזוג?").max(60),
  weddingDate: optionalDate,
  guestCap: z.coerce.number().int("מספר שלם בבקשה").min(2, "לפחות 2").max(300, "עד 300 אורחים"),
  calendarCustom: z.enum(["ashkenaz", "sepharad"]),
  ceremonyTrack: z.enum(["rabbinate", "private_rabbi", "civil_abroad", "other"]),
  city: z.enum(cityKeys as [string, ...string[]]),
});

export async function createWeddingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (await getWorkspace()) redirect("/home");

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  await createWedding({ userId: user.id, ...parsed.data });
  redirect("/home");
}

const settingsSchema = onboardingSchema.extend({
  budgetTotal: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(/[,\s₪]/g, ""))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 10_000_000), "תקציב לא תקין")
    .nullable(),
});

export async function updateWeddingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");
  const d = parsed.data;

  await db
    .update(schema.weddings)
    .set({
      partnerAName: d.partnerAName,
      partnerBName: d.partnerBName,
      weddingDate: d.weddingDate,
      guestCap: d.guestCap,
      budgetTotal: d.budgetTotal,
      calendarCustom: d.calendarCustom,
      ceremonyTrack: d.ceremonyTrack,
      city: d.city,
      venueName: textOrNull(formData.get("venueName"), 120),
      venueAddress: textOrNull(formData.get("venueAddress"), 200),
      startTime: /^\d{2}:\d{2}$/.test(String(formData.get("startTime") ?? "")) ? String(formData.get("startTime")) : null,
      rsvpDeadline: isValidIsoDate(String(formData.get("rsvpDeadline") ?? "")) ? String(formData.get("rsvpDeadline")) : null,
      rsvpNote: textOrNull(formData.get("rsvpNote"), 600),
      invitationTemplate: textOrNull(formData.get("invitationTemplate"), 1200),
      reminderTemplate: textOrNull(formData.get("reminderTemplate"), 1200),
    })
    .where(eq(schema.weddings.id, ws.wedding.id));

  if (d.ceremonyTrack !== ws.wedding.ceremonyTrack) await ensureTemplates(db, ws.wedding.id, d.ceremonyTrack, d.weddingDate);
  if (d.weddingDate !== ws.wedding.weddingDate) await rescheduleTemplates(ws.wedding.id, d.weddingDate);

  for (const p of ["/home", "/settings", "/guests", "/date", "/tasks", "/decisions", "/timeline", "/budget"]) revalidatePath(p);
  return ok("נשמר");
}

/* ───────── partner invite ───────── */

const INVITE_DAYS = 7;

/** Returns the one-time join path (the plain token is never stored). */
export async function createInviteAction(): Promise<{ path?: string; error?: string }> {
  const ws = await requireWorkspace();
  if (ws.members.length >= 2) return { error: "כבר יש שני מתכננים בחתונה הזו." };
  const token = newToken();
  await db.insert(schema.weddingInvites).values({
    weddingId: ws.wedding.id,
    tokenHash: sha256(token),
    createdBy: ws.user.id,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
  });
  return { path: `/join/${token}` };
}

export async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  if (!token) return fail("ההזמנה לא תקפה.");
  if (await getWorkspace()) return fail("כבר יש לך חתונה בחשבון הזה.");

  const [invite] = await db
    .select()
    .from(schema.weddingInvites)
    .where(
      and(
        eq(schema.weddingInvites.tokenHash, sha256(token)),
        isNull(schema.weddingInvites.acceptedAt),
        gt(schema.weddingInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!invite) return fail("ההזמנה לא תקפה או שכבר נוצלה.");

  const members = await db.select().from(schema.weddingMembers).where(eq(schema.weddingMembers.weddingId, invite.weddingId));
  if (members.length >= 2) return fail("כבר יש שני מתכננים בחתונה הזו.");

  const takenPartner = members.map((m) => m.partner);
  const partner = takenPartner.includes("a") ? "b" : "a";

  await db.transaction(async (tx) => {
    await tx.insert(schema.weddingMembers).values({ weddingId: invite.weddingId, userId: user.id, role: "partner", partner });
    await tx
      .update(schema.weddingInvites)
      .set({ acceptedAt: new Date(), acceptedBy: user.id })
      .where(eq(schema.weddingInvites.id, invite.id));
    await logActivity(invite.weddingId, { actorUserId: user.id, kind: "partner_joined", text: `${user.name} הצטרף/ה לתכנון` }, tx);
  });
  redirect("/home");
}

/** Owner-only, irreversible: deletes the wedding and, by cascade, every guest, decision, budget line … */
export async function deleteWeddingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  if (ws.me.role !== "owner") return fail("רק מי שיצר/ה את החתונה יכול/ה למחוק אותה.");
  if (String(formData.get("confirm") ?? "").trim() !== "מחיקה") return fail('כדי לאשר, כתבו "מחיקה".');
  await db.delete(schema.weddings).where(eq(schema.weddings.id, ws.wedding.id));
  redirect("/onboarding");
}
