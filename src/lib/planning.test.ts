import { describe, expect, it } from "vitest";
import { ACUM, RABBINATE } from "@/config/benchmarks";
import { registrationFee, suggestAllocation, summarizeBudget, venueCalc } from "./budget";
import { planningHeadcount, summarizeGuests } from "./guests";
import { buildAlerts } from "./insights";
import { defaultState, normalizeState, type AppState, type Guest, type Vendor } from "./state";
import { buildTimeline } from "./timeline";
import { quoteWithVat, summarizeVendors } from "./vendors";

const guest = (over: Partial<Guest>): Guest => ({
  id: Math.random().toString(36),
  name: "x",
  group: "friends",
  side: "both",
  partySize: 1,
  rsvp: "pending",
  diet: "none",
  note: "",
  ...over,
});

const vendor = (over: Partial<Vendor>): Vendor => ({
  id: Math.random().toString(36),
  category: "venue",
  name: "v",
  phone: "",
  status: "quoted",
  quote: null,
  quoteIncludesVat: true,
  deposit: null,
  contractSigned: false,
  note: "",
  ...over,
});

describe("venue maths", () => {
  it("adds 18% VAT to a per-plate price quoted before VAT", () => {
    const calc = venueCalc({ type: "mid", perPlate: 300, includesVat: false, minPlates: null, extras: null, actual: null }, 40);
    expect(calc.perPlateGross).toBeCloseTo(354, 5);
    expect(calc.platesTotal).toBeCloseTo(14160, 5);
  });

  it("keeps the price as is when it already includes VAT", () => {
    const calc = venueCalc({ type: "mid", perPlate: 300, includesVat: true, minPlates: null, extras: 500, actual: null }, 40);
    expect(calc.total).toBe(12500);
    expect(calc.vatPerPlate).toBe(0);
  });

  it("bills the hall's minimum when the party is smaller", () => {
    const calc = venueCalc({ type: "other", perPlate: 400, includesVat: true, minPlates: 50, extras: null, actual: null }, 30);
    expect(calc.chargedPlates).toBe(50);
    expect(calc.emptyPlates).toBe(20);
    expect(calc.total).toBe(20000);
  });
});

describe("budget summary", () => {
  const ctx = { headcount: 30, route: "rabbinate", discount40: false } as const;

  it("always includes the Rabbinate fee and the ACUM licence", () => {
    const s = summarizeBudget(defaultState().budget, ctx);
    expect(s.rows.find((r) => r.key === "rabbinate")?.amount).toBe(RABBINATE.fee);
    expect(s.rows.find((r) => r.key === "acum")?.amount).toBe(ACUM.fee);
    expect(s.amount).toBeCloseTo(RABBINATE.fee + ACUM.fee, 2);
  });

  it("applies the 40% discount to the Rabbinate fee only", () => {
    expect(registrationFee("rabbinate", true)).toBeCloseTo(506.4, 2);
    expect(registrationFee("cyprus", true)).toBe(0);
  });

  it("hides the civil-route line on the Rabbinate route, shows it otherwise", () => {
    const keys = (route: "rabbinate" | "cyprus") =>
      summarizeBudget(defaultState().budget, { ...ctx, route }).rows.map((r) => r.key);
    expect(keys("rabbinate")).not.toContain("civil_route");
    expect(keys("cyprus")).toContain("civil_route");
    expect(keys("cyprus")).not.toContain("rabbinate");
  });

  it("uses the actual amount over the plan and flags going over the total", () => {
    const b = defaultState().budget;
    b.total = 20000;
    b.lines.photo_video = { planned: 8000, actual: 12000 };
    b.venue = { type: "other", perPlate: 400, includesVat: true, minPlates: null, extras: null, actual: null };
    const s = summarizeBudget(b, ctx);
    expect(s.rows.find((r) => r.key === "photo_video")?.amount).toBe(12000);
    expect(s.over).toBe(true);
    expect(s.remaining).toBeLessThan(0);
    expect(s.perGuest).toBe(Math.round(s.amount / 30));
  });

  it("splits a total by the guide's shares and keeps the fixed costs off the top", () => {
    const a = suggestAllocation(60000, ctx);
    expect(a.fixed).toBeCloseTo(RABBINATE.fee + ACUM.fee, 2);
    const spent = (a.venue as number) + Object.values(a.lines).reduce((s, n) => s + (n ?? 0), 0);
    expect(Math.abs(spent + a.fixed - 60000)).toBeLessThan(1500); // rounding to hundreds
    expect(a.venuePerPlate).toBe(Math.round(a.venue / 30));
  });
});

describe("guest summary", () => {
  const list = [
    guest({ partySize: 2, rsvp: "yes", group: "closeFamily" }),
    guest({ partySize: 1, rsvp: "pending", group: "friends", diet: "vegan" }),
    guest({ partySize: 3, rsvp: "no", group: "colleagues" }),
  ];

  it("counts people, not parties, and leaves out those who declined", () => {
    const s = summarizeGuests(list);
    expect(s.parties).toBe(3);
    expect(s.invited).toBe(6);
    expect(s.confirmed).toBe(2);
    expect(s.pending).toBe(1);
    expect(s.declined).toBe(3);
    expect(s.headcount).toBe(3);
    expect(s.byGroup.colleagues).toBe(0);
    expect(s.byDiet.vegan).toBe(1);
  });

  it("estimates gifts from the group averages, for those who did not decline", () => {
    expect(summarizeGuests(list).estimatedGifts).toBe(2 * 750 + 1 * 400);
  });

  it("plans with the list when it exists and the rough target when it does not", () => {
    expect(planningHeadcount(summarizeGuests(list), 99)).toBe(3);
    expect(planningHeadcount(summarizeGuests([]), 40)).toBe(40);
    expect(planningHeadcount(summarizeGuests([]), null)).toBe(0);
  });
});

describe("vendors", () => {
  it("normalizes a quote to a VAT-inclusive price", () => {
    expect(quoteWithVat({ quote: 1000, quoteIncludesVat: false })).toBe(1180);
    expect(quoteWithVat({ quote: 1000, quoteIncludesVat: true })).toBe(1000);
    expect(quoteWithVat({ quote: null, quoteIncludesVat: true })).toBeNull();
  });

  it("asks for three quotes until something is booked, ignoring rejected ones", () => {
    const quoted = [
      vendor({ quote: 100 }),
      vendor({ quote: 90 }),
      vendor({ quote: 80, status: "rejected" }),
    ];
    const s = summarizeVendors(quoted);
    expect(s.categories[0].quotes).toBe(2);
    expect(s.categories[0].needsMoreQuotes).toBe(true);
    expect(s.categories[0].best?.quote).toBe(90);

    const withBooked = summarizeVendors([...quoted, vendor({ status: "booked", quote: 95, deposit: 20 })]);
    expect(withBooked.categories[0].needsMoreQuotes).toBe(false);
    expect(withBooked.bookedTotal).toBe(95);
    expect(withBooked.depositsPaid).toBe(20);
    expect(withBooked.bookedWithoutContract).toHaveLength(1);
  });
});

describe("timeline", () => {
  const base = (): AppState => {
    const s = defaultState();
    s.profile.weddingDate = "2027-02-09";
    return s;
  };

  it("is empty until a date is chosen", () => {
    expect(buildTimeline(defaultState().profile, {}, "2026-10-23")).toEqual([]);
  });

  it("puts the Rabbinate cut-off 45 days before the wedding", () => {
    const t = buildTimeline(base().profile, {}, "2026-10-23").find((x) => x.id === "rabbinate-open");
    expect(t?.latest).toBe("2026-12-26");
    expect(t?.due).toBe("2026-12-11");
  });

  it("leaves the Rabbinate steps out of a civil route and vice versa", () => {
    const civil = base();
    civil.profile.route = "cyprus";
    const ids = buildTimeline(civil.profile, {}, "2026-10-23").map((t) => t.id);
    expect(ids).not.toContain("rabbinate-open");
    expect(ids).toContain("cyprus-municipality");
    expect(ids).not.toContain("utah-officiant");
  });

  it("only adds conditional steps when they apply", () => {
    const s = base();
    const plain = buildTimeline(s.profile, {}, "2026-10-23").map((t) => t.id);
    expect(plain).not.toContain("berur");
    expect(plain).not.toContain("waiting-period");
    s.profile.needsBerur = true;
    s.profile.previouslyMarried = true;
    const ids = buildTimeline(s.profile, {}, "2026-10-23").map((t) => t.id);
    expect(ids).toContain("berur");
    expect(ids).toContain("waiting-period");
  });

  it("calls a squeezed soft step 'now', but a passed statutory cut-off 'missed'", () => {
    const s = base();
    const early = buildTimeline(s.profile, {}, "2026-10-23");
    expect(early.find((t) => t.id === "venue")?.status).toBe("now"); // 12 months out, only 109 days left
    expect(early.find((t) => t.id === "rabbinate-open")?.status).toBe("later");
    const late = buildTimeline(s.profile, {}, "2027-01-20");
    expect(late.find((t) => t.id === "rabbinate-open")?.status).toBe("missed");
    const done = buildTimeline(s.profile, { "task:rabbinate-open": true }, "2027-01-20");
    expect(done.find((t) => t.id === "rabbinate-open")?.status).toBe("done");
  });

  it("sets the ACUM cut-off 72 hours before", () => {
    const t = buildTimeline(base().profile, {}, "2026-10-23").find((x) => x.id === "acum");
    expect(t?.latest).toBe("2027-02-06");
  });

  it("orders by due date", () => {
    const dues = buildTimeline(base().profile, {}, "2026-10-23").map((t) => t.due);
    expect([...dues].sort()).toEqual(dues);
  });
});

describe("dashboard alerts", () => {
  const today = "2026-10-23";

  it("asks for a date first", () => {
    expect(buildAlerts(defaultState(), today).map((a) => a.id)).toContain("no-date");
  });

  it("flags a blocked date in red", () => {
    const s = defaultState();
    s.profile.weddingDate = "2026-11-28"; // a Saturday
    const a = buildAlerts(s, today).find((x) => x.id === "date-blocked");
    expect(a?.level).toBe("red");
  });

  it("warns as the Rabbinate cut-off approaches and again when it has passed", () => {
    const s = defaultState();
    s.profile.weddingDate = "2026-12-08"; // 46 days out: cut-off tomorrow
    expect(buildAlerts(s, today).find((a) => a.id === "rabbinate-soon")?.level).toBe("amber");
    s.profile.weddingDate = "2026-12-02"; // 40 days out
    expect(buildAlerts(s, today).find((a) => a.id === "rabbinate-late")?.level).toBe("red");
    s.done["task:rabbinate-open"] = true;
    expect(buildAlerts(s, today).map((a) => a.id)).not.toContain("rabbinate-late");
  });

  it("is red for a wedding inside the 90-day waiting period", () => {
    const s = defaultState();
    s.profile.weddingDate = "2027-02-09";
    s.profile.previouslyMarried = true;
    s.profile.priorEndDate = "2026-12-01";
    expect(buildAlerts(s, today).find((a) => a.id === "waiting-period")?.level).toBe("red");
  });

  it("points out empty plates and a before-VAT price", () => {
    const s = defaultState();
    s.profile.weddingDate = "2027-02-09";
    s.profile.plannedGuests = 30;
    s.budget.venue = { type: "other", perPlate: 400, includesVat: false, minPlates: 40, extras: null, actual: null };
    const ids = buildAlerts(s, today).map((a) => a.id);
    expect(ids).toContain("empty-plates");
    expect(ids).toContain("venue-vat");
  });

  it("puts red before amber before info", () => {
    const s = defaultState();
    s.profile.weddingDate = "2026-11-28";
    s.profile.needsBerur = true;
    const levels = buildAlerts(s, today).map((a) => a.level);
    const order = { red: 0, amber: 1, info: 2 };
    expect(levels.map((l) => order[l])).toEqual([...levels.map((l) => order[l])].sort());
  });
});

describe("stored state repair", () => {
  it("returns defaults for garbage", () => {
    expect(normalizeState(null)).toEqual(defaultState());
    expect(normalizeState("x")).toEqual(defaultState());
    expect(normalizeState([])).toEqual(defaultState());
  });

  it("repairs bad fields and drops what it cannot trust", () => {
    const fixed = normalizeState({
      profile: { weddingDate: "2026-02-30", custom: "other", plannedGuests: "40" },
      guests: [{ name: "דנה", partySize: -4, rsvp: "maybe" }, "junk"],
      vendors: [{ category: "nope", quote: Number.NaN }],
      done: { "task:acum": true, "task:x": "yes" },
    });
    expect(fixed.profile.weddingDate).toBe("");
    expect(fixed.profile.custom).toBe("ashkenazi");
    expect(fixed.profile.plannedGuests).toBeNull();
    expect(fixed.guests).toHaveLength(1);
    expect(fixed.guests[0]).toMatchObject({ name: "דנה", partySize: 1, rsvp: "pending" });
    expect(fixed.vendors[0]).toMatchObject({ category: "other", quote: null });
    expect(fixed.done).toEqual({ "task:acum": true });
  });

  it("round-trips a valid state", () => {
    const s = defaultState();
    s.profile.weddingDate = "2027-02-09";
    s.guests.push(guest({ name: "יוסי", id: "g1" }));
    expect(normalizeState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
