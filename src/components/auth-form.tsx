"use client";

import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { TextField } from "@/components/ui/field";
import { signInAction, signUpAction } from "@/app/actions/auth";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const isSignup = mode === "signup";
  return (
    <ActionForm action={isSignup ? signUpAction : signInAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {isSignup ? <TextField label="השם שלך" name="name" autoComplete="name" required maxLength={80} /> : null}
      <TextField label="אימייל" name="email" type="email" autoComplete="email" required />
      <TextField
        label="סיסמה"
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        required
        minLength={isSignup ? 8 : undefined}
        hint={isSignup ? "לפחות 8 תווים" : undefined}
      />
      <SubmitButton size="lg" pendingLabel={isSignup ? "יוצרים חשבון…" : "מתחברים…"}>
        {isSignup ? "יצירת חשבון" : "התחברות"}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        {isSignup ? (
          <>
            כבר יש חשבון?{" "}
            <Link className="font-medium text-brand-ink underline underline-offset-4" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>
              התחברות
            </Link>
          </>
        ) : (
          <>
            עדיין אין חשבון?{" "}
            <Link className="font-medium text-brand-ink underline underline-offset-4" href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>
              הרשמה
            </Link>
          </>
        )}
      </p>
    </ActionForm>
  );
}
