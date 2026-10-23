import type { Metadata } from "next";
import { Card, SectionTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import Link from "next/link";
import { DeleteWeddingForm } from "@/components/delete-wedding";
import { WeddingForm } from "@/components/wedding-form";
import { updateWeddingAction } from "@/app/actions/wedding";
import { memberLabel, requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "הגדרות" };

export default async function SettingsPage() {
  const { wedding, members, me } = await requireWorkspace();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="הגדרות" />
      <div className="grid gap-6">
        <Card>
          <SectionTitle>מי מתכנן</SectionTitle>
          <ul className="mb-3 divide-y divide-line">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between py-2.5">
                <span className="font-medium">{memberLabel(wedding, m)}</span>
                {m.userId === me.userId ? <span className="text-sm text-brand-ink">זה אני</span> : null}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            אין חשבונות וסיסמאות. כל מכשיר זוכר מי אתם, והבחירה קובעת של מי הציונים וההערות.{" "}
            <Link href="/who" className="font-medium text-brand-ink underline underline-offset-4">
              החלפת מתכנן/ת
            </Link>
          </p>
        </Card>

        <Card id="wedding">
          <SectionTitle>פרטי החתונה</SectionTitle>
          <WeddingForm
            mode="settings"
            action={updateWeddingAction}
            values={{
              partnerAName: wedding.partnerAName,
              partnerBName: wedding.partnerBName,
              weddingDate: wedding.weddingDate,
              guestCap: wedding.guestCap,
              budgetTotal: wedding.budgetTotal,
              calendarCustom: wedding.calendarCustom,
              ceremonyTrack: wedding.ceremonyTrack,
              city: wedding.city,
              venueName: wedding.venueName,
              venueAddress: wedding.venueAddress,
              startTime: wedding.startTime,
              rsvpDeadline: wedding.rsvpDeadline,
              rsvpNote: wedding.rsvpNote,
              invitationTemplate: wedding.invitationTemplate,
              reminderTemplate: wedding.reminderTemplate,
            }}
          />
        </Card>

        <Card>
          <SectionTitle>נתונים ופרטיות</SectionTitle>
          <p className="mb-3 text-sm text-muted">
            האתר פתוח לכל מי שיש לו את הכתובת (אין התחברות), אז אל תפיצו אותה. המידע (שמות וטלפונים של אורחים, החלטות ותקציב) לא נשלח לצד שלישי, ואין מעקב או פרסומות. הקישורים לאישור הגעה סודיים, וכל אחד פותח רק משק בית אחד.
          </p>
          <a href="/settings/export" className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 font-medium hover:bg-surface-2">
            הורדת כל הנתונים (JSON)
          </a>
          <div className="mt-6 rounded-xl border border-rose-ink/30 bg-rose-soft p-4">
            <p className="mb-2 font-medium text-rose-ink">מחיקת החתונה</p>
            <p className="mb-3 text-sm text-rose-ink">מוחק לצמיתות את כל האורחים, ההחלטות, התקציב והמשימות, ומחזיר את האתר להגדרה ראשונית. אי אפשר לשחזר.</p>
            <DeleteWeddingForm />
          </div>
        </Card>
      </div>
    </div>
  );
}
