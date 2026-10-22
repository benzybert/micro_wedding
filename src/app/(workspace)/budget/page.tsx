import type { Metadata } from "next";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { BudgetItemForm, BudgetTotalForm } from "@/components/budget-forms";
import { ConfirmButton } from "@/components/guests/client-bits";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { EmptyState, PageHeader, Stat } from "@/components/ui/page";
import { ProgressBar, SegmentedBar } from "@/components/ui/progress";
import { addAcumAction, deleteBudgetItemAction, seedBudgetAction } from "@/app/actions/budget";
import { ACUM_FAMILY_EVENT_2026, BUDGET_CATEGORIES, BUDGET_CATEGORY_LABEL, PER_PLATE_BANDS, RABBINATE_FEE_2026 } from "@/data/budget";
import { budgetHeadcount, itemAmounts, perPlate, summarizeBudget } from "@/lib/budget";
import { requireWorkspace } from "@/lib/session";
import { getBudgetItems, getGuestData } from "@/lib/queries";
import { formatDateShort, formatILS, formatPercent } from "@/lib/format";
import { headcount } from "@/lib/guests";

export const metadata: Metadata = { title: "תקציב" };

export default async function BudgetPage() {
  const { wedding } = await requireWorkspace();
  const [items, { guests }] = await Promise.all([getBudgetItems(wedding.id), getGuestData(wedding.id)]);
  const hc = headcount(guests);
  const heads = budgetHeadcount(hc.expected, wedding.guestCap);
  const s = summarizeBudget(items, heads, wedding.budgetTotal);

  const food = s.categories.find((c) => c.key === "venue_catering");
  const plate = food ? perPlate(food.effective, heads) : null;
  const hasAcum = items.some((i) => i.title.includes("אקו"));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="תקציב" description={`מחושב על ${heads} סועדים${hc.expected === 0 ? " (תקרת האורחים, עד שתהיה רשימה)" : ""}. סעיפים לפי אורח מוכפלים אוטומטית.`} />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="התקציב" value={<bdi>{formatILS(wedding.budgetTotal)}</bdi>} />
            <Stat label={s.overBudget ? "חריגה" : "נשאר"} value={<bdi className={s.overBudget ? "text-rose-ink" : ""}>{wedding.budgetTotal ? formatILS(s.overBudget ? -(s.headroom ?? 0) : s.headroom) : "—"}</bdi>} />
            <Stat label="שולם" value={<bdi>{formatILS(s.paid)}</bdi>} hint={<span>נותר לשלם <bdi>{formatILS(s.unpaid)}</bdi></span>} />
          </div>
          {wedding.budgetTotal ? (
            <div className="mt-4">
              <SegmentedBar
                label="ניצול התקציב"
                max={wedding.budgetTotal}
                segments={[
                  { value: Math.min(s.paid, wedding.budgetTotal), tone: "sage", label: "שולם" },
                  { value: Math.max(Math.min(s.effective, wedding.budgetTotal) - s.paid, 0), tone: s.overBudget ? "rose" : "brand", label: "מתוכנן" },
                ]}
              />
              <p className="mt-1 text-xs text-muted">
                מתוכנן/הוצא {formatPercent(s.effective / wedding.budgetTotal)} מהתקציב. {plate ? `מקום ואוכל: כ-${formatILS(plate)} לסועד.` : ""}
              </p>
            </div>
          ) : null}
        </Card>
        <Card>
          <SectionTitle>תקציב כולל</SectionTitle>
          <BudgetTotalForm value={wedding.budgetTotal} />
        </Card>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Wallet className="size-8" />} title="עוד אין סעיפים בתקציב" className="mb-6">
          <p className="mb-3">אחרי שקובעים תקציב כולל, אפשר ליצור חלוקה התחלתית לפי הפרופורציות המקובלות בישראל (מקום ואוכל כ-56%, צילום 10%, מוזיקה 6% וכו׳) ולעדכן למציאות.</p>
          <ActionForm action={seedBudgetAction} className="inline-block">
            <SubmitButton>יצירת תקציב התחלתי</SubmitButton>
          </ActionForm>
        </EmptyState>
      ) : null}

      <div className="grid gap-6">
        {BUDGET_CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat.key);
          const sum = s.categories.find((c) => c.key === cat.key);
          if (!catItems.length) return null;
          return (
            <Card key={cat.key}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-semibold">{cat.he}</h2>
                <p className="text-sm text-muted">
                  <bdi>{formatILS(sum?.effective ?? 0)}</bdi>
                  {wedding.budgetTotal ? ` · ${formatPercent((sum?.effective ?? 0) / wedding.budgetTotal)}` : ""}
                </p>
              </div>
              <p className="mb-3 text-xs text-muted">{cat.hint}</p>
              <ul className="divide-y divide-line">
                {catItems.map((it) => {
                  const a = itemAmounts(it, heads);
                  return (
                    <li key={it.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{it.title}</p>
                          <p className="text-xs text-muted">
                            {it.perGuest ? `${formatILS(it.actualAmount ?? it.plannedAmount)} × ${heads} סועדים` : a.actual != null ? "לפי הצעה/חשבונית" : "הערכה"}
                            {it.dueDate ? ` · תשלום עד ${formatDateShort(it.dueDate)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-end">
                          <div>
                            <p className="font-medium tabular-nums">
                              <bdi>{formatILS(a.effective)}</bdi>
                            </p>
                            {a.paid > 0 ? <p className="text-xs text-sage-ink">שולם <bdi>{formatILS(a.paid)}</bdi></p> : null}
                          </div>
                          {a.paid >= a.effective && a.effective > 0 ? <Badge tone="sage">שולם</Badge> : null}
                        </div>
                      </div>
                      {it.notes ? <p className="mt-1 text-xs text-muted">{it.notes}</p> : null}
                      <details className="mt-2">
                        <summary className="inline-flex cursor-pointer items-center gap-1 text-sm text-brand-ink">
                          <Pencil className="size-3.5" aria-hidden /> עריכה
                        </summary>
                        <div className="mt-3 rounded-xl bg-surface-2 p-4">
                          <BudgetItemForm values={it} />
                          <form action={deleteBudgetItemAction} className="mt-3">
                            <input type="hidden" name="id" value={it.id} />
                            <ConfirmButton message={`למחוק את "${it.title}"?`} className="inline-flex items-center gap-1 text-sm text-rose-ink hover:underline">
                              <Trash2 className="size-3.5" aria-hidden /> מחיקת הסעיף
                            </ConfirmButton>
                          </form>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
              {sum ? <ProgressBar value={sum.paid} max={Math.max(sum.effective, 1)} tone="sage" label={`שולם ב${cat.he}`} /> : null}
            </Card>
          );
        })}

        {items.filter((i) => !BUDGET_CATEGORY_LABEL[i.category]).length ? <p className="text-sm text-muted">יש סעיפים בקטגוריה לא מוכרת.</p> : null}

        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <Plus className="size-5" aria-hidden /> הוספת סעיף
            </span>
          </SectionTitle>
          <BudgetItemForm />
          {!hasAcum ? (
            <ActionForm action={addAcumAction} className="mt-4">
              <SubmitButton variant="ghost" size="sm">
                להוסיף אקו״ם (כ-{Math.ceil(ACUM_FAMILY_EVENT_2026)} ₪)
              </SubmitButton>
            </ActionForm>
          ) : null}
        </Card>

        <Card>
          <SectionTitle>מחירי ייחוס (אינדיקטיבי, 2026)</SectionTitle>
          <p className="mb-3 text-sm text-muted">אלה טווחי שוק ולא הצעות. בקשו לפחות 3 הצעות כתובות לאותו תאריך ולאותה כמות אורחים, ושאלו אם המחיר לפני או אחרי מע״מ (18%). במיקרו חתונה המחיר לצלחת נוטה להיות גבוה יותר בגלל מינימום של המקום.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-96 text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-1 text-start font-normal">סוג מקום</th>
                  <th className="pb-1 text-end font-normal">מרכז (לצלחת)</th>
                  <th className="pb-1 text-end font-normal">פריפריה (לצלחת)</th>
                </tr>
              </thead>
              <tbody>
                {PER_PLATE_BANDS.map((b) => (
                  <tr key={b.type} className="border-t border-line">
                    <td className="py-1.5">{b.type}</td>
                    <td className="py-1.5 text-end tabular-nums"><bdi>{b.central[0]}–{b.central[1]} ₪</bdi></td>
                    <td className="py-1.5 text-end tabular-nums"><bdi>{b.periphery[0]}–{b.periphery[1]} ₪</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted">
            <li>אקו״ם, אירוע משפחתי (2026): <bdi>{ACUM_FAMILY_EVENT_2026.toFixed(2)} ₪</bdi> כולל מע״מ, חובה לשלם 72 שעות לפני.</li>
            <li>אגרת רישום ברבנות (2026): <bdi>{RABBINATE_FEE_2026} ₪</bdi>, מתעדכנת בינואר. 40% הנחה לזכאים.</li>
            <li>המחיר לצלחת לרוב לא כולל: עמדת DJ, חניה, עיצוב ופרחים, תוספות ושבת.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
