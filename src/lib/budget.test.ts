import { describe, expect, it } from "vitest";
import { budgetHeadcount, itemAmounts, perPlate, suggestAllocation, summarizeBudget, type BudgetItemLite } from "./budget";

const item = (o: Partial<BudgetItemLite>): BudgetItemLite => ({
  id: Math.random().toString(36),
  category: "venue_catering",
  title: "x",
  plannedAmount: 0,
  perGuest: false,
  actualAmount: null,
  paidAmount: 0,
  ...o,
});

describe("itemAmounts", () => {
  it("uses the real quote over the estimate and tracks unpaid", () => {
    const a = itemAmounts(item({ plannedAmount: 10000, actualAmount: 12000, paidAmount: 3000 }), 40);
    expect(a).toEqual({ planned: 10000, actual: 12000, effective: 12000, paid: 3000, unpaid: 9000 });
  });

  it("multiplies per-guest prices by headcount (estimate and quote)", () => {
    const a = itemAmounts(item({ perGuest: true, plannedAmount: 300, actualAmount: 350 }), 40);
    expect(a.planned).toBe(12000);
    expect(a.effective).toBe(14000);
  });

  it("never reports negative unpaid when overpaid", () => {
    expect(itemAmounts(item({ plannedAmount: 100, paidAmount: 150 }), 1).unpaid).toBe(0);
  });
});

describe("summarizeBudget", () => {
  const items = [
    item({ category: "venue_catering", perGuest: true, plannedAmount: 300 }), // 40 × 300 = 12000
    item({ category: "photo_video", plannedAmount: 8000, actualAmount: 9000, paidAmount: 2000 }),
    item({ category: "music", plannedAmount: 396 }),
  ];

  it("totals, headroom and category order", () => {
    const s = summarizeBudget(items, 40, 30000);
    expect(s.planned).toBe(12000 + 8000 + 396);
    expect(s.effective).toBe(12000 + 9000 + 396);
    expect(s.paid).toBe(2000);
    expect(s.unpaid).toBe(12000 + 7000 + 396);
    expect(s.headroom).toBe(30000 - 21396);
    expect(s.overBudget).toBe(false);
    expect(s.categories.map((c) => c.key)).toEqual(["venue_catering", "photo_video", "music"]);
  });

  it("flags over budget", () => {
    expect(summarizeBudget(items, 40, 20000).overBudget).toBe(true);
    expect(summarizeBudget(items, 40, null).headroom).toBeNull();
  });
});

describe("helpers", () => {
  it("allocation sums exactly to the total", () => {
    for (const total of [50000, 87500, 123456, 30000]) {
      const rows = suggestAllocation(total);
      expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(total);
      expect(rows.find((r) => r.key === "venue_catering")!.amount).toBeGreaterThan(total * 0.5);
    }
  });
  it("prices per-guest items at the cap while the list is empty", () => {
    expect(budgetHeadcount(0, 40)).toBe(40);
    expect(budgetHeadcount(28, 40)).toBe(28);
  });
  it("derives a per-plate figure", () => {
    expect(perPlate(14000, 40)).toBe(350);
    expect(perPlate(14000, 0)).toBeNull();
  });
});
