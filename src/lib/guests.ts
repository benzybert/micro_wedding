import type { Attending, Diet, Side, Tier } from "@/db/schema";

/* Pure guest-list logic: counts, capacity "cut line", invite waves, diet summary. */

export const TIER_ORDER: Tier[] = ["must", "want", "maybe"];
export const TIER_LABEL: Record<Tier, string> = { must: "חייבים (א׳)", want: "רוצים (ב׳)", maybe: "אם יהיה מקום (ג׳)" };
export const TIER_SHORT: Record<Tier, string> = { must: "א׳", want: "ב׳", maybe: "ג׳" };
export const DIET_LABEL: Record<Diet, string> = {
  regular: "רגיל",
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  gluten_free: "ללא גלוטן",
};
export const ATTENDING_LABEL: Record<Attending, string> = { pending: "ממתין", yes: "מגיע/ה", no: "לא מגיע/ה" };

export function sideLabel(side: Side, a: string, b: string): string {
  return side === "a" ? `של ${a}` : side === "b" ? `של ${b}` : "משותף";
}

export type GuestLite = { id: string; householdId: string; attending: Attending; isChild?: boolean; diet?: Diet; allergies?: string | null; name?: string; tableId?: string | null };
export type HouseholdLite = { id: string; tier: Tier; side: Side; invitedAt: Date | null; createdAt?: Date | string | number };

export type Headcount = { yes: number; pending: number; no: number; total: number; children: number; expected: number };

/** expected = seats that are not a "no" (confirmed + still pending). */
export function headcount(guests: readonly GuestLite[]): Headcount {
  const h: Headcount = { yes: 0, pending: 0, no: 0, total: guests.length, children: 0, expected: 0 };
  for (const g of guests) {
    h[g.attending] += 1;
    if (g.isChild && g.attending !== "no") h.children += 1;
  }
  h.expected = h.yes + h.pending;
  return h;
}

export type HouseholdStatus = "not_invited" | "waiting" | "partial" | "yes" | "no";

export function householdStatus(household: Pick<HouseholdLite, "invitedAt">, members: readonly GuestLite[]): HouseholdStatus {
  const yes = members.filter((m) => m.attending === "yes").length;
  const no = members.filter((m) => m.attending === "no").length;
  const pending = members.length - yes - no;
  if (members.length > 0 && pending === 0) return yes > 0 ? (no > 0 ? "partial" : "yes") : "no";
  if (yes > 0 || no > 0) return "partial";
  return household.invitedAt ? "waiting" : "not_invited";
}

export const STATUS_LABEL: Record<HouseholdStatus, string> = {
  not_invited: "טרם הוזמן",
  waiting: "ממתין לתשובה",
  partial: "תשובה חלקית",
  yes: "מגיעים",
  no: "לא מגיעים",
};

export type TierRow = { tier: Tier; seats: number; cumulative: number; fits: boolean };

/**
 * "Where is the cut line?" For each tier: seats it needs (everyone not declined), the running total,
 * and whether the running total still fits under the cap.
 */
export function capacityByTier(
  households: readonly HouseholdLite[],
  guests: readonly GuestLite[],
  cap: number,
): { rows: TierRow[]; cutTier: Tier | null; overBy: number } {
  const tierOf = new Map(households.map((h) => [h.id, h.tier] as const));
  const seatsByTier: Record<Tier, number> = { must: 0, want: 0, maybe: 0 };
  for (const g of guests) {
    if (g.attending === "no") continue;
    const t = tierOf.get(g.householdId);
    if (t) seatsByTier[t] += 1;
  }
  let running = 0;
  let cutTier: Tier | null = null;
  const rows = TIER_ORDER.map((tier) => {
    running += seatsByTier[tier];
    const fits = running <= cap;
    if (fits && seatsByTier[tier] > 0) cutTier = tier;
    return { tier, seats: seatsByTier[tier], cumulative: running, fits };
  });
  return { rows, cutTier, overBy: Math.max(0, running - cap) };
}

/**
 * Seats already spoken for = everyone in an *invited* household who has not declined,
 * plus not-yet-invited "must" households (they are going to be invited no matter what).
 */
export function committedSeats(households: readonly HouseholdLite[], guests: readonly GuestLite[]): number {
  const byId = new Map(households.map((h) => [h.id, h] as const));
  let n = 0;
  for (const g of guests) {
    if (g.attending === "no") continue;
    const h = byId.get(g.householdId);
    if (!h) continue;
    if (h.invitedAt || h.tier === "must") n += 1;
  }
  return n;
}

export type WaveSuggestion = { householdId: string; seats: number };

/**
 * Next invitation wave: not-yet-invited households (A first, then B, then C, oldest first) while the
 * seats still fit under the cap. Skips a household that is too big but keeps trying smaller ones in
 * the same tier, never jumping to a lower tier before the higher one is exhausted.
 */
export function suggestWave(
  households: readonly HouseholdLite[],
  guests: readonly GuestLite[],
  cap: number,
): { suggestions: WaveSuggestion[]; freeSeats: number } {
  const seatsOf = new Map<string, number>();
  for (const g of guests) if (g.attending !== "no") seatsOf.set(g.householdId, (seatsOf.get(g.householdId) ?? 0) + 1);

  const free = cap - committedSeats(households, guests);
  let left = free;
  const suggestions: WaveSuggestion[] = [];
  const candidates = households
    .filter((h) => !h.invitedAt && h.tier !== "must")
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || toMs(a.createdAt) - toMs(b.createdAt));

  for (const tier of TIER_ORDER.filter((t) => t !== "must")) {
    for (const h of candidates.filter((c) => c.tier === tier)) {
      const seats = seatsOf.get(h.id) ?? 0;
      if (seats > 0 && seats <= left) {
        suggestions.push({ householdId: h.id, seats });
        left -= seats;
      }
    }
  }
  return { suggestions, freeSeats: Math.max(free, 0) };
}

function toMs(v: Date | string | number | undefined): number {
  if (v === undefined) return 0;
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

export function bySide(households: readonly HouseholdLite[], guests: readonly GuestLite[]): Record<Side, number> {
  const sideOf = new Map(households.map((h) => [h.id, h.side] as const));
  const out: Record<Side, number> = { a: 0, b: 0, both: 0 };
  for (const g of guests) {
    if (g.attending === "no") continue;
    const s = sideOf.get(g.householdId);
    if (s) out[s] += 1;
  }
  return out;
}

export function dietSummary(guests: readonly GuestLite[]) {
  const counts: Record<Diet, number> = { regular: 0, vegetarian: 0, vegan: 0, gluten_free: 0 };
  const allergies: { name: string; allergy: string }[] = [];
  for (const g of guests) {
    if (g.attending === "no") continue;
    counts[g.diet ?? "regular"] += 1;
    if (g.allergies?.trim()) allergies.push({ name: g.name ?? "", allergy: g.allergies.trim() });
  }
  return { counts, allergies };
}

export type Table = { id: string; name: string; capacity: number };

export function tableFill(tables: readonly Table[], guests: readonly GuestLite[]) {
  return tables.map((t) => {
    const seated = guests.filter((g) => g.tableId === t.id && g.attending !== "no").length;
    return { ...t, seated, free: t.capacity - seated, over: seated > t.capacity };
  });
}

export function unseated(guests: readonly GuestLite[]): GuestLite[] {
  return guests.filter((g) => !g.tableId && g.attending !== "no");
}

/* ───────── messages ───────── */

export const DEFAULT_INVITATION = [
  "שלום {שם}! 💛",
  "אנחנו, {זוג}, מתחתנים ב{תאריך}{מקום}, ונשמח לראות אתכם בחתונה הקטנה והאינטימית שלנו.",
  "בלחיצה על הקישור אפשר לאשר הגעה ולעדכן העדפות אוכל:",
  "{קישור}",
  "מחכים לכם!",
].join("\n");

export const DEFAULT_REMINDER = [
  "היי {שם}, תזכורת קטנה מ{זוג} 🙂",
  "עוד לא קיבלנו תשובה לגבי החתונה ב{תאריך}. נשמח אם תאשרו הגעה בקישור:",
  "{קישור}",
  "תודה!",
].join("\n");

/** Replace {placeholders}; unknown placeholders become empty. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^{}]+)\}/g, (_m, key: string) => vars[key.trim()] ?? "").replace(/[ \t]+\n/g, "\n");
}

/* ───────── auto seating ───────── */

export type SeatAssignment = { guestId: string; tableId: string };

/**
 * First-fit-decreasing seating that keeps every household together. Households of the same side are
 * placed consecutively so a table tends to be one side's family; households too big for any single table
 * are split across tables with room. Guests who already have a table keep it (their seat counts as taken).
 */
export function autoSeat(
  tables: readonly Table[],
  households: readonly Pick<HouseholdLite, "id" | "side">[],
  guests: readonly GuestLite[],
): { assignments: SeatAssignment[]; unplaced: string[] } {
  const free = new Map(tables.map((t) => [t.id, t.capacity] as const));
  for (const g of guests) if (g.tableId && g.attending !== "no" && free.has(g.tableId)) free.set(g.tableId, free.get(g.tableId)! - 1);

  const sideRank: Record<Side, number> = { a: 0, both: 1, b: 2 };
  const pending = households
    .map((h) => ({ h, members: guests.filter((g) => g.householdId === h.id && g.attending !== "no" && !g.tableId) }))
    .filter((x) => x.members.length > 0)
    .sort((x, y) => sideRank[x.h.side] - sideRank[y.h.side] || y.members.length - x.members.length);

  const assignments: SeatAssignment[] = [];
  const unplaced: string[] = [];
  const order = tables.map((t) => t.id);

  for (const { members } of pending) {
    const whole = order.find((id) => (free.get(id) ?? 0) >= members.length);
    if (whole) {
      for (const m of members) assignments.push({ guestId: m.id, tableId: whole });
      free.set(whole, free.get(whole)! - members.length);
      continue;
    }
    // Too big for one table: split, filling the emptiest tables first.
    const rest = [...members];
    for (const id of [...order].sort((a, b) => (free.get(b) ?? 0) - (free.get(a) ?? 0))) {
      while (rest.length && (free.get(id) ?? 0) > 0) {
        const m = rest.shift()!;
        assignments.push({ guestId: m.id, tableId: id });
        free.set(id, free.get(id)! - 1);
      }
    }
    for (const m of rest) unplaced.push(m.id);
  }
  return { assignments, unplaced };
}

/* ───────── typing members as lines ───────── */

/**
 * "דנה כהן\nיוסי כהן (ילד)\nילדה: מאיה" → members. A line is a child when it starts with
 * "ילד:" / "ילדה:" or ends with "(ילד)" / "(ילדה)". Bullets and blank lines are ignored.
 */
export function parseMemberLines(text: string): { name: string; isChild: boolean }[] {
  const out: { name: string; isChild: boolean }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/^[\s\-*•·]+/, "").trim();
    if (!line) continue;
    let isChild = false;
    const lead = line.match(/^(ילד|ילדה)\s*:\s*/);
    if (lead) {
      isChild = true;
      line = line.slice(lead[0].length);
    }
    const trail = line.match(/\s*\((ילד|ילדה)\)\s*$/);
    if (trail) {
      isChild = true;
      line = line.slice(0, trail.index).trim();
    }
    if (line) out.push({ name: line.slice(0, 120), isChild });
  }
  return out.slice(0, 30);
}
