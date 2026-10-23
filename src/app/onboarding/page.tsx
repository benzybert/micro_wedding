import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SITE } from "@/config/site";
import { WeddingForm } from "@/components/wedding-form";
import { createWeddingAction } from "@/app/actions/wedding";
import { getContext } from "@/lib/session";

export const metadata: Metadata = { title: "הגדרה ראשונית" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // The site holds a single wedding; setup is only possible while it does not exist yet.
  if (await getContext()) redirect("/");
  const [a, b] = SITE.defaultPartners;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="mb-6 text-center font-display text-3xl font-semibold text-brand-ink">{SITE.name}</p>
      <main id="main" className="rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="mb-1 font-display text-2xl font-semibold">מתחילים</h1>
        <p className="mb-6 text-muted">כמה פרטים, פעם אחת. אפשר לשנות הכל אחר כך בהגדרות.</p>
        <WeddingForm mode="onboarding" action={createWeddingAction} values={{ partnerAName: a, partnerBName: b }} />
      </main>
    </div>
  );
}
