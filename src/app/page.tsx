import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MessageCircle, Scale, Users } from "lucide-react";
import { SITE } from "@/config/site";
import { buttonClass } from "@/components/ui/button";
import { getSession } from "@/lib/session";

const FEATURES = [
  {
    icon: Users,
    title: "אורחים בלי בלגן",
    text: "רשימה א׳, ב׳, ג׳ מול תקרת המקומות. כשמישהו מסרב, המערכת אומרת מי אפשר להזמין עכשיו. אישורי הגעה בקישור אישי בוואטסאפ.",
  },
  {
    icon: Scale,
    title: "החלטות שנסגרות",
    text: "אפשרויות, קריטריונים עם משקל, ציון מכל אחד מכם, והמערכת מראה איפה אתם לא מסכימים. ובסוף נשאר תיעוד של מה הוחלט ולמה.",
  },
  {
    icon: CalendarDays,
    title: "תאריך שעובר את הלוח",
    text: "בדיקה לפי הלוח העברי: שבת, חגים, צומות, העומר ושלושת השבועות לפי המנהג שלכם, יחד עם יום החתונה והעונה והמחיר.",
  },
  {
    icon: MessageCircle,
    title: "כל השאר במקום אחד",
    text: "תקציב, ספקים, משימות לפי תאריך החתונה, לו״ז ליום עצמו, וחלוקת מסמכים לרבנות ואקו״ם.",
  },
];

export default async function Landing() {
  if (await getSession()) redirect("/home");
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <span className="font-display text-2xl font-semibold text-brand-ink">{SITE.name}</span>
        <nav aria-label="כניסה" className="flex items-center gap-2">
          <Link href="/login" className={buttonClass("ghost", "sm")}>
            התחברות
          </Link>
          <Link href="/signup" className={buttonClass("primary", "sm")}>
            הרשמה
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">{SITE.tagline}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">{SITE.description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={buttonClass("primary", "lg")}>
              מתחילים לתכנן, בחינם
            </Link>
          </div>
        </section>

        <section aria-label="מה יש כאן" className="grid gap-4 pb-16 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-card border border-line bg-surface p-6">
              <Icon className="mb-3 size-6 text-brand-ink" aria-hidden />
              <h2 className="mb-1 font-display text-xl font-semibold">{title}</h2>
              <p className="text-muted">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line py-6 text-sm text-muted">
        המידע על לוח, תקציב וטקס הוא כלי תכנון ולא פסיקה הלכתית או משפטית. מסדר הקידושין ולשכת הרישום הם הכתובת הסופית.
      </footer>
    </div>
  );
}
