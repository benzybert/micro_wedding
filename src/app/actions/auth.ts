"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { fail, type ActionState } from "@/lib/action-state";
import { safeNext } from "@/lib/safe-next";

function authMessage(err: unknown): string {
  if (err instanceof APIError) {
    const code = (err.body as { code?: string } | undefined)?.code ?? "";
    if (code.includes("USER_ALREADY_EXISTS")) return "כבר קיים חשבון עם האימייל הזה. נסו להתחבר.";
    if (code.includes("INVALID_EMAIL_OR_PASSWORD") || code.includes("INVALID_PASSWORD")) return "אימייל או סיסמה שגויים.";
    if (code.includes("PASSWORD_TOO_SHORT")) return "הסיסמה קצרה מדי (לפחות 8 תווים).";
    if (err.status === 429 || String(err.statusCode) === "429") return "יותר מדי ניסיונות. נסו שוב בעוד דקה.";
  }
  return "משהו השתבש. נסו שוב.";
}

const signUpSchema = z.object({
  name: z.string().trim().min(1, "איך קוראים לך?").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("כתובת האימייל לא תקינה")),
  password: z.string().min(8, "הסיסמה צריכה להיות באורך 8 תווים לפחות").max(128),
});

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  try {
    await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
  } catch (err) {
    return fail(authMessage(err));
  }
  redirect(safeNext(formData.get("next"), "/onboarding"));
}

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("כתובת האימייל לא תקינה")),
  password: z.string().min(1, "חסרה סיסמה").max(128),
});

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "פרטים לא תקינים");

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (err) {
    return fail(authMessage(err));
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
