import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CalendarHeart, Star, Trash2 } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { AssessmentDetail, FlagList, PriceBadge, VERDICT_LABEL, VERDICT_TONE } from "@/components/date-assessment";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { inputClass } from "@/components/ui/field";
import { addCandidateAction, clearWeddingDateAction, removeCandidateAction, setWeddingDateAction } from "@/app/actions/dates";
import { cityByKey } from "@/data/cities";
import { requireWorkspace } from "@/lib/session";
import { addDays, formatDateShort, isValidIsoDate, todayIso, WEEKDAYS_HE } from "@/lib/format";
import { assessDate, scanDates, type Verdict } from "@/lib/hebrew-calendar";

export const metadata: Metadata = { title: "תאריך" };

type SP = { check?: string; from?: string; to?: string; wd?: string | string[]; show?: string };

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const monthTitle = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

export default async function DatePage({ searchParams }: { searchParams: Promise<SP> }) {
  const { wedding } = await requireWorkspace();
  const sp = await searchParams;
  const today = todayIso();
  const opts = { custom: wedding.calendarCustom, city: wedding.city };

  const from = isValidIsoDate(sp.from) ? sp.from : addDays(today, 30);
  const to = isValidIsoDate(sp.to) && sp.to >= from ? sp.to : addDays(from, 365);
  const selectedDays = (Array.isArray(sp.wd) ? sp.wd : sp.wd ? [sp.wd] : null)?.map(Number).filter((n) => n >= 0 && n <= 6) ?? [0, 1, 2, 3, 4];
  const worst: Verdict = sp.show === "caution" ? "caution" : "ok";

  const results = scanDates({ from, to, ...opts, weekdays: selectedDays, worstAllowed: worst, maxDays: 400 });
  const shown = results.slice(0, 160);

  const checkIso = isValidIsoDate(sp.check) ? sp.check : wedding.weddingDate;
  const checked = checkIso ? assessDate(checkIso, opts) : null;

  const candidates = await db.select().from(schema.dateCandidates).where(eq(schema.dateCandidates.weddingId, wedding.id)).orderBy(schema.dateCandidates.date);
  const candidateSet = new Set(candidates.map((c) => c.date));

  const baseQs = new URLSearchParams();
  baseQs.set("from", from);
  baseQs.set("to", to);
  for (const d of selectedDays) baseQs.append("wd", String(d));
  if (sp.show) baseQs.set("show", sp.show);
  const checkHref = (iso: string) => `/date?${baseQs.toString()}&check=${iso}#check`;

  const byMonth = new Map<string, typeof shown>();
  for (const r of shown) byMonth.set(r.iso.slice(0, 7), [...(byMonth.get(r.iso.slice(0, 7)) ?? []), r]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="תאריך"
        description={`בדיקה לפי הלוח העברי, מנהג ${wedding.calendarCustom === "ashkenaz" ? "אשכנז" : "ספרד"} ואזור ${cityByKey(wedding.city).he}. זה כלי תכנון, ומסדר הקידושין הוא הכתובת הסופית.`}
        actions={
          <Link href="/settings#wedding" className={buttonClass("ghost", "sm")}>
            שינוי מנהג או אזור
          </Link>
        }
      />

      <div className="grid gap-6">
        <Card id="check">
          <SectionTitle>
            {checked && checked.iso === wedding.weddingDate ? "תאריך החתונה" : "בדיקת תאריך"}
          </SectionTitle>
          <form method="get" action="/date#check" className="mb-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              תאריך
              <input type="date" name="check" defaultValue={checkIso ?? ""} className={`${inputClass} w-auto`} />
            </label>
            <Button type="submit" variant="secondary">
              בדיקה
            </Button>
          </form>
          {checked ? (
            <>
              <AssessmentDetail a={checked} />
              <div className="mt-4 flex flex-wrap gap-2">
                {checked.iso !== wedding.weddingDate && checked.verdict !== "blocked" ? (
                  <form action={setWeddingDateAction}>
                    <input type="hidden" name="date" value={checked.iso} />
                    <Button type="submit">
                      <CalendarHeart className="size-4" aria-hidden /> לקבוע כתאריך החתונה
                    </Button>
                  </form>
                ) : null}
                {!candidateSet.has(checked.iso) && checked.iso !== wedding.weddingDate ? (
                  <form action={addCandidateAction}>
                    <input type="hidden" name="date" value={checked.iso} />
                    <Button type="submit" variant="secondary">
                      <Star className="size-4" aria-hidden /> שמירה כמועמד
                    </Button>
                  </form>
                ) : null}
                {checked.iso === wedding.weddingDate ? (
                  <form action={clearWeddingDateAction}>
                    <Button type="submit" variant="ghost">
                      ביטול התאריך
                    </Button>
                  </form>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-muted">בחרו תאריך לבדיקה, או חפשו תאריכים פנויים למטה.</p>
          )}
        </Card>

        {candidates.length ? (
          <Card>
            <SectionTitle>מועמדים ({candidates.length})</SectionTitle>
            <ul className="divide-y divide-line">
              {candidates.map((c) => {
                const a = assessDate(c.date, opts);
                return (
                  <li key={c.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={checkHref(c.date)} className="font-medium hover:underline">
                        {WEEKDAYS_HE[a.weekdayIndex]} · {formatDateShort(c.date, true)}
                        <span className="ms-2 text-xs font-normal text-muted">{a.hebrewDate}</span>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge tone={VERDICT_TONE[a.verdict]}>{VERDICT_LABEL[a.verdict]}</Badge>
                        <PriceBadge level={a.priceLevel} />
                        <form action={removeCandidateAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-rose-soft hover:text-rose-ink" aria-label="הסרה">
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <Card>
          <SectionTitle>למצוא תאריכים</SectionTitle>
          <form method="get" action="/date#finder" id="finder" className="mb-5 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                מתאריך
                <input type="date" name="from" defaultValue={from} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                עד תאריך
                <input type="date" name="to" defaultValue={to} className={inputClass} />
              </label>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm">ימים</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS_HE.map((d, i) => (
                  <label key={d} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                    <input type="checkbox" name="wd" value={i} defaultChecked={selectedDays.includes(i)} className="size-4 accent-[var(--brand)]" />
                    {d}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">ראשון עד רביעי הם הזולים ביותר, חמישי היקר. שישי ושבת דורשים תכנון שעות.</p>
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="show" value="caution" defaultChecked={sp.show === "caution"} className="size-4 accent-[var(--brand)]" />
              להציג גם תאריכים עם הסתייגויות (שישי, מוצ״ש, מנהגים)
            </label>
            <div>
              <Button type="submit">חיפוש</Button>
            </div>
          </form>

          {shown.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="size-8" />} title="לא נמצאו תאריכים">
              נסו להרחיב את הטווח, להוסיף ימים, או לסמן הצגת תאריכים עם הסתייגויות.
            </EmptyState>
          ) : (
            <div className="grid gap-5">
              <p className="text-sm text-muted">
                {results.length} תאריכים{results.length > shown.length ? ` (מוצגים ${shown.length} הראשונים)` : ""}
              </p>
              {[...byMonth.entries()].map(([month, rows]) => (
                <section key={month} aria-label={monthTitle(`${month}-01`)}>
                  <h3 className="mb-2 font-display text-lg font-semibold">{monthTitle(`${month}-01`)}</h3>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {rows.map((r) => (
                      <li key={r.iso} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <Link href={checkHref(r.iso)} className="min-w-0 hover:underline">
                          <span className="font-medium">
                            {WEEKDAYS_HE[r.weekdayIndex]} {formatDateShort(r.iso)}
                          </span>
                          <span className="ms-2 text-xs text-muted">{r.hebrewDate}</span>
                          {r.holidays.length ? <span className="ms-2 text-xs text-sky-ink">{r.holidays.join(", ")}</span> : null}
                        </Link>
                        <div className="flex items-center gap-2">
                          {r.verdict !== "ok" ? <Badge tone={VERDICT_TONE[r.verdict]}>{r.flags[0]?.title}</Badge> : null}
                          <PriceBadge level={r.priceLevel} />
                          {candidateSet.has(r.iso) ? (
                            <Badge tone="brand">
                              <Star className="size-3" aria-hidden /> מועמד
                            </Badge>
                          ) : (
                            <form action={addCandidateAction}>
                              <input type="hidden" name="date" value={r.iso} />
                              <button type="submit" className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-sm text-brand-ink hover:bg-brand-soft">
                                <Star className="size-3.5" aria-hidden /> מועמד
                              </button>
                            </form>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>מה הבדיקה מכסה</SectionTitle>
          <ul className="list-disc space-y-1 ps-5 text-sm text-muted">
            <li>שבת (מוצ״ש בלבד), ערב שבת וזמני הדלקת נרות, חגים וחול המועד, צומות, ערבי חג.</li>
            <li>שלושת השבועות (אשכנז: מי״ז בתמוז; ספרד: מראש חודש אב) וספירת העומר לפי המנהג.</li>
            <li>יום השואה ויום הזיכרון: חוק עינוגים ציבוריים, מהשקיעה בערב ועד צאת הכוכבים.</li>
            <li>עשרת ימי תשובה: מנהג נפוץ להימנע, לא איסור.</li>
            <li>לא נבדק: המתנה של 90 יום לגרושה או אלמנה, קרבה משפחתית, ומנהגי קהילות ספציפיות. את אלה ברר/י מול לשכת הרישום.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
