import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "הרשמה" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNext(next, "");
  if (await getSession()) redirect(target || "/home");
  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-semibold">מתחילים לתכנן</h1>
      <p className="mb-6 text-sm text-muted">חשבון אחד לכם, ובהמשך תזמינו את בן/בת הזוג להצטרף.</p>
      <AuthForm mode="signup" next={target || undefined} />
    </>
  );
}
