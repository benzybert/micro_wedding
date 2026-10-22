import type { Metadata } from "next";
import { Card, SectionTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { InvitePartner } from "@/components/invite-partner";
import { DeleteWeddingForm } from "@/components/delete-wedding";
import { WeddingForm } from "@/components/wedding-form";
import { updateWeddingAction } from "@/app/actions/wedding";
import { requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "הגדרות" };

export default async function SettingsPage() {
  const { wedding, members, me } = await requireWorkspace();
  const other = members.find((m) => m.userId !== me.userId);
  const otherName = me.partner === "b" ? wedding.partnerAName : wedding.partnerBName;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="הגדרות" />
      <div className="grid gap-6">
        <Card>
          <SectionTitle>מי מתכנן</SectionTitle>
          <ul className="mb-4 divide-y divide-line">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between py-2.5">
                <span className="font-medium">{m.name}</span>
                <span className="text-sm text-muted" dir="ltr">
                  {m.email}
                </span>
              </li>
            ))}
          </ul>
          {other ? <p className="text-sm text-muted">שניכם מחוברים לאותה חתונה: כל שינוי של אחד מופיע אצל השני.</p> : <InvitePartner partnerName={otherName} />}
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
            המידע שלכם (שמות וטלפונים של אורחים, החלטות ותקציב) שמור רק בחשבון הזה, ולא נשלח לצד שלישי. אין מעקב ואין פרסומות. הקישורים לאישור הגעה סודיים, וכל אחד פותח רק משק בית אחד.
          </p>
          <a href="/settings/export" className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 font-medium hover:bg-surface-2">
            הורדת כל הנתונים (JSON)
          </a>
          {me.role === "owner" ? (
            <div className="mt-6 rounded-xl border border-rose-ink/30 bg-rose-soft p-4">
              <p className="mb-2 font-medium text-rose-ink">מחיקת החתונה</p>
              <p className="mb-3 text-sm text-rose-ink">מוחק לצמיתות את כל האורחים, ההחלטות, התקציב והמשימות, גם אצל בן/בת הזוג. אי אפשר לשחזר.</p>
              <DeleteWeddingForm />
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
