import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { CopyButton, WhatsAppButton } from "@/components/guests/client-bits";
import { requireWorkspace } from "@/lib/session";
import { getGuestData } from "@/lib/queries";
import { TIER_SHORT, committedSeats, householdStatus, suggestWave } from "@/lib/guests";
import { buildMessage, rsvpUrl } from "@/lib/messages";
import { getOrigin } from "@/lib/origin";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { daysBetween, formatDateShort, todayIso } from "@/lib/format";

export const metadata: Metadata = { title: "שליחת הזמנות" };

export default async function InvitePage() {
  const { wedding } = await requireWorkspace();
  const { households, guests } = await getGuestData(wedding.id);
  const origin = await getOrigin();
  const today = todayIso();

  const wave = suggestWave(households, guests, wedding.guestCap);
  const waveIds = new Set(wave.suggestions.map((s) => s.householdId));
  const seatsOf = (id: string) => guests.filter((g) => g.householdId === id && g.attending !== "no").length;

  const toInvite = households.filter((h) => !h.invitedAt && (h.tier === "must" || waveIds.has(h.id)));
  const holding = households.filter((h) => !h.invitedAt && h.tier !== "must" && !waveIds.has(h.id));
  const waiting = households.filter((h) => {
    const status = householdStatus(h, guests.filter((g) => g.householdId === h.id));
    return h.invitedAt && (status === "waiting" || status === "partial");
  });

  const card = (h: (typeof households)[number], kind: "invite" | "reminder") => {
    const link = rsvpUrl(origin, h.rsvpToken);
    const wa = whatsappLink(h.phone, buildMessage(kind, wedding, h, link));
    const sinceMs = kind === "reminder" && h.invitedAt ? daysBetween(h.invitedAt.toISOString().slice(0, 10), today) : null;
    return (
      <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <Link href={`/guests/${h.id}`} className="font-medium hover:underline">
            {h.name}
          </Link>
          <p className="text-xs text-muted">
            רשימה {TIER_SHORT[h.tier]} · {seatsOf(h.id)} מקומות
            {h.phone ? ` · ${formatPhone(h.phone)}` : ""}
            {sinceMs !== null ? ` · נשלח לפני ${sinceMs} ימים` : ""}
            {kind === "reminder" && h.remindedAt ? ` · תזכורת ב-${formatDateShort(h.remindedAt.toISOString().slice(0, 10))}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {wa ? (
            <WhatsAppButton href={wa} householdId={h.id} kind={kind} label={kind === "invite" ? "שליחה בוואטסאפ" : "תזכורת"} />
          ) : (
            <Badge tone="amber">
              <Phone className="size-3" aria-hidden /> אין טלפון
            </Badge>
          )}
          <CopyButton text={link} label="קישור" />
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/guests" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowRight className="size-4" aria-hidden />
        חזרה לאורחים
      </Link>
      <PageHeader
        title="שליחת הזמנות"
        description="כל לחיצה פותחת וואטסאפ עם הודעה מוכנה וקישור אישי לאישור הגעה, ומסמנת שנשלחה. את נוסח ההודעה אפשר לערוך בהגדרות."
      />

      <div className="grid gap-6">
        <Card>
          <SectionTitle>מוכנים לשליחה ({toInvite.length})</SectionTitle>
          <p className="mb-2 text-sm text-muted">
            רשימה א׳ תמיד, ומרשימות ב׳ וג׳ רק מה שנכנס כרגע לתקרה ({wedding.guestCap}). תפוסה נוכחית: {committedSeats(households, guests)}.
          </p>
          {toInvite.length ? <ul className="divide-y divide-line">{toInvite.map((h) => card(h, "invite"))}</ul> : <p className="text-muted">אין מי שמחכה להזמנה.</p>}
        </Card>

        <Card>
          <SectionTitle>ממתינים לתשובה ({waiting.length})</SectionTitle>
          {waiting.length ? <ul className="divide-y divide-line">{waiting.map((h) => card(h, "reminder"))}</ul> : <p className="text-muted">כולם ענו, או שעוד לא נשלחו הזמנות.</p>}
        </Card>

        {holding.length ? (
          <Card>
            <SectionTitle>בהמתנה ({holding.length})</SectionTitle>
            <p className="mb-2 text-sm text-muted">חורגים מהתקרה כרגע. כשמישהו יסרב, יתפנה מקום והם יעברו למעלה.</p>
            <ul className="divide-y divide-line">
              {holding.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link href={`/guests/${h.id}`} className="hover:underline">
                    {h.name}
                  </Link>
                  <span className="text-xs text-muted">
                    רשימה {TIER_SHORT[h.tier]} · {seatsOf(h.id)} מקומות
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Link href="/settings#messages" className={buttonClass("ghost", "sm", "self-start")}>
          עריכת נוסח ההודעות
        </Link>
      </div>
    </div>
  );
}
