// Calendar helpers. Dates travel as ISO strings (YYYY-MM-DD) and are handled at
// noon UTC so a time zone can never move them across midnight. The Hebrew date
// comes from the runtime's Intl data, so no calendar table is kept in the code.

export type HebrewMonth =
  | "Tishri"
  | "Heshvan"
  | "Kislev"
  | "Tevet"
  | "Shevat"
  | "Adar"
  | "Adar I"
  | "Adar II"
  | "Nisan"
  | "Iyar"
  | "Sivan"
  | "Tamuz"
  | "Av"
  | "Elul";

export interface HebrewDate {
  day: number;
  month: HebrewMonth;
  year: number;
}

export const MONTH_HE: Record<HebrewMonth, string> = {
  Tishri: "תשרי",
  Heshvan: "חשוון",
  Kislev: "כסלו",
  Tevet: "טבת",
  Shevat: "שבט",
  Adar: "אדר",
  "Adar I": "אדר א׳",
  "Adar II": "אדר ב׳",
  Nisan: "ניסן",
  Iyar: "אייר",
  Sivan: "סיוון",
  Tamuz: "תמוז",
  Av: "אב",
  Elul: "אלול",
};

const ALIASES: Record<string, HebrewMonth> = {
  tishri: "Tishri",
  tishrei: "Tishri",
  heshvan: "Heshvan",
  cheshvan: "Heshvan",
  kislev: "Kislev",
  tevet: "Tevet",
  shevat: "Shevat",
  adar: "Adar",
  "adar i": "Adar I",
  "adar ii": "Adar II",
  nisan: "Nisan",
  iyar: "Iyar",
  sivan: "Sivan",
  tamuz: "Tamuz",
  tammuz: "Tamuz",
  av: "Av",
  elul: "Elul",
};

const HEBREW = new Intl.DateTimeFormat("en-u-ca-hebrew", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const ISRAEL_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DAY_MS = 86_400_000;

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parses a real calendar date; returns null for anything else (e.g. 2026-02-30). */
export function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return isoOf(d) === iso ? d : null;
}

export function isIsoDate(value: string): boolean {
  return parseIso(value) !== null;
}

function mustParse(iso: string): Date {
  const d = parseIso(iso);
  if (!d) throw new Error(`Invalid ISO date: ${iso}`);
  return d;
}

export function addDays(iso: string, days: number): string {
  const d = mustParse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return isoOf(d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: string, to: string): number {
  return Math.round((mustParse(to).getTime() - mustParse(from).getTime()) / DAY_MS);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(iso: string): number {
  return mustParse(iso).getUTCDay();
}

/** Today's date in Israel, whatever the viewer's time zone. */
export function todayIso(now: Date = new Date()): string {
  return ISRAEL_DAY.format(now);
}

export function hebrewDateOf(iso: string): HebrewDate {
  const parts = Object.fromEntries(HEBREW.formatToParts(mustParse(iso)).map((p) => [p.type, p.value]));
  const month = ALIASES[String(parts.month).trim().toLowerCase()];
  if (!month) throw new Error(`Unknown Hebrew month "${parts.month}" for ${iso}`);
  return { day: Number(parts.day), month, year: Number(parts.year) };
}

export function formatHebrewDate(h: HebrewDate): string {
  return `${h.day} ${MONTH_HE[h.month]}`;
}

const GREGORIAN_HE = new Intl.DateTimeFormat("he-IL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatLongDate(iso: string): string {
  return GREGORIAN_HE.format(mustParse(iso));
}

export const WEEKDAY_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
