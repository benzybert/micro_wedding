"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { CITIES } from "@/data/cities";
import { isValidIsoDate } from "@/lib/format";
import { getContext, requireWorkspace, WHO_COOKIE } from "@/lib/session";
import { createWedding, deleteWedding, ensureTemplates, rescheduleTemplates, syncMemberNames } from "@/lib/wedding-service";
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

/** One-time setup: only possible while the site has no wedding yet. */
export async function createWeddingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (await getContext()) redirect("/");

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  await createWedding(parsed.data);
  redirect("/who");
}

/** "אני בן / אני יערה": remembers who is looking, in a cookie. Not a login. */
export async function chooseWhoAction(formData: FormData) {
  const who = formData.get("who");
  if (who !== "a" && who !== "b") return;
  if (!(await getContext())) redirect("/onboarding");
  (await cookies()).set(WHO_COOKIE, who, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
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

  await syncMemberNames(ws.wedding.id, { a: d.partnerAName, b: d.partnerBName });
  if (d.ceremonyTrack !== ws.wedding.ceremonyTrack) await ensureTemplates(db, ws.wedding.id, d.ceremonyTrack, d.weddingDate);
  if (d.weddingDate !== ws.wedding.weddingDate) await rescheduleTemplates(ws.wedding.id, d.weddingDate);

  for (const p of ["/home", "/settings", "/guests", "/date", "/tasks", "/decisions", "/timeline", "/budget"]) revalidatePath(p);
  return ok("נשמר");
}

/** Irreversible: deletes the wedding and, by cascade, every guest, decision, budget line … Typed confirmation required. */
export async function deleteWeddingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  if (String(formData.get("confirm") ?? "").trim() !== "מחיקה") return fail('כדי לאשר, כתבו "מחיקה".');
  await deleteWedding(ws.wedding.id);
  redirect("/onboarding");
}
