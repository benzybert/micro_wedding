import type { Metadata } from "next";
import { AtSign, Mail, MessageCircle, Pencil, Phone, Plus, Store, Trash2 } from "lucide-react";
import { ConfirmButton, AutoSubmitSelect } from "@/components/guests/client-bits";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { VendorForm } from "@/components/vendor-form";
import { deleteVendorAction, setVendorStatusAction } from "@/app/actions/vendors";
import { BUDGET_CATEGORY_LABEL } from "@/data/budget";
import { VENDOR_STATUS_LABEL, VENDOR_STATUS_ORDER } from "@/lib/vendor-status";
import { requireWorkspace } from "@/lib/session";
import { getVendors } from "@/lib/queries";
import { formatILS } from "@/lib/format";
import { formatPhone, normalizePhone } from "@/lib/phone";
import type { VendorStatus } from "@/db/schema";

export const metadata: Metadata = { title: "ספקים" };

const TONE: Record<VendorStatus, Tone> = { idea: "neutral", contacted: "sky", quoted: "amber", booked: "sage", declined: "rose" };

const WHERE_TO_LOOK = [
  { name: "Save A Date", url: "https://www.saveadate.co.il/" },
  { name: "מיתחתנים (Mit4Mit)", url: "https://www.mit4mit.co.il/" },
  { name: "Engaged", url: "https://engaged.co.il/" },
  { name: "וואלה חתונות", url: "https://mazaltov.walla.co.il/" },
];

export default async function VendorsPage() {
  const { wedding } = await requireWorkspace();
  const vendors = await getVendors(wedding.id);
  const byCat = new Map<string, typeof vendors>();
  for (const v of vendors) byCat.set(v.category, [...(byCat.get(v.category) ?? []), v]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="ספקים" description="כל מי שבדקתם, עם הצעות, מקדמות וסטטוס. כשסוגרים, אפשר להוסיף את הסכום לתקציב." />

      {vendors.length === 0 ? (
        <EmptyState icon={<Store className="size-8" />} title="עוד אין ספקים" className="mb-6">
          מתחילים מהספק הראשון שמצאתם. בקשו הצעה כתובה, והכניסו אותה כאן.
        </EmptyState>
      ) : null}

      <div className="grid gap-6">
        {[...byCat.entries()].map(([cat, list]) => (
          <section key={cat} aria-label={BUDGET_CATEGORY_LABEL[cat] ?? cat}>
            <h2 className="mb-2 font-display text-xl font-semibold">{BUDGET_CATEGORY_LABEL[cat] ?? "אחר"}</h2>
            <ul className="grid gap-3">
              {list
                .sort((a, b) => VENDOR_STATUS_ORDER.indexOf(a.status) - VENDOR_STATUS_ORDER.indexOf(b.status))
                .map((v) => {
                  const wa = normalizePhone(v.phone);
                  return (
                    <li key={v.id}>
                      <Card className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-display text-lg font-semibold">{v.name}</h3>
                            <p className="text-xs text-muted">
                              {[v.contactName, v.phone ? formatPhone(v.phone) : null].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={TONE[v.status]}>{VENDOR_STATUS_LABEL[v.status]}</Badge>
                            <form action={setVendorStatusAction}>
                              <input type="hidden" name="id" value={v.id} />
                              <AutoSubmitSelect name="status" defaultValue={v.status} aria-label={`סטטוס של ${v.name}`}>
                                {Object.entries(VENDOR_STATUS_LABEL).map(([k, l]) => (
                                  <option key={k} value={k}>
                                    {l}
                                  </option>
                                ))}
                              </AutoSubmitSelect>
                            </form>
                          </div>
                        </div>
                        {v.quoteAmount != null || v.depositAmount != null ? (
                          <p className="mt-2 text-sm">
                            {v.quoteAmount != null ? <>הצעה: <bdi className="font-medium">{formatILS(v.quoteAmount)}</bdi></> : null}
                            {v.depositAmount != null ? <> · מקדמה: <bdi className="font-medium">{formatILS(v.depositAmount)}</bdi></> : null}
                          </p>
                        ) : null}
                        {v.notes ? <p className="mt-1 whitespace-pre-line text-sm text-muted">{v.notes}</p> : null}
                        <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
                          {v.phone ? (
                            <a className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-brand-ink hover:bg-brand-soft" href={`tel:+${wa ?? ""}`}>
                              <Phone className="size-3.5" aria-hidden /> התקשרות
                            </a>
                          ) : null}
                          {wa ? (
                            <a className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-brand-ink hover:bg-brand-soft" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="size-3.5" aria-hidden /> וואטסאפ
                            </a>
                          ) : null}
                          {v.email ? (
                            <a className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-brand-ink hover:bg-brand-soft" href={`mailto:${v.email}`}>
                              <Mail className="size-3.5" aria-hidden /> אימייל
                            </a>
                          ) : null}
                          {v.instagram ? (
                            <a className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-brand-ink hover:bg-brand-soft" href={`https://instagram.com/${v.instagram.replace(/[^A-Za-z0-9._]/g, "")}`} target="_blank" rel="noopener noreferrer">
                              <AtSign className="size-3.5" aria-hidden /> אינסטגרם
                            </a>
                          ) : null}
                          {v.url ? (
                            <a className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-brand-ink hover:bg-brand-soft" href={v.url} target="_blank" rel="noopener noreferrer nofollow">
                              אתר
                            </a>
                          ) : null}
                        </div>
                        <details className="mt-2">
                          <summary className="inline-flex cursor-pointer items-center gap-1 text-sm text-brand-ink">
                            <Pencil className="size-3.5" aria-hidden /> עריכה
                          </summary>
                          <div className="mt-3 rounded-xl bg-surface-2 p-4">
                            <VendorForm values={v} />
                            <form action={deleteVendorAction} className="mt-3">
                              <input type="hidden" name="id" value={v.id} />
                              <ConfirmButton message={`למחוק את ${v.name}?`} className="inline-flex items-center gap-1 text-sm text-rose-ink hover:underline">
                                <Trash2 className="size-3.5" aria-hidden /> מחיקת הספק
                              </ConfirmButton>
                            </form>
                          </div>
                        </details>
                      </Card>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}

        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <Plus className="size-5" aria-hidden /> ספק חדש
            </span>
          </SectionTitle>
          <VendorForm />
        </Card>

        <Card>
          <SectionTitle>איפה מחפשים</SectionTitle>
          <p className="mb-2 text-sm text-muted">אין ממשק פתוח לספקים בישראל, אז זה לינקים לחיפוש ידני. מבקשים הצעה כתובה לאותו תאריך, ושואלים אם המחיר כולל מע״מ.</p>
          <ul className="flex flex-wrap gap-2">
            {WHERE_TO_LOOK.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-xl border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
