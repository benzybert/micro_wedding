/**
 * Dates are ISO strings ("YYYY-MM-DD") everywhere in the app. They are anchored at
 * 12:00 UTC when turned into `Date` so the server time zone can never shift the day.
 */
const DAY_MS = 86_400_000;

export function isoToDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = isoToDate(value);
  return !Number.isNaN(d.getTime()) && dateToIso(d) === value;
}

export function addDays(iso: string, days: number): string {
  return dateToIso(new Date(isoToDate(iso).getTime() + days * DAY_MS));
}

/** Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((isoToDate(toIso).getTime() - isoToDate(fromIso).getTime()) / DAY_MS);
}

/** Today's date in Israel. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem" }).format(now);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayIndex(iso: string): number {
  return isoToDate(iso).getUTCDay();
}

export const WEEKDAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

export function weekdayName(iso: string): string {
  return `יום ${WEEKDAYS_HE[weekdayIndex(iso)]}`;
}

const fullDate = new Intl.DateTimeFormat("he-IL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "UTC" });
const shortDateYear = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDateLong(iso: string): string {
  return fullDate.format(isoToDate(iso));
}

export function formatDateShort(iso: string, withYear = false): string {
  return (withYear ? shortDateYear : shortDate).format(isoToDate(iso));
}

const ils = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });

/** Render inside <bdi> in JSX: Intl output carries its own bidi marks. */
export function formatILS(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return ils.format(Math.round(amount));
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** "בעוד 12 ימים" / "היום" / "לפני 3 ימים" */
export function relativeDays(days: number): string {
  if (days === 0) return "היום";
  if (days === 1) return "מחר";
  if (days === -1) return "אתמול";
  if (days > 0) return `בעוד ${days} ימים`;
  return `לפני ${Math.abs(days)} ימים`;
}

/** Hebrew plural helper: plural(1,"אורח","אורחים") */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? `${n} ${one}` : `${n} ${many}`;
}
