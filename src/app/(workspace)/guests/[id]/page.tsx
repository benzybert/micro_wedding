import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Clock, Trash2, X } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Field, Select, TextField } from "@/components/ui/field";
import { CopyButton, ConfirmButton, WhatsAppButton } from "@/components/guests/client-bits";
import { HouseholdForm } from "@/components/guests/household-form";
import { deleteHouseholdAction, deleteMemberAction, saveMemberAction } from "@/app/actions/guests";
import { DIET_LABEL, STATUS_LABEL, householdStatus } from "@/lib/guests";
import { buildMessage, rsvpUrl } from "@/lib/messages";
import { getOrigin } from "@/lib/origin";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { requireWorkspace } from "@/lib/session";
import { formatDateShort } from "@/lib/format";

export const metadata: Metadata = { title: "משק בית" };

export default async function HouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding } = await requireWorkspace();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [household] = await db
    .select()
    .from(schema.households)
    .where(and(eq(schema.households.id, id), eq(schema.households.weddingId, wedding.id)))
    .limit(1);
  if (!household) notFound();

  const [members, tables] = await Promise.all([
    db.select().from(schema.guests).where(eq(schema.guests.householdId, household.id)).orderBy(schema.guests.createdAt),
    db.select().from(schema.seatingTables).where(eq(schema.seatingTables.weddingId, wedding.id)).orderBy(schema.seatingTables.sortOrder),
  ]);

  const status = householdStatus(household, members);
  const link = rsvpUrl(await getOrigin(), household.rsvpToken);
  const waInvite = whatsappLink(household.phone, buildMessage("invite", wedding, household, link));
  const waRemind = whatsappLink(household.phone, buildMessage("reminder", wedding, household, link));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/guests" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowRight className="size-4" aria-hidden />
        חזרה לאורחים
      </Link>
      <PageHeader
        title={household.name}
        description={household.phone ? formatPhone(household.phone) : undefined}
        actions={
          <Badge tone={status === "yes" ? "sage" : status === "no" ? "rose" : status === "not_invited" ? "neutral" : "amber"}>{STATUS_LABEL[status]}</Badge>
        }
      />

      <div className="grid gap-6">
        <Card>
          <SectionTitle>קישור אישי לאישור הגעה</SectionTitle>
          <p className="mb-3 break-all rounded-lg bg-surface-2 px-3 py-2 text-sm" dir="ltr">
            {link}
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={link} />
            {waInvite ? <WhatsAppButton href={household.invitedAt ? (waRemind ?? waInvite) : waInvite} householdId={household.id} kind={household.invitedAt ? "reminder" : "invite"} label={household.invitedAt ? "תזכורת בוואטסאפ" : "הזמנה בוואטסאפ"} /> : <p className="text-sm text-muted">הוסיפו טלפון כדי לשלוח בוואטסאפ.</p>}
          </div>
          <p className="mt-3 text-xs text-muted">
            {household.invitedAt ? `הוזמנו ב-${formatDateShort(household.invitedAt.toISOString().slice(0, 10), true)}. ` : "טרם נשלחה הזמנה. "}
            {household.respondedAt ? `ענו ב-${formatDateShort(household.respondedAt.toISOString().slice(0, 10), true)}.` : "טרם ענו."}
          </p>
          {household.rsvpMessage ? <p className="mt-3 rounded-lg bg-brand-soft p-3 text-sm text-brand-ink">״{household.rsvpMessage}״</p> : null}
        </Card>

        <Card>
          <SectionTitle>פרטים</SectionTitle>
          <HouseholdForm partnerA={wedding.partnerAName} partnerB={wedding.partnerBName} values={household} />
        </Card>

        <Card>
          <SectionTitle>האנשים</SectionTitle>
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="py-4">
                <ActionForm action={saveMemberAction} className="grid gap-3 sm:grid-cols-6" successHint={false}>
                  <input type="hidden" name="id" value={m.id} />
                  <TextField label="שם" name="name" defaultValue={m.name} required maxLength={120} className="sm:col-span-2" />
                  <Field label="תשובה">
                    {(a) => (
                      <Select {...a} name="attending" defaultValue={m.attending}>
                        <option value="pending">ממתין</option>
                        <option value="yes">מגיע/ה</option>
                        <option value="no">לא מגיע/ה</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="אוכל">
                    {(a) => (
                      <Select {...a} name="diet" defaultValue={m.diet}>
                        {Object.entries(DIET_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <TextField label="אלרגיות" name="allergies" defaultValue={m.allergies ?? ""} maxLength={200} className="sm:col-span-2" />
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" name="isChild" defaultChecked={m.isChild} className="size-4 accent-[var(--brand)]" /> ילד/ה
                  </label>
                  <div className="flex items-end gap-2 sm:col-span-4 sm:justify-end">
                    <SubmitButton size="sm" variant="secondary">
                      שמירה
                    </SubmitButton>
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      {m.attending === "yes" ? <Check className="size-3.5 text-sage-ink" aria-hidden /> : m.attending === "no" ? <X className="size-3.5 text-rose-ink" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
                      {m.tableId ? tables.find((t) => t.id === m.tableId)?.name : "ללא שולחן"}
                    </span>
                  </div>
                </ActionForm>
                {members.length > 1 ? (
                  <form action={deleteMemberAction} className="mt-1">
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmButton message={`למחוק את ${m.name}?`} className="inline-flex items-center gap-1 text-xs text-rose-ink hover:underline">
                      <Trash2 className="size-3.5" aria-hidden /> הסרה
                    </ConfirmButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>

          <details className="mt-4 rounded-xl border border-dashed border-line p-4">
            <summary className="font-medium text-brand-ink">הוספת אדם למשק הבית</summary>
            <ActionForm action={saveMemberAction} className="mt-3 grid gap-3 sm:grid-cols-3" resetOnSuccess>
              <input type="hidden" name="householdId" value={household.id} />
              <TextField label="שם" name="name" required maxLength={120} />
              <label className="flex items-end gap-2 pb-3 text-sm">
                <input type="checkbox" name="isChild" className="size-4 accent-[var(--brand)]" /> ילד/ה
              </label>
              <div className="flex items-end">
                <SubmitButton>הוספה</SubmitButton>
              </div>
            </ActionForm>
          </details>
        </Card>

        <form action={deleteHouseholdAction}>
          <input type="hidden" name="id" value={household.id} />
          <ConfirmButton message={`למחוק את ${household.name} וכל האנשים בו? אי אפשר לבטל.`} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-ink hover:bg-rose-soft">
            <Trash2 className="size-4" aria-hidden /> מחיקת משק הבית
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
