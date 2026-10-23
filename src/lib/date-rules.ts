// Which dates can a wedding take place on? Pure logic over the Hebrew calendar.
//
// Two kinds of rules, kept apart on purpose:
//  - halachic (Shabbat, festivals, fasts, the Three Weeks, the Omer): they bind a
//    religious ceremony and depend on the community's custom;
//  - statutory (Yom HaZikaron, Yom HaShoah): Israeli law bars public entertainment,
//    so no hall will host you whatever the ceremony.
// Everything here is guidance. The mesader kiddushin has the last word.

import { WAITING_DAYS } from "@/config/benchmarks";
import {
  addDays,
  diffDays,
  formatHebrewDate,
  hebrewDateOf,
  parseIso,
  weekdayOf,
  type HebrewDate,
} from "./hebrew-calendar";
import type { Custom, Route } from "./state";

export type FindingKind = "halachic" | "statutory";
export type Status = "ok" | "caution" | "blocked";

export interface DateFinding {
  id: string;
  kind: FindingKind;
  severity: "blocked" | "caution";
  title: string;
  detail: string;
}

export type DayTier = "low" | "peak" | "friday" | "motzei";
export type SeasonTier = "low" | "mid" | "high";

export interface DateReport {
  date: string;
  weekday: number;
  hebrew: HebrewDate;
  hebrewLabel: string;
  status: Status;
  findings: DateFinding[];
  dayTier: DayTier;
  season: SeasonTier;
  /** 0 (cheapest) to 5. Relative demand only, never a price. */
  costRank: number;
  /** The other community's custom would give a different answer for this date. */
  customDependent: boolean;
}

export const CONFIRM = "בדקו עם מסדר הקידושין או עם לשכת רישום הנישואין.";

/** Weekday (0-6) of day `target` of the same Hebrew month, given today's weekday `w`. */
function weekdayOfDay(w: number, from: number, target: number): number {
  return (((w + target - from) % 7) + 7) % 7;
}

function halachic(id: string, title: string, detail: string): DateFinding {
  return { id, kind: "halachic", severity: "blocked", title, detail };
}

function findingsFor(h: HebrewDate, w: number, custom: Custom): DateFinding[] {
  const out: DateFinding[] = [];
  const { day, month } = h;
  const dayW = (target: number) => weekdayOfDay(w, day, target);

  if (w === 6) {
    out.push(
      halachic("shabbat", "שבת", "אין חופה בשבת. מוצאי שבת, אחרי צאת השבת, אפשרי בתוספת מחיר."),
    );
  }

  const yomTov = (id: string, title: string) =>
    out.push(halachic(id, title, `חג: לא מקיימים חתונה. ${CONFIRM}`));
  const cholHamoed = (id: string, title: string) =>
    out.push(halachic(id, title, "חול המועד: ״אין נושאין נשים במועד״, החתונה עצמה לא נערכת."));
  const fast = (id: string, title: string) =>
    out.push(halachic(id, title, `יום צום ציבורי: נחשב לא זמין. ${CONFIRM}`));

  switch (month) {
    case "Tishri": {
      if (day <= 2) yomTov("rosh-hashana", "ראש השנה");
      if (day === (dayW(3) === 6 ? 4 : 3)) fast("tzom-gedaliah", "צום גדליה");
      if (day === 10) yomTov("yom-kippur", "יום כיפור");
      if (day === 15) yomTov("sukkot", "סוכות");
      if (day > 15 && day <= 21) cholHamoed("sukkot-cm", "חול המועד סוכות");
      if (day === 22) yomTov("shmini-atzeret", "שמיני עצרת ושמחת תורה");
      break;
    }
    case "Tevet":
      if (day === 10) fast("asara-btevet", "עשרה בטבת");
      break;
    case "Adar":
    case "Adar II":
      if (day === (dayW(13) === 6 ? 11 : 13)) fast("taanit-esther", "תענית אסתר");
      break;
    case "Nisan": {
      if (day === 15 || day === 21) yomTov("pesach", day === 15 ? "פסח" : "שביעי של פסח");
      if (day > 15 && day < 21) cholHamoed("pesach-cm", "חול המועד פסח");
      if (day >= 22) {
        out.push(
          halachic(
            "omer",
            "ספירת העומר",
            "בין פסח ללג בעומר לא מקיימים חתונות. תחילת האבלות משתנה לפי מנהג הקהילה. " + CONFIRM,
          ),
        );
      }
      break;
    }
    case "Iyar": {
      const lastDay = custom === "ashkenazi" ? 17 : 18;
      if (day <= lastDay) {
        out.push(
          halachic(
            "omer",
            "ספירת העומר",
            custom === "ashkenazi"
              ? "המנהג האשכנזי מתיר מל״ג בעומר ואילך. " + CONFIRM
              : "המנהג הספרדי מתיר מיום אחרי ל״ג בעומר. " + CONFIRM,
          ),
        );
      }
      break;
    }
    case "Sivan":
      if (day === 6) yomTov("shavuot", "שבועות");
      break;
    case "Tamuz": {
      const fastDay = dayW(17) === 6 ? 18 : 17;
      if (custom === "ashkenazi" && day >= 17) {
        out.push(
          halachic(
            day === fastDay ? "tamuz-17" : "three-weeks",
            day === fastDay ? "י״ז בתמוז" : "שלושת השבועות",
            "המנהג האשכנזי: אין חתונות מי״ז בתמוז עד תשעה באב. " + CONFIRM,
          ),
        );
      }
      break;
    }
    case "Av": {
      const tisha = dayW(9) === 6 ? 10 : 9;
      if (day <= tisha) {
        out.push(
          halachic(
            day === tisha ? "tisha-bav" : "three-weeks",
            day === tisha ? "תשעה באב" : custom === "ashkenazi" ? "שלושת השבועות" : "תשעת הימים",
            custom === "ashkenazi"
              ? "המנהג האשכנזי: אין חתונות מי״ז בתמוז עד תשעה באב. " + CONFIRM
              : "המנהג הספרדי: אין חתונות מראש חודש אב עד תשעה באב. " + CONFIRM,
          ),
        );
      }
      break;
    }
    default:
      break;
  }
  return out;
}

const STATUTORY_DETAIL =
  "חוק אוסר עינוגים ציבוריים מהשקיעה ועד צאת הכוכבים למחרת, ולכן אולמות סגורים. זה לא תלוי בטקס.";

function statutoryFindings(h: HebrewDate, w: number): DateFinding[] {
  const out: DateFinding[] = [];
  const { day, month } = h;
  const dayW = (target: number) => weekdayOfDay(w, day, target);

  if (month === "Nisan" && day >= 25 && day <= 28) {
    const w27 = dayW(27);
    const shoah = w27 === 5 ? 26 : w27 === 0 ? 28 : 27;
    if (day === shoah) {
      out.push({ id: "yom-hashoah", kind: "statutory", severity: "blocked", title: "יום השואה והגבורה", detail: STATUTORY_DETAIL });
    } else if (day === shoah - 1) {
      out.push({
        id: "yom-hashoah-eve",
        kind: "statutory",
        severity: "caution",
        title: "ערב יום השואה",
        detail: "האיסור מתחיל בשקיעה: רק אירוע שמסתיים לפני השקיעה.",
      });
    }
  }

  if (month === "Iyar" && day <= 8) {
    const w5 = dayW(5);
    const atzmaut = w5 === 5 ? 4 : w5 === 6 ? 3 : w5 === 1 ? 6 : 5;
    const zikaron = atzmaut - 1;
    if (day === zikaron) {
      out.push({ id: "yom-hazikaron", kind: "statutory", severity: "blocked", title: "יום הזיכרון לחללי צה״ל", detail: STATUTORY_DETAIL });
    } else if (day === zikaron - 1) {
      out.push({
        id: "yom-hazikaron-eve",
        kind: "statutory",
        severity: "caution",
        title: "ערב יום הזיכרון",
        detail: "האיסור מתחיל בשקיעה: רק אירוע שמסתיים לפני השקיעה.",
      });
    }
  }
  return out;
}

export function dayTierOf(weekday: number): DayTier {
  if (weekday === 4) return "peak";
  if (weekday === 5) return "friday";
  if (weekday === 6) return "motzei";
  return "low";
}

/** Gregorian month to season. September and October are not in the guide: treated as mid. */
export function seasonOf(iso: string): SeasonTier {
  const month = Number(iso.slice(5, 7));
  if (month === 11 || month === 12 || month === 1 || month === 2) return "low";
  if (month >= 6 && month <= 8) return "high";
  return "mid";
}

const DAY_COST: Record<DayTier, number> = { low: 0, motzei: 1, friday: 2, peak: 3 };
const SEASON_COST: Record<SeasonTier, number> = { low: 0, mid: 1, high: 2 };

export interface CheckOptions {
  custom: Custom;
  route: Route;
}

export function checkDate(iso: string, { custom, route }: CheckOptions): DateReport {
  if (!parseIso(iso)) throw new Error(`Invalid date: ${iso}`);
  const weekday = weekdayOf(iso);
  const hebrew = hebrewDateOf(iso);

  const raw = [...findingsFor(hebrew, weekday, custom), ...statutoryFindings(hebrew, weekday)];
  // Outside the Rabbinate route the halachic rules are advice, not a barrier.
  const findings = raw.map((f): DateFinding =>
    f.kind === "halachic" && route !== "rabbinate" && f.severity === "blocked"
      ? { ...f, severity: "caution", detail: `${f.detail} (חל על טקס דתי; בטקס אזרחי זה רק שיקול.)` }
      : f,
  );

  const other = custom === "ashkenazi" ? "sephardi" : "ashkenazi";
  const otherIds = findingsFor(hebrew, weekday, other).map((f) => f.id).sort().join("|");
  const myIds = findingsFor(hebrew, weekday, custom).map((f) => f.id).sort().join("|");

  const status: Status = findings.some((f) => f.severity === "blocked")
    ? "blocked"
    : findings.length > 0
      ? "caution"
      : "ok";

  const dayTier = dayTierOf(weekday);
  const season = seasonOf(iso);
  return {
    date: iso,
    weekday,
    hebrew,
    hebrewLabel: formatHebrewDate(hebrew),
    status,
    findings,
    dayTier,
    season,
    costRank: DAY_COST[dayTier] + SEASON_COST[season],
    customDependent: otherIds !== myIds,
  };
}

/** Earliest wedding date after a divorce or the death of a spouse (90 days, both end days excluded). */
export function earliestAfterPriorMarriage(endIso: string): string {
  return addDays(endIso, WAITING_DAYS + 1);
}

export interface MonthPick {
  month: string; // YYYY-MM
  dates: DateReport[];
}

/**
 * The cheapest open dates, a few per month, for the next `months` months.
 * Cheapest first inside a month; months in calendar order.
 */
export function bestDatesByMonth(
  from: string,
  months: number,
  perMonth: number,
  options: CheckOptions,
): MonthPick[] {
  const end = addDays(from, Math.round(months * 30.5));
  const byMonth = new Map<string, DateReport[]>();
  for (let d = from; diffDays(d, end) >= 0; d = addDays(d, 1)) {
    const report = checkDate(d, options);
    if (report.status !== "ok") continue;
    const key = d.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), report]);
  }
  return [...byMonth.entries()].map(([month, dates]) => ({
    month,
    dates: [...dates].sort((a, b) => a.costRank - b.costRank || a.date.localeCompare(b.date)).slice(0, perMonth),
  }));
}
