// The whole app state. It is stored in the browser only (localStorage), so this
// file is the single source of truth for its shape, its defaults and how an
// imported or older file is repaired.

import type { BudgetLineKey, GuestGroupKey, Region, VenueType } from "@/config/benchmarks";
import { BUDGET_LINES, GUEST_GROUPS, VENUE_TYPES } from "@/config/benchmarks";
import { isIsoDate } from "./hebrew-calendar";

export type Custom = "ashkenazi" | "sephardi";
export type Route = "rabbinate" | "cyprus" | "utah";
export type Rsvp = "pending" | "yes" | "no";
export type Diet = "none" | "vegetarian" | "vegan" | "glutenFree" | "other";
export type Side = "a" | "b" | "both";

export type VendorCategory =
  | "venue"
  | "photographer"
  | "videographer"
  | "music"
  | "makeup"
  | "flowers"
  | "rabbi"
  | "dress"
  | "suit"
  | "invitations"
  | "transport"
  | "other";

export type VendorStatus = "considering" | "quoted" | "booked" | "rejected";

export interface Profile {
  partnerA: string;
  partnerB: string;
  /** ISO date or "" when not chosen yet. */
  weddingDate: string;
  custom: Custom;
  route: Route;
  region: Region;
  /** Planned guest count while the list is still empty. */
  plannedGuests: number | null;
  discount40: boolean;
  previouslyMarried: boolean;
  /** ISO date of the divorce or death, "" when unknown. */
  priorEndDate: string;
  foreignSpouse: boolean;
  needsBerur: boolean;
}

export interface Guest {
  id: string;
  name: string;
  group: GuestGroupKey;
  side: Side;
  partySize: number;
  rsvp: Rsvp;
  diet: Diet;
  note: string;
}

export interface Vendor {
  id: string;
  category: VendorCategory;
  name: string;
  phone: string;
  status: VendorStatus;
  quote: number | null;
  quoteIncludesVat: boolean;
  deposit: number | null;
  contractSigned: boolean;
  note: string;
}

export interface VenueBudget {
  type: VenueType;
  perPlate: number | null;
  includesVat: boolean;
  minPlates: number | null;
  extras: number | null;
  actual: number | null;
}

export interface BudgetAmounts {
  planned: number | null;
  actual: number | null;
}

export interface BudgetState {
  total: number | null;
  venue: VenueBudget;
  lines: Record<BudgetLineKey, BudgetAmounts>;
}

export interface AppState {
  version: 1;
  profile: Profile;
  budget: BudgetState;
  guests: Guest[];
  vendors: Vendor[];
  /** Ticked timeline tasks and registration documents, by id. */
  done: Record<string, boolean>;
}

export const STORAGE_KEY = "micro-wedding:v1";

export function defaultState(): AppState {
  const lines = Object.fromEntries(BUDGET_LINES.map((l) => [l.key, { planned: null, actual: null }])) as Record<
    BudgetLineKey,
    BudgetAmounts
  >;
  return {
    version: 1,
    profile: {
      partnerA: "",
      partnerB: "",
      weddingDate: "",
      custom: "ashkenazi",
      route: "rabbinate",
      region: "center",
      plannedGuests: null,
      discount40: false,
      previouslyMarried: false,
      priorEndDate: "",
      foreignSpouse: false,
      needsBerur: false,
    },
    budget: {
      total: null,
      venue: { type: "other", perPlate: null, includesVat: false, minPlates: null, extras: null, actual: null },
      lines,
    },
    guests: [],
    vendors: [],
    done: {},
  };
}

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- repair of stored or imported data ------------------------------------

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
function isoOrEmpty(v: unknown): string {
  return typeof v === "string" && isIsoDate(v) ? v : "";
}

const GROUP_KEYS = GUEST_GROUPS.map((g) => g.key);
const VENUE_KEYS = VENUE_TYPES.map((v) => v.key);
const VENDOR_CATEGORIES: VendorCategory[] = [
  "venue",
  "photographer",
  "videographer",
  "music",
  "makeup",
  "flowers",
  "rabbi",
  "dress",
  "suit",
  "invitations",
  "transport",
  "other",
];

/** Turns anything (older version, hand-edited file) into a valid state. Never throws. */
export function normalizeState(raw: unknown): AppState {
  const base = defaultState();
  if (!isRec(raw)) return base;

  const p = isRec(raw.profile) ? raw.profile : {};
  const profile: Profile = {
    partnerA: str(p.partnerA),
    partnerB: str(p.partnerB),
    weddingDate: isoOrEmpty(p.weddingDate),
    custom: oneOf(p.custom, ["ashkenazi", "sephardi"] as const, base.profile.custom),
    route: oneOf(p.route, ["rabbinate", "cyprus", "utah"] as const, base.profile.route),
    region: oneOf(p.region, ["center", "periphery"] as const, base.profile.region),
    plannedGuests: num(p.plannedGuests),
    discount40: bool(p.discount40),
    previouslyMarried: bool(p.previouslyMarried),
    priorEndDate: isoOrEmpty(p.priorEndDate),
    foreignSpouse: bool(p.foreignSpouse),
    needsBerur: bool(p.needsBerur),
  };

  const b = isRec(raw.budget) ? raw.budget : {};
  const v = isRec(b.venue) ? b.venue : {};
  const rawLines = isRec(b.lines) ? b.lines : {};
  const lines = { ...base.budget.lines };
  for (const key of Object.keys(lines) as BudgetLineKey[]) {
    const l = isRec(rawLines[key]) ? (rawLines[key] as Rec) : {};
    lines[key] = { planned: num(l.planned), actual: num(l.actual) };
  }
  const budget: BudgetState = {
    total: num(b.total),
    venue: {
      type: oneOf(v.type, VENUE_KEYS, base.budget.venue.type),
      perPlate: num(v.perPlate),
      includesVat: bool(v.includesVat),
      minPlates: num(v.minPlates),
      extras: num(v.extras),
      actual: num(v.actual),
    },
    lines,
  };

  const guests: Guest[] = Array.isArray(raw.guests)
    ? raw.guests.filter(isRec).map((g) => ({
        id: str(g.id) || newId(),
        name: str(g.name),
        group: oneOf(g.group, GROUP_KEYS, "friends"),
        side: oneOf(g.side, ["a", "b", "both"] as const, "both"),
        partySize: Math.max(1, Math.round(num(g.partySize) ?? 1)),
        rsvp: oneOf(g.rsvp, ["pending", "yes", "no"] as const, "pending"),
        diet: oneOf(g.diet, ["none", "vegetarian", "vegan", "glutenFree", "other"] as const, "none"),
        note: str(g.note),
      }))
    : [];

  const vendors: Vendor[] = Array.isArray(raw.vendors)
    ? raw.vendors.filter(isRec).map((x) => ({
        id: str(x.id) || newId(),
        category: oneOf(x.category, VENDOR_CATEGORIES, "other"),
        name: str(x.name),
        phone: str(x.phone),
        status: oneOf(x.status, ["considering", "quoted", "booked", "rejected"] as const, "considering"),
        quote: num(x.quote),
        quoteIncludesVat: bool(x.quoteIncludesVat),
        deposit: num(x.deposit),
        contractSigned: bool(x.contractSigned),
        note: str(x.note),
      }))
    : [];

  const done: Record<string, boolean> = {};
  if (isRec(raw.done)) {
    for (const [k, val] of Object.entries(raw.done)) if (val === true) done[k] = true;
  }

  return { version: 1, profile, budget, guests, vendors, done };
}
