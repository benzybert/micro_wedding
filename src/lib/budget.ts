import { BUDGET_CATEGORIES } from "@/data/budget";

/* Pure budget math. All amounts are whole ₪. Per-guest items multiply by the headcount. */

export type BudgetItemLite = {
  id: string;
  category: string;
  title: string;
  plannedAmount: number;
  perGuest: boolean;
  actualAmount: number | null;
  paidAmount: number;
  dueDate?: string | null;
};

export type ItemAmounts = { planned: number; actual: number | null; effective: number; paid: number; unpaid: number };

export function itemAmounts(item: BudgetItemLite, headcount: number): ItemAmounts {
  const mult = item.perGuest ? Math.max(headcount, 0) : 1;
  const planned = item.plannedAmount * mult;
  const actual = item.actualAmount == null ? null : item.actualAmount * mult;
  const effective = actual ?? planned;
  return { planned, actual, effective, paid: item.paidAmount, unpaid: Math.max(effective - item.paidAmount, 0) };
}

export type CategorySummary = { key: string; planned: number; effective: number; paid: number; unpaid: number; items: number };

export type BudgetSummary = {
  planned: number;
  effective: number;
  paid: number;
  unpaid: number;
  /** total budget − effective spend (null when no total set). Negative = over budget. */
  headroom: number | null;
  overBudget: boolean;
  categories: CategorySummary[];
};

export function summarizeBudget(items: readonly BudgetItemLite[], headcount: number, total: number | null): BudgetSummary {
  const byCat = new Map<string, CategorySummary>();
  let planned = 0;
  let effective = 0;
  let paid = 0;
  let unpaid = 0;
  for (const it of items) {
    const a = itemAmounts(it, headcount);
    planned += a.planned;
    effective += a.effective;
    paid += a.paid;
    unpaid += a.unpaid;
    const c = byCat.get(it.category) ?? { key: it.category, planned: 0, effective: 0, paid: 0, unpaid: 0, items: 0 };
    c.planned += a.planned;
    c.effective += a.effective;
    c.paid += a.paid;
    c.unpaid += a.unpaid;
    c.items += 1;
    byCat.set(it.category, c);
  }
  const order = BUDGET_CATEGORIES.map((c) => c.key);
  const categories = [...byCat.values()].sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const headroom = total == null ? null : total - effective;
  return { planned, effective, paid, unpaid, headroom, overBudget: headroom !== null && headroom < 0, categories };
}

/** Seats to price per-guest items at: expected guests, or the cap when the list is still empty. */
export function budgetHeadcount(expected: number, cap: number): number {
  return expected > 0 ? expected : cap;
}

/** Split a total budget across the standard categories; the rounding remainder goes to venue & food. */
export function suggestAllocation(total: number): { key: string; amount: number }[] {
  const rows = BUDGET_CATEGORIES.map((c) => ({ key: c.key, amount: Math.round((total * c.share) / 100) * 100 }));
  const diff = total - rows.reduce((s, r) => s + r.amount, 0);
  const venue = rows.find((r) => r.key === "venue_catering");
  if (venue) venue.amount += diff;
  return rows;
}

/** Per-plate price implied by a total food budget and a headcount. */
export function perPlate(foodBudget: number, headcount: number): number | null {
  return headcount > 0 ? Math.round(foodBudget / headcount) : null;
}
