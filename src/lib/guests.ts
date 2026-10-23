import { GUEST_GROUPS, type GuestGroupKey } from "@/config/benchmarks";
import type { Diet, Guest } from "./state";

export interface GuestSummary {
  parties: number;
  /** Everyone on the list, declined or not. */
  invited: number;
  confirmed: number;
  declined: number;
  pending: number;
  /** Seats to plan and pay for: confirmed plus still-open. */
  headcount: number;
  byGroup: Record<GuestGroupKey, number>;
  byDiet: Record<Exclude<Diet, "none">, number>;
  /** Cash gifts if everyone who has not declined comes. A rule of thumb, never a budget line. */
  estimatedGifts: number;
}

export function summarizeGuests(guests: Guest[]): GuestSummary {
  const byGroup = Object.fromEntries(GUEST_GROUPS.map((g) => [g.key, 0])) as Record<GuestGroupKey, number>;
  const byDiet: GuestSummary["byDiet"] = { vegetarian: 0, vegan: 0, glutenFree: 0, other: 0 };
  let invited = 0;
  let confirmed = 0;
  let declined = 0;
  let pending = 0;
  let estimatedGifts = 0;

  const avg = Object.fromEntries(GUEST_GROUPS.map((g) => [g.key, g.avgGift])) as Record<GuestGroupKey, number>;

  for (const g of guests) {
    const n = Math.max(1, g.partySize);
    invited += n;
    if (g.rsvp === "no") {
      declined += n;
      continue;
    }
    if (g.rsvp === "yes") confirmed += n;
    else pending += n;
    byGroup[g.group] += n;
    if (g.diet !== "none") byDiet[g.diet] += n;
    estimatedGifts += n * avg[g.group];
  }

  return {
    parties: guests.length,
    invited,
    confirmed,
    declined,
    pending,
    headcount: confirmed + pending,
    byGroup,
    byDiet,
    estimatedGifts,
  };
}

/** The number to plan with: the list when there is one, otherwise the rough target. */
export function planningHeadcount(summary: GuestSummary, plannedGuests: number | null): number {
  return summary.parties > 0 ? summary.headcount : Math.max(0, plannedGuests ?? 0);
}
