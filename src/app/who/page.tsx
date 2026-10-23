import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SITE } from "@/config/site";
import { chooseWhoAction } from "@/app/actions/wedding";
import { getContext } from "@/lib/session";

export const metadata: Metadata = { title: "מי אתם?" };
export const dynamic = "force-dynamic";

export default async function WhoPage() {
  const ctx = await getContext();
  if (!ctx) redirect("/onboarding");
  const { wedding } = ctx;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="mb-6 text-center font-display text-3xl font-semibold text-brand-ink">{SITE.name}</p>
      <main id="main" className="rounded-card border border-line bg-surface p-6 text-center shadow-sm sm:p-8">
        <h1 className="mb-1 font-display text-2xl font-semibold">מי מתכנן/ת עכשיו?</h1>
        <p className="mb-6 text-sm text-muted">אין סיסמה. הבחירה נזכרת במכשיר הזה, והיא קובעת של מי הציונים וההערות.</p>
        <form action={chooseWhoAction} className="grid gap-3">
          <button
            type="submit"
            name="who"
            value="a"
            className="min-h-14 rounded-xl bg-brand px-4 text-lg font-medium text-brand-fg shadow-sm hover:bg-brand-hover"
          >
            אני {wedding.partnerAName}
          </button>
          <button
            type="submit"
            name="who"
            value="b"
            className="min-h-14 rounded-xl border border-line bg-surface px-4 text-lg font-medium hover:bg-surface-2"
          >
            אני {wedding.partnerBName}
          </button>
        </form>
      </main>
    </div>
  );
}
