import type { CostType, DecisionStatus } from "@/db/schema";
import { addDays, daysBetween } from "@/lib/format";

/* Pure decision logic: weighted multi-rater scoring, disagreement detection, due dates. */

export type OptionLite = { id: string; name: string; costAmount: number | null; costType: CostType; rejected: boolean };
export type CriterionLite = { id: string; name: string; weight: number };
export type ScoreLite = { optionId: string; criterionId: string; userId: string; score: number };

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;
export const SCORE_LABEL: Record<number, string> = { 1: "בכלל לא", 2: "פחות", 3: "בסדר", 4: "טוב", 5: "מעולה" };

export type OptionResult = {
  optionId: string;
  /** 0–100, mean of the raters' totals; null when nobody scored this option. */
  total: number | null;
  byMember: Record<string, number | null>;
  /** Share of (criterion × rater) cells that have a score. */
  coverage: number;
};

export type Disagreement = {
  optionId: string;
  criterionId: string;
  spread: number;
  scores: { userId: string; score: number }[];
};

export type DecisionAnalysis = {
  results: OptionResult[];
  /** Option ids, best first, rejected options excluded. */
  ranking: string[];
  leaderId: string | null;
  /** Points between #1 and #2 (null when fewer than two scored options). */
  margin: number | null;
  disagreements: Disagreement[];
  /** Raters whose combined totals differ by 20+ points for an option. */
  splitOptionIds: string[];
  completeness: number;
};

const to100 = (avg1to5: number) => ((avg1to5 - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;

function memberTotal(optionId: string, criteria: readonly CriterionLite[], byKey: Map<string, number>, userId: string): number | null {
  let weighted = 0;
  let weights = 0;
  for (const c of criteria) {
    const s = byKey.get(`${optionId}|${c.id}|${userId}`);
    if (s === undefined) continue;
    weighted += c.weight * s;
    weights += c.weight;
  }
  return weights === 0 ? null : to100(weighted / weights);
}

export function analyzeDecision(
  options: readonly OptionLite[],
  criteria: readonly CriterionLite[],
  scores: readonly ScoreLite[],
  memberIds: readonly string[],
): DecisionAnalysis {
  const byKey = new Map<string, number>();
  for (const s of scores) byKey.set(`${s.optionId}|${s.criterionId}|${s.userId}`, s.score);

  const results: OptionResult[] = options.map((o) => {
    const byMember: Record<string, number | null> = {};
    const totals: number[] = [];
    let filled = 0;
    for (const m of memberIds) {
      const t = memberTotal(o.id, criteria, byKey, m);
      byMember[m] = t === null ? null : round1(t);
      if (t !== null) totals.push(t);
      for (const c of criteria) if (byKey.has(`${o.id}|${c.id}|${m}`)) filled += 1;
    }
    const cells = criteria.length * memberIds.length;
    return {
      optionId: o.id,
      total: totals.length ? round1(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
      byMember,
      coverage: cells ? filled / cells : 0,
    };
  });

  const live = options.filter((o) => !o.rejected);
  const ranking = live
    .map((o) => ({ id: o.id, total: results.find((r) => r.optionId === o.id)?.total ?? null }))
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1))
    .map((x) => x.id);

  const totalOf = (id: string) => results.find((r) => r.optionId === id)?.total ?? null;
  const first = ranking[0];
  const second = ranking[1];
  const leaderId = first !== undefined && totalOf(first) !== null ? first : null;
  const margin =
    first !== undefined && second !== undefined && totalOf(first) !== null && totalOf(second) !== null
      ? round1((totalOf(first) as number) - (totalOf(second) as number))
      : null;

  const disagreements: Disagreement[] = [];
  for (const o of live) {
    for (const c of criteria) {
      const entries = memberIds
        .map((m) => ({ userId: m, score: byKey.get(`${o.id}|${c.id}|${m}`) }))
        .filter((e): e is { userId: string; score: number } => e.score !== undefined);
      if (entries.length < 2) continue;
      const spread = Math.max(...entries.map((e) => e.score)) - Math.min(...entries.map((e) => e.score));
      if (spread >= 2) disagreements.push({ optionId: o.id, criterionId: c.id, spread, scores: entries });
    }
  }
  const weightOf = new Map(criteria.map((c) => [c.id, c.weight] as const));
  disagreements.sort((a, b) => b.spread - a.spread || (weightOf.get(b.criterionId) ?? 0) - (weightOf.get(a.criterionId) ?? 0));

  const splitOptionIds = results
    .filter((r) => {
      const vals = Object.values(r.byMember).filter((v): v is number => v !== null);
      return vals.length >= 2 && Math.max(...vals) - Math.min(...vals) >= 20;
    })
    .map((r) => r.optionId);

  const cells = options.length * criteria.length * memberIds.length;
  const filled = results.reduce((acc, r) => acc + r.coverage * (criteria.length * memberIds.length), 0);

  return { results, ranking, leaderId, margin, disagreements, splitOptionIds, completeness: cells ? filled / cells : 0 };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Cost of an option for the current headcount. */
export function optionCost(option: Pick<OptionLite, "costAmount" | "costType">, headcount: number): number | null {
  if (option.costAmount == null) return null;
  return option.costType === "per_guest" ? option.costAmount * Math.max(headcount, 0) : option.costAmount;
}

/* ───────── due dates & status ───────── */

export function decisionDue(
  d: { dueDate: string | null; dueOffsetDays: number | null },
  weddingDate: string | null,
): string | null {
  if (d.dueDate) return d.dueDate;
  if (weddingDate && d.dueOffsetDays != null) return addDays(weddingDate, -d.dueOffsetDays);
  return null;
}

export type DueState = "overdue" | "soon" | "later" | "none";

export function dueState(due: string | null, today: string, soonDays = 14): DueState {
  if (!due) return "none";
  const diff = daysBetween(today, due);
  if (diff < 0) return "overdue";
  return diff <= soonDays ? "soon" : "later";
}

export const STATUS_LABEL: Record<DecisionStatus, string> = {
  open: "פתוחה",
  researching: "בבדיקה",
  decided: "הוחלט",
  parked: "בהמתנה",
};

export const STATUS_ORDER: DecisionStatus[] = ["open", "researching", "parked", "decided"];

export const DECISION_CATEGORIES: Record<string, string> = {
  date: "תאריך ומקום",
  venue: "מקום ואוכל",
  ceremony: "טקס ורישום",
  vendors: "ספקים",
  attire: "לבוש ויופי",
  guests: "אורחים",
  design: "עיצוב והזמנות",
  other: "אחר",
};
