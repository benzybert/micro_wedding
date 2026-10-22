import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SITE } from "@/config/site";
import { WeddingForm } from "@/components/wedding-form";
import { createWeddingAction } from "@/app/actions/wedding";
import { getWorkspace, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "מתחילים" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getWorkspace()) redirect("/home");
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="mb-6 text-center font-display text-3xl font-semibold text-brand-ink">{SITE.name}</p>
      <main id="main" className="rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="mb-1 font-display text-2xl font-semibold">נעים להכיר, {user.name.split(" ")[0]}</h1>
        <p className="mb-6 text-muted">כמה פרטים כדי להתחיל. תוכלו לשנות הכל אחר כך בהגדרות.</p>
        <WeddingForm mode="onboarding" action={createWeddingAction} values={{ partnerAName: user.name.split(" ")[0] }} />
      </main>
    </div>
  );
}
