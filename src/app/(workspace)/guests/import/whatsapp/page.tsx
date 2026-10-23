import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { ConfirmButton } from "@/components/guests/client-bits";
import { CandidatesReview, WhatsappUploadForm, type ReviewRow } from "@/components/guests/whatsapp-forms";
import { clearCandidatesAction } from "@/app/actions/whatsapp";
import { formatPhone } from "@/lib/phone";
import { getCandidateData } from "@/lib/queries";
import { requireWorkspace } from "@/lib/session";
import { DEFAULT_WINDOW_MONTHS, WINDOW_LABEL, WINDOW_MONTHS, nameSet, normalizeName, relativeAge } from "@/lib/whatsapp-candidates";

export const metadata: Metadata = { title: "ייבוא מוואטסאפ" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" });

export default async function WhatsappImportPage() {
  const { wedding } = await requireWorkspace();
  const { pending, rejectedCount, knownNames } = await getCandidateData(wedding.id);

  const now = new Date();
  const known = nameSet(knownNames);
  const rows: ReviewRow[] = pending.map((c) => ({
    id: c.id,
    name: c.name,
    phone: formatPhone(c.phone),
    ageLabel: relativeAge(c.lastContactAt, now),
    dateLabel: dateFmt.format(c.lastContactAt),
    maybeDuplicate: known.has(normalizeName(c.name)),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/guests/import" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowRight className="size-4" aria-hidden />
        חזרה לייבוא
      </Link>
      <PageHeader title="ייבוא מוואטסאפ" description="שואבים את האנשים שדיברתם איתם בטווח זמן שתבחרו, ומאשרים כן או לא לכל אחד לפני שהוא נכנס לרשימת האורחים." />

      <div className="flex flex-col gap-6">
        {rows.length ? (
          <Card>
            <SectionTitle>ממתינים להחלטה ({rows.length})</SectionTitle>
            <CandidatesReview rows={rows} partnerAName={wedding.partnerAName} partnerBName={wedding.partnerBName} />
          </Card>
        ) : null}

        <Card>
          <SectionTitle>{rows.length ? "טעינת שיחות נוספות" : "טעינת שיחות"}</SectionTitle>
          <WhatsappUploadForm windows={WINDOW_MONTHS.map((m) => ({ value: m, label: WINDOW_LABEL[m] }))} defaultMonths={DEFAULT_WINDOW_MONTHS} />
        </Card>

        <Card>
          <details open={rows.length === 0}>
            <summary className="cursor-pointer font-display text-xl font-semibold">איך מושכים את השיחות מוואטסאפ</summary>
            <ol className="mt-4 list-decimal space-y-3 ps-5 text-sm leading-relaxed">
              <li>
                במחשב שלכם (לא בשרת), בתיקיית הפרויקט: <code dir="ltr" className="rounded bg-surface-2 px-1.5 py-0.5">cd tools/whatsapp-pull && npm install</code>
              </li>
              <li>
                מריצים: <code dir="ltr" className="rounded bg-surface-2 px-1.5 py-0.5">npm start -- --months 6</code> (המספר הוא חלון הזמן בחודשים).
              </li>
              <li>בטלפון: וואטסאפ ← הגדרות ← מכשירים מקושרים ← קישור מכשיר, וסורקים את הקוד שמופיע בטרמינל.</li>
              <li>
                בסיום נוצר הקובץ <code dir="ltr" className="rounded bg-surface-2 px-1.5 py-0.5">whatsapp-chats.json</code>. מעלים אותו כאן למעלה.
              </li>
            </ol>
            <p className="mt-4 rounded-xl bg-amber-soft p-3 text-sm text-amber-ink">
              הכלי מתחבר לוואטסאפ כמו וואטסאפ ווב, בדרך לא רשמית. תנאי השימוש של וואטסאפ אוסרים לקוחות לא רשמיים, ולכן יש סיכון (קטן בקריאה בלבד, אבל קיים) שהחשבון יוגבל. מומלץ להריץ פעם אחת, לא בלולאה.
            </p>
          </details>
        </Card>

        <Card className="bg-surface-2">
          <h2 className="mb-2 flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-sage-ink" aria-hidden />
            מה נשמר אצלנו
          </h2>
          <ul className="list-disc space-y-1 ps-5 text-sm text-muted">
            <li>רק שם, טלפון ומועד ההודעה האחרונה, ורק למי שבטווח הזמן שבחרתם. אף פעם לא תוכן הודעות, וקבוצות לא נכללות.</li>
            <li>כן: האדם הופך לאורח ונמחק מרשימת האישור. לא: נשמר רק סימון כדי לא להציע אותו שוב.</li>
            <li>אפשר למחוק את הכול בכל רגע, והכול נמחק גם עם מחיקת החתונה.</li>
          </ul>
          {rows.length || rejectedCount ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {rejectedCount ? (
                <form action={clearCandidatesAction}>
                  <input type="hidden" name="scope" value="rejected" />
                  <ConfirmButton message={`למחוק את ${rejectedCount} האנשים שנדחו? הם עשויים להופיע שוב בטעינה הבאה.`} className={buttonClass("secondary", "sm")}>
                    ניקוי הנדחים ({rejectedCount})
                  </ConfirmButton>
                </form>
              ) : null}
              <form action={clearCandidatesAction}>
                <input type="hidden" name="scope" value="all" />
                <ConfirmButton message="למחוק את כל רשימת האישור, כולל מי שעוד לא הוחלט עליו? אורחים שכבר נוספו לא יושפעו." className={buttonClass("danger", "sm")}>
                  מחיקת כל רשימת האישור
                </ConfirmButton>
              </form>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
