import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Trash2, Wand2 } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { TextField } from "@/components/ui/field";
import { AutoSubmitSelect, ConfirmButton } from "@/components/guests/client-bits";
import { assignTableAction, autoSeatAction, clearSeatingAction, createTableAction, deleteTableAction } from "@/app/actions/guests";
import { requireWorkspace } from "@/lib/session";
import { getGuestData } from "@/lib/queries";
import { tableFill, unseated } from "@/lib/guests";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "הושבה" };

export default async function SeatingPage() {
  const { wedding } = await requireWorkspace();
  const { households, guests, tables } = await getGuestData(wedding.id);
  const seating = guests.filter((g) => g.attending !== "no");
  const fill = tableFill(tables, seating);
  const loose = unseated(seating);
  const hhName = new Map(households.map((h) => [h.id, h.name] as const));

  const select = (guestId: string, current: string | null, label: string) => (
    <form action={assignTableAction} className="shrink-0">
      <input type="hidden" name="guestId" value={guestId} />
      <AutoSubmitSelect name="tableId" defaultValue={current ?? ""} aria-label={label}>
        <option value="">ללא שולחן</option>
        {fill.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.seated}/{t.capacity})
          </option>
        ))}
      </AutoSubmitSelect>
    </form>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/guests" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowRight className="size-4" aria-hidden />
        חזרה לאורחים
      </Link>
      <PageHeader title="הושבה" description={`${seating.length} אורחים (כולל ממתינים), ${tables.length} שולחנות. משקי בית נשארים יחד בהושבה האוטומטית.`} />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>שולחן חדש</SectionTitle>
          <ActionForm action={createTableAction} className="flex flex-wrap items-end gap-3" resetOnSuccess>
            <TextField label="שם (לא חובה)" name="name" maxLength={60} className="min-w-40 flex-1" />
            <TextField label="מקומות" name="capacity" type="number" min={1} max={40} defaultValue={8} className="w-28" />
            <SubmitButton>
              <Plus className="size-4" aria-hidden /> הוספה
            </SubmitButton>
          </ActionForm>
        </Card>
        <Card>
          <SectionTitle>הושבה אוטומטית</SectionTitle>
          <p className="mb-3 text-sm text-muted">ממלאת רק אורחים שעדיין בלי שולחן, לפי צד ומשק בית. אפשר לתקן אחר כך ידנית.</p>
          <div className="flex flex-wrap gap-2">
            <ActionForm action={autoSeatAction} className="contents">
              <SubmitButton variant="secondary">
                <Wand2 className="size-4" aria-hidden /> הושב אוטומטית
              </SubmitButton>
            </ActionForm>
            <ActionForm action={clearSeatingAction} className="contents" successHint={false}>
              <SubmitButton variant="ghost">איפוס הושבה</SubmitButton>
            </ActionForm>
          </div>
        </Card>
      </div>

      {tables.length === 0 ? (
        <EmptyState title="עוד אין שולחנות">מוסיפים שולחן, ואז משבצים אורחים ידנית או בהושבה אוטומטית. במיקרו חתונה לפעמים מספיק שולחן אחד ארוך.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {fill.map((t) => (
            <Card key={t.id} className={cn(t.over && "border-rose-ink")}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">{t.name}</h2>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm tabular-nums", t.over ? "font-medium text-rose-ink" : "text-muted")}>
                    {t.seated}/{t.capacity}
                  </span>
                  <form action={deleteTableAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton message={`למחוק את ${t.name}? האורחים יחזרו ל"ללא שולחן".`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-rose-soft hover:text-rose-ink">
                      <Trash2 className="size-4" aria-label={`מחיקת ${t.name}`} />
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              <ul className="divide-y divide-line text-sm">
                {seating
                  .filter((g) => g.tableId === t.id)
                  .map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="min-w-0 truncate">
                        <bdi>{g.name}</bdi>
                        <span className="ms-1 text-xs text-muted">{hhName.get(g.householdId)}</span>
                      </span>
                      {select(g.id, g.tableId, `שולחן עבור ${g.name}`)}
                    </li>
                  ))}
                {t.seated === 0 ? <li className="py-2 text-muted">ריק</li> : null}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {loose.length ? (
        <Card className="mt-6">
          <SectionTitle>ללא שולחן ({loose.length})</SectionTitle>
          <ul className="divide-y divide-line text-sm">
            {loose.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate">
                  <bdi>{g.name}</bdi>
                  <span className="ms-1 text-xs text-muted">{hhName.get(g.householdId)}</span>
                </span>
                {tables.length ? select(g.id, null, `שולחן עבור ${g.name}`) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
