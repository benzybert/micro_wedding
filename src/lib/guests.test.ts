import { describe, expect, it } from "vitest";
import {
  autoSeat,
  bySide,
  capacityByTier,
  committedSeats,
  dietSummary,
  headcount,
  householdStatus,
  parseMemberLines,
  renderTemplate,
  suggestWave,
  tableFill,
  unseated,
  type GuestLite,
  type HouseholdLite,
} from "./guests";

const invited = new Date("2026-01-01");
let n = 0;
const hh = (tier: HouseholdLite["tier"], invitedAt: Date | null = null, side: HouseholdLite["side"] = "both"): HouseholdLite => ({
  id: `h${++n}`,
  tier,
  side,
  invitedAt,
  createdAt: n,
});
const gs = (householdId: string, count: number, attending: GuestLite["attending"] = "pending"): GuestLite[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${householdId}-g${i}`, householdId, attending }));

describe("headcount & householdStatus", () => {
  it("counts yes/pending/no and children, expected excludes declines", () => {
    const guests: GuestLite[] = [
      { id: "1", householdId: "a", attending: "yes" },
      { id: "2", householdId: "a", attending: "no", isChild: true },
      { id: "3", householdId: "b", attending: "pending", isChild: true },
    ];
    expect(headcount(guests)).toEqual({ yes: 1, pending: 1, no: 1, total: 3, children: 1, expected: 2 });
  });

  it("derives a household status", () => {
    const h = { invitedAt: null };
    expect(householdStatus(h, gs("x", 2))).toBe("not_invited");
    expect(householdStatus({ invitedAt: invited }, gs("x", 2))).toBe("waiting");
    expect(householdStatus({ invitedAt: invited }, gs("x", 2, "yes"))).toBe("yes");
    expect(householdStatus({ invitedAt: invited }, gs("x", 2, "no"))).toBe("no");
    expect(householdStatus({ invitedAt: invited }, [...gs("x", 1, "yes"), ...gs("y", 1, "no")])).toBe("partial");
    expect(householdStatus({ invitedAt: invited }, [...gs("x", 1, "yes"), ...gs("y", 1, "pending")])).toBe("partial");
  });
});

describe("capacityByTier (the cut line)", () => {
  it("finds the last tier that fits under the cap", () => {
    const a = hh("must");
    const b = hh("want");
    const c = hh("maybe");
    const guests = [...gs(a.id, 20), ...gs(b.id, 15), ...gs(c.id, 10)];
    const r = capacityByTier([a, b, c], guests, 40);
    expect(r.rows.map((x) => x.cumulative)).toEqual([20, 35, 45]);
    expect(r.rows.map((x) => x.fits)).toEqual([true, true, false]);
    expect(r.cutTier).toBe("want");
    expect(r.overBy).toBe(5);
  });

  it("ignores declined guests", () => {
    const a = hh("must");
    const guests = [...gs(a.id, 3), ...gs(a.id, 2, "no").map((g, i) => ({ ...g, id: `n${i}` }))];
    expect(capacityByTier([a], guests, 10).rows[0]?.seats).toBe(3);
  });

  it("returns no cut tier when even the A-list is over the cap", () => {
    const a = hh("must");
    const r = capacityByTier([a], gs(a.id, 12), 10);
    expect(r.cutTier).toBeNull();
    expect(r.overBy).toBe(2);
  });
});

describe("suggestWave (who can we invite now)", () => {
  it("counts invited + not-yet-invited A-list as committed", () => {
    const a1 = hh("must", invited);
    const a2 = hh("must"); // not invited yet but definitely coming
    const b = hh("want");
    const guests = [...gs(a1.id, 10), ...gs(a2.id, 5), ...gs(b.id, 2)];
    expect(committedSeats([a1, a2, b], guests)).toBe(15);
  });

  it("fills freed seats with B before C, skipping households that do not fit", () => {
    const a = hh("must", invited);
    const b1 = hh("want");
    const b2 = hh("want");
    const b3 = hh("want");
    const c1 = hh("maybe");
    const guests = [
      ...gs(a.id, 8),
      ...gs(a.id, 2, "no").map((g, i) => ({ ...g, id: `dec${i}` })), // two declined → two seats freed
      ...gs(b1.id, 4), // too big for 4 free? cap 12, committed 8 → free 4 → fits exactly
      ...gs(b2.id, 2),
      ...gs(b3.id, 1),
      ...gs(c1.id, 1),
    ];
    const r = suggestWave([a, b1, b2, b3, c1], guests, 12);
    expect(r.freeSeats).toBe(4);
    // b1 (4) takes all free seats; nothing left for b2/b3/c1
    expect(r.suggestions.map((s) => s.householdId)).toEqual([b1.id]);

    const r2 = suggestWave([a, b1, b2, b3, c1], guests, 11); // free 3 → b1 (4) skipped, b2 (2) fits, b3 (1) fits
    expect(r2.suggestions.map((s) => s.householdId)).toEqual([b2.id, b3.id]);
  });

  it("never suggests anything when the room is full", () => {
    const a = hh("must", invited);
    const b = hh("want");
    expect(suggestWave([a, b], [...gs(a.id, 10), ...gs(b.id, 1)], 10).suggestions).toEqual([]);
  });
});

describe("sides, diets, seating", () => {
  it("counts seats per side without declines", () => {
    const x = hh("must", invited, "a");
    const y = hh("must", invited, "b");
    const guests = [...gs(x.id, 3), ...gs(y.id, 2), ...gs(y.id, 1, "no").map((g) => ({ ...g, id: "z" }))];
    expect(bySide([x, y], guests)).toEqual({ a: 3, b: 2, both: 0 });
  });

  it("summarises diets and allergies for the caterer", () => {
    const guests: GuestLite[] = [
      { id: "1", householdId: "a", attending: "yes", diet: "vegan", name: "דנה" },
      { id: "2", householdId: "a", attending: "pending", diet: "regular", allergies: "בוטנים", name: "רן" },
      { id: "3", householdId: "a", attending: "no", diet: "vegetarian", name: "לא מגיע" },
    ];
    const d = dietSummary(guests);
    expect(d.counts).toEqual({ regular: 1, vegetarian: 0, vegan: 1, gluten_free: 0 });
    expect(d.allergies).toEqual([{ name: "רן", allergy: "בוטנים" }]);
  });

  it("computes table fill and unseated guests", () => {
    const guests: GuestLite[] = [
      { id: "1", householdId: "a", attending: "yes", tableId: "t1" },
      { id: "2", householdId: "a", attending: "yes", tableId: "t1" },
      { id: "3", householdId: "a", attending: "yes" },
      { id: "4", householdId: "a", attending: "no" },
    ];
    const fill = tableFill([{ id: "t1", name: "שולחן 1", capacity: 2 }], guests);
    expect(fill[0]).toMatchObject({ seated: 2, free: 0, over: false });
    expect(unseated(guests).map((g) => g.id)).toEqual(["3"]);
  });
});

describe("renderTemplate", () => {
  it("fills placeholders and blanks unknown ones", () => {
    expect(renderTemplate("שלום {שם}, {קישור}{לא-קיים}!", { שם: "דנה", קישור: "https://x" })).toBe("שלום דנה, https://x!");
  });
});

describe("autoSeat", () => {
  const tables = [
    { id: "t1", name: "1", capacity: 4 },
    { id: "t2", name: "2", capacity: 4 },
  ];
  const mk = (id: string, side: HouseholdLite["side"] = "both") => ({ id, side });

  it("keeps households together and groups by side", () => {
    const hhs = [mk("b1", "b"), mk("a1", "a"), mk("a2", "a")];
    const guests = [...gs("a1", 2), ...gs("a2", 2), ...gs("b1", 3)];
    const { assignments, unplaced } = autoSeat(tables, hhs, guests);
    expect(unplaced).toEqual([]);
    const tableOf = (hid: string) => new Set(assignments.filter((a) => a.guestId.startsWith(`${hid}-`)).map((a) => a.tableId));
    expect(tableOf("a1").size).toBe(1);
    expect(tableOf("a2").size).toBe(1);
    expect(tableOf("b1").size).toBe(1);
    expect([...tableOf("a1")][0]).toBe([...tableOf("a2")][0]); // both A families share t1 (2+2=4)
    expect([...tableOf("b1")][0]).toBe("t2");
  });

  it("skips declined guests, respects existing seats and reports overflow", () => {
    const hhs = [mk("x"), mk("y")];
    const guests: GuestLite[] = [
      ...gs("x", 3),
      { id: "x-dec", householdId: "x", attending: "no" },
      { id: "y-seated", householdId: "y", attending: "yes", tableId: "t1" },
      ...gs("y", 6).map((g, i) => ({ ...g, id: `y-new${i}` })),
    ];
    const { assignments, unplaced } = autoSeat(tables, hhs, guests);
    expect(assignments.some((a) => a.guestId === "x-dec")).toBe(false);
    // capacity: t1 has 3 free (one taken), t2 has 4 → 7 free, 9 to place → 2 unplaced
    expect(assignments.length).toBe(7);
    expect(unplaced.length).toBe(2);
    const perTable = (id: string) => assignments.filter((a) => a.tableId === id).length;
    expect(perTable("t1")).toBeLessThanOrEqual(3);
    expect(perTable("t2")).toBeLessThanOrEqual(4);
  });
});

describe("parseMemberLines", () => {
  it("parses names, bullets and child markers", () => {
    expect(parseMemberLines("דנה כהן\n- יוסי כהן (ילד)\nילדה: מאיה\n\n  • רן  ")).toEqual([
      { name: "דנה כהן", isChild: false },
      { name: "יוסי כהן", isChild: true },
      { name: "מאיה", isChild: true },
      { name: "רן", isChild: false },
    ]);
  });
  it("caps at 30 members", () => {
    expect(parseMemberLines(Array.from({ length: 40 }, (_, i) => `אורח ${i}`).join("\n"))).toHaveLength(30);
  });
});
