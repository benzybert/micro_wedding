import { describe, expect, it } from "vitest";
import { analyzeDecision, decisionDue, dueState, optionCost, type CriterionLite, type OptionLite, type ScoreLite } from "./decisions";

const opt = (id: string, extra: Partial<OptionLite> = {}): OptionLite => ({ id, name: id, costAmount: null, costType: "total", rejected: false, ...extra });
const crit: CriterionLite[] = [
  { id: "price", name: "מחיר", weight: 5 },
  { id: "vibe", name: "אווירה", weight: 3 },
];
const s = (optionId: string, criterionId: string, userId: string, score: number): ScoreLite => ({ optionId, criterionId, userId, score });

describe("analyzeDecision", () => {
  it("ranks by weighted score averaged over both partners (1→0, 5→100)", () => {
    const options = [opt("garden"), opt("restaurant")];
    const scores = [
      // garden: both rate price 5 (w5), vibe 5 (w3) → 100
      s("garden", "price", "a", 5), s("garden", "vibe", "a", 5), s("garden", "price", "b", 5), s("garden", "vibe", "b", 5),
      // restaurant: a: price 3, vibe 3 → 50 ; b: price 1, vibe 1 → 0  → mean 25
      s("restaurant", "price", "a", 3), s("restaurant", "vibe", "a", 3), s("restaurant", "price", "b", 1), s("restaurant", "vibe", "b", 1),
    ];
    const r = analyzeDecision(options, crit, scores, ["a", "b"]);
    expect(r.ranking).toEqual(["garden", "restaurant"]);
    expect(r.results[0]?.total).toBe(100);
    expect(r.results[1]?.total).toBe(25);
    expect(r.margin).toBe(75);
    expect(r.leaderId).toBe("garden");
    expect(r.completeness).toBe(1);
  });

  it("weights criteria: a heavy criterion outweighs a light one", () => {
    // price w5: option X scores 5; vibe w3: option X scores 1 → (5*5+3*1)/8=3.5 → 62.5
    const r = analyzeDecision([opt("x")], crit, [s("x", "price", "a", 5), s("x", "vibe", "a", 1)], ["a"]);
    expect(r.results[0]?.total).toBe(62.5);
  });

  it("works with a single rater and ignores unscored criteria", () => {
    const r = analyzeDecision([opt("x")], crit, [s("x", "price", "a", 4)], ["a", "b"]);
    expect(r.results[0]?.total).toBe(75);
    expect(r.results[0]?.byMember).toEqual({ a: 75, b: null });
    expect(r.results[0]?.coverage).toBeCloseTo(1 / 4);
  });

  it("returns null totals and no leader when nobody scored", () => {
    const r = analyzeDecision([opt("x"), opt("y")], crit, [], ["a", "b"]);
    expect(r.leaderId).toBeNull();
    expect(r.margin).toBeNull();
    expect(r.results.every((x) => x.total === null)).toBe(true);
  });

  it("excludes rejected options from the ranking but still scores them", () => {
    const options = [opt("a1", { rejected: true }), opt("b1")];
    const scores = [s("a1", "price", "a", 5), s("b1", "price", "a", 2)];
    const r = analyzeDecision(options, crit, scores, ["a"]);
    expect(r.ranking).toEqual(["b1"]);
    expect(r.results.find((x) => x.optionId === "a1")?.total).toBe(100);
  });

  it("surfaces disagreements of 2+ points, biggest and heaviest first", () => {
    const scores = [
      s("x", "price", "a", 5), s("x", "price", "b", 1), // spread 4
      s("x", "vibe", "a", 4), s("x", "vibe", "b", 2),   // spread 2
    ];
    const r = analyzeDecision([opt("x")], crit, scores, ["a", "b"]);
    expect(r.disagreements.map((d) => [d.criterionId, d.spread])).toEqual([["price", 4], ["vibe", 2]]);
  });

  it("does not flag a spread of 1", () => {
    const r = analyzeDecision([opt("x")], crit, [s("x", "price", "a", 4), s("x", "price", "b", 3)], ["a", "b"]);
    expect(r.disagreements).toEqual([]);
  });

  it("flags an option the partners rate 20+ points apart overall", () => {
    const r = analyzeDecision([opt("x")], crit, [s("x", "price", "a", 5), s("x", "price", "b", 2)], ["a", "b"]);
    expect(r.splitOptionIds).toEqual(["x"]);
  });
});

describe("optionCost", () => {
  it("multiplies per-guest prices by headcount", () => {
    expect(optionCost({ costAmount: 350, costType: "per_guest" }, 40)).toBe(14000);
    expect(optionCost({ costAmount: 9000, costType: "total" }, 40)).toBe(9000);
    expect(optionCost({ costAmount: null, costType: "total" }, 40)).toBeNull();
  });
});

describe("due dates", () => {
  it("prefers an explicit date, else wedding date minus offset", () => {
    expect(decisionDue({ dueDate: "2026-12-01", dueOffsetDays: 90 }, "2027-03-01")).toBe("2026-12-01");
    expect(decisionDue({ dueDate: null, dueOffsetDays: 90 }, "2027-03-01")).toBe("2026-12-01");
    expect(decisionDue({ dueDate: null, dueOffsetDays: 90 }, null)).toBeNull();
    expect(decisionDue({ dueDate: null, dueOffsetDays: null }, "2027-03-01")).toBeNull();
  });

  it("classifies urgency", () => {
    expect(dueState(null, "2026-10-22")).toBe("none");
    expect(dueState("2026-10-21", "2026-10-22")).toBe("overdue");
    expect(dueState("2026-10-22", "2026-10-22")).toBe("soon");
    expect(dueState("2026-11-05", "2026-10-22")).toBe("soon");
    expect(dueState("2026-11-06", "2026-10-22")).toBe("later");
  });
});
