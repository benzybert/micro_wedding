// Budget maths. All amounts are NIS including VAT, except a venue per-plate price
// the couple marks as "before VAT" (halls quote both ways, so we ask).

import {
  ACUM,
  BUDGET_LINES,
  RABBINATE,
  VAT_RATE,
  VENUE_SHARE,
  type BudgetLineDef,
  type BudgetLineKey,
} from "@/config/benchmarks";
import type { BudgetState, Route } from "./state";

export interface VenueCalc {
  /** Plates the hall bills: the larger of the headcount and its minimum. */
  chargedPlates: number;
  /** Plates paid for that nobody sits at, because of the hall's minimum. */
  emptyPlates: number;
  perPlateGross: number;
  /** VAT added on top of each plate when the quote was before VAT. */
  vatPerPlate: number;
  platesTotal: number;
  extras: number;
  total: number;
}

export function venueCalc(venue: BudgetState["venue"], headcount: number): VenueCalc {
  const perPlate = venue.perPlate ?? 0;
  const minPlates = venue.minPlates ?? 0;
  const chargedPlates = Math.max(headcount, minPlates);
  const perPlateGross = venue.includesVat ? perPlate : perPlate * (1 + VAT_RATE);
  const vatPerPlate = venue.includesVat ? 0 : perPlate * VAT_RATE;
  const platesTotal = chargedPlates * perPlateGross;
  const extras = venue.extras ?? 0;
  return {
    chargedPlates,
    emptyPlates: Math.max(0, chargedPlates - headcount),
    perPlateGross,
    vatPerPlate,
    platesTotal,
    extras,
    total: platesTotal + extras,
  };
}

export function registrationFee(route: Route, discount40: boolean): number {
  if (route !== "rabbinate") return 0;
  return round2(discount40 ? RABBINATE.fee * (1 - RABBINATE.discountRate) : RABBINATE.fee);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BudgetRow {
  key: string;
  label: string;
  planned: number;
  actual: number | null;
  /** What counts toward the total: the actual if known, otherwise the plan. */
  amount: number;
  /** Computed by the app, not typed by the couple. */
  auto: boolean;
  /** Percent of the total amount. */
  share: number;
  def?: BudgetLineDef;
}

export interface BudgetSummary {
  rows: BudgetRow[];
  venue: VenueCalc;
  planned: number;
  amount: number;
  total: number | null;
  remaining: number | null;
  over: boolean;
  perGuest: number | null;
}

export interface BudgetContext {
  headcount: number;
  route: Route;
  discount40: boolean;
}

export function summarizeBudget(budget: BudgetState, ctx: BudgetContext): BudgetSummary {
  const venue = venueCalc(budget.venue, ctx.headcount);
  const rows: BudgetRow[] = [];

  rows.push({
    key: "venue",
    label: "מקום ואוכל",
    planned: round2(venue.total),
    actual: budget.venue.actual,
    amount: budget.venue.actual ?? round2(venue.total),
    auto: true,
    share: 0,
  });

  for (const def of BUDGET_LINES) {
    if (def.key === "civil_route" && ctx.route === "rabbinate") continue;
    const v = budget.lines[def.key];
    const planned = v?.planned ?? 0;
    rows.push({
      key: def.key,
      label: def.label,
      planned,
      actual: v?.actual ?? null,
      amount: v?.actual ?? planned,
      auto: false,
      share: 0,
      def,
    });
  }

  const fee = registrationFee(ctx.route, ctx.discount40);
  if (ctx.route === "rabbinate") {
    rows.push({ key: "rabbinate", label: "אגרת רישום ברבנות", planned: fee, actual: null, amount: fee, auto: true, share: 0 });
  }
  rows.push({ key: "acum", label: "רישיון אקו״ם", planned: ACUM.fee, actual: null, amount: ACUM.fee, auto: true, share: 0 });

  const planned = round2(rows.reduce((s, r) => s + r.planned, 0));
  const amount = round2(rows.reduce((s, r) => s + r.amount, 0));
  for (const r of rows) r.share = amount > 0 ? Math.round((r.amount / amount) * 1000) / 10 : 0;

  const total = budget.total;
  return {
    rows,
    venue,
    planned,
    amount,
    total,
    remaining: total === null ? null : round2(total - amount),
    over: total !== null && amount > total,
    perGuest: ctx.headcount > 0 ? Math.round(amount / ctx.headcount) : null,
  };
}

export interface Allocation {
  /** Amount to spend on the venue, to compare with its quote. */
  venue: number;
  /** What the venue budget allows per plate (incl. VAT), or null without a headcount. */
  venuePerPlate: number | null;
  /** Fixed statutory costs that were taken off the top. */
  fixed: number;
  lines: Partial<Record<BudgetLineKey, number>>;
}

/** Splits a total by the guide's indicative shares, in rounded hundreds. */
export function suggestAllocation(total: number, ctx: BudgetContext): Allocation {
  const fixed = round2(registrationFee(ctx.route, ctx.discount40) + ACUM.fee);
  const spendable = Math.max(0, total - fixed);
  const hundred = (n: number) => Math.round(n / 100) * 100;
  const lines: Partial<Record<BudgetLineKey, number>> = {};
  for (const def of BUDGET_LINES) {
    if (def.share === 0) continue;
    lines[def.key] = hundred((spendable * def.share) / 100);
  }
  const venue = hundred((spendable * VENUE_SHARE) / 100);
  return {
    venue,
    venuePerPlate: ctx.headcount > 0 ? Math.round(venue / ctx.headcount) : null,
    fixed,
    lines,
  };
}
