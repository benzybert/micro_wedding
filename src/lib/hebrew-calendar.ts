import { HDate, HebrewCalendar, Location, Zmanim, flags, months } from "@hebcal/core";
import { cityByKey } from "@/data/cities";
import { addDays, isoToDate, weekdayIndex, weekdayName } from "@/lib/format";

/*
 * Can we hold a wedding on this date? Pure calendar logic on top of @hebcal/core (offline).
 *
 * This is a planning aid, NOT a halachic ruling: customs differ by community, so every
 * non-trivial flag ends with "confirm with your mesader kiddushin". The rules follow the
 * Israeli-wedding-planner reference (Shabbat, Yom Tov & Chol HaMoed, fast days, Three Weeks
 * by custom, Omer by custom, and the two statutory memorial days).
 */

export type CalendarCustom = "ashkenaz" | "sepharad";
export type Severity = "blocked" | "avoid" | "caution" | "info" | "good";
export type Verdict = "ok" | "caution" | "avoid" | "blocked";
export type PriceLevel = "low" | "medium" | "high";

export type DateFlag = { code: string; severity: Severity; title: string; detail: string };

export type DateAssessment = {
  iso: string;
  weekday: string;
  weekdayIndex: number;
  hebrewDate: string;
  holidays: string[];
  flags: DateFlag[];
  verdict: Verdict;
  priceLevel: PriceLevel;
  priceNote: string;
  season: "winter" | "spring" | "summer" | "autumn";
  weatherNote: string;
  /** Local HH:MM times (city based). */
  sun: { sunset: string; nightfall: string; candleLighting: string };
};

const NIQQUD = /[֑-ׇ]/g;
export const stripNiqqud = (s: string) => s.replace(NIQQUD, "");

/** "ט״ו ניסן תשפ״ו" */
export function hebrewDateOf(iso: string): string {
  return stripNiqqud(new HDate(isoToDate(iso)).renderGematriya(true));
}

const SEVERITY_RANK: Record<Severity, number> = { good: 0, info: 1, caution: 2, avoid: 3, blocked: 4 };

function verdictOf(flagList: DateFlag[]): Verdict {
  const worst = flagList.reduce((w, f) => Math.max(w, SEVERITY_RANK[f.severity]), 0);
  if (worst >= SEVERITY_RANK.blocked) return "blocked";
  if (worst >= SEVERITY_RANK.avoid) return "avoid";
  if (worst >= SEVERITY_RANK.caution) return "caution";
  return "ok";
}

const ASK = " יש לאשר עם מסדר הקידושין.";

function localHm(d: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jerusalem",
  }).format(d);
}

function sunTimes(iso: string, cityKey: string) {
  const city = cityByKey(cityKey);
  const loc = new Location(city.lat, city.lon, true, "Asia/Jerusalem", city.key, "IL");
  const z = new Zmanim(loc, isoToDate(iso), false);
  const sunset = z.sunset();
  return {
    sunset: localHm(sunset),
    nightfall: localHm(z.tzeit()),
    candleLighting: localHm(new Date(sunset.getTime() - city.candleMinutes * 60_000)),
  };
}

function seasonOf(month: number): DateAssessment["season"] {
  if (month === 11 || month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

/** Relative cost of the date: weekday premium + season premium (indicative, from market norms). */
function priceOf(iso: string, month: number): { level: PriceLevel; note: string } {
  const wd = weekdayIndex(iso);
  // Sun–Wed baseline, Thu largest premium, Fri daytime meaningful, Sat night smaller.
  const weekdayPts = wd <= 3 ? 0 : wd === 4 ? 2 : wd === 5 ? 2 : 1;
  const season = seasonOf(month);
  const seasonPts = season === "winter" ? 0 : season === "summer" ? 2 : 1;
  const pts = weekdayPts + seasonPts;
  const level: PriceLevel = pts <= 1 ? "low" : pts <= 3 ? "medium" : "high";
  const parts: string[] = [];
  parts.push(wd <= 3 ? "אמצע שבוע — המחיר הבסיסי" : wd === 4 ? "יום חמישי — הפרמיה הגבוהה ביותר" : wd === 5 ? "שישי בצהריים — פרמיה משמעותית" : "מוצאי שבת — פרמיה קטנה יותר");
  parts.push(season === "winter" ? "חורף — הכי זול, ואפשר לנהל משא ומתן" : season === "summer" ? "קיץ — עונת השיא" : "עונת ביניים");
  return { level, note: `${parts.join("; ")}. אינדיקטיבי בלבד, בקשו הצעה כתובה לתאריך המדויק.` };
}

function weatherOf(month: number): string {
  if (month === 12 || month === 1 || month === 2) return "חורף: סיכוי גבוה לגשם. לאירוע בחוץ חייבים תוכנית חלופה מקורה.";
  if (month === 3 || month === 11) return "מעבר: עדיין יכול לרדת גשם, ושווה תוכנית חלופה.";
  if (month >= 6 && month <= 9) return "קיץ: חם ולח. עדיף חופה סמוך לשקיעה ומקום מוצל או ממוזג.";
  return "אביב/סתיו: מזג אוויר נוח בדרך כלל, עם סיכון לשרב או חמסין.";
}

const MODERN_TO_SHOW = new Set(["Yom HaShoah", "Yom HaZikaron", "Yom HaAtzma'ut", "Yom Yerushalayim"]);

function isPublicMinorFast(e: { getFlags(): number }): boolean {
  const f = e.getFlags();
  return (f & flags.MINOR_FAST) !== 0 && (f & (flags.YOM_KIPPUR_KATAN | flags.BEHAB)) === 0;
}

/** Names worth showing next to a date (no Rosh Chodesh, Yom Kippur Katan, Zhabotinsky Day ...). */
function holidayNames(hd: HDate): string[] {
  const evs = HebrewCalendar.getHolidaysOnDate(hd, true) ?? [];
  return evs
    .filter((e) => {
      const f = e.getFlags();
      if (f & (flags.ROSH_CHODESH | flags.BEHAB | flags.YOM_KIPPUR_KATAN)) return false;
      if (f & flags.MODERN_HOLIDAY) return MODERN_TO_SHOW.has(e.getDesc());
      return true;
    })
    .map((e) => stripNiqqud(e.renderBrief("he")));
}

function hdAbs(day: number, month: number, year: number) {
  return new HDate(day, month, year).abs();
}

/** Observed Tisha B'Av (pushed to Sunday when 9 Av is Shabbat). */
function tishaBAvEnd(year: number): number {
  const tb = new HDate(9, months.AV, year);
  return tb.getDay() === 6 ? tb.abs() + 1 : tb.abs();
}

export function assessDate(iso: string, opts: { custom: CalendarCustom; city: string }): DateAssessment {
  const date = isoToDate(iso);
  const hd = new HDate(date);
  const evs = HebrewCalendar.getHolidaysOnDate(hd, true) ?? [];
  const wd = weekdayIndex(iso);
  const year = hd.getFullYear();
  const abs = hd.abs();
  const sun = sunTimes(iso, opts.city);
  const out: DateFlag[] = [];
  const add = (code: string, severity: Severity, title: string, detail: string) => out.push({ code, severity, title, detail });
  const has = (mask: number) => evs.some((e) => (e.getFlags() & mask) !== 0);

  /* Shabbat & its eve */
  if (wd === 6) {
    add(
      "shabbat",
      "caution",
      "שבת",
      `אין חופה בשבת עצמה. אפשר רק במוצאי שבת אחרי צאת השבת (בערך ${sun.nightfall}).`,
    );
  }
  if (wd === 5) {
    add(
      "friday",
      "caution",
      "יום שישי",
      `חופה בצהריים בלבד, והאירוע חייב להסתיים לפני כניסת השבת (הדלקת נרות בערך ${sun.candleLighting}).`,
    );
  }

  /* Yom Tov, Chol HaMoed, eves */
  if (has(flags.CHAG)) {
    add("yom_tov", "blocked", "יום טוב", "לא עורכים חופה ביום טוב." + ASK);
  }
  if (has(flags.CHOL_HAMOED)) {
    add("chol_hamoed", "blocked", "חול המועד", "אין נושאים נשים במועד." + ASK);
  }
  const tomorrowEvs = HebrewCalendar.getHolidaysOnDate(new HDate(abs + 1), true) ?? [];
  const tomorrowChag = tomorrowEvs.find((e) => (e.getFlags() & flags.CHAG) !== 0);
  if (tomorrowChag && !has(flags.CHAG) && !has(flags.CHOL_HAMOED)) {
    const yk = (tomorrowChag.getFlags() & flags.MAJOR_FAST) !== 0;
    add(
      "erev_chag",
      yk ? "avoid" : "caution",
      `ערב ${stripNiqqud(tomorrowChag.renderBrief("he"))}`,
      yk
        ? "ערב יום כיפור: ההכנות לצום ולחג מקשות מאוד על אירוע." + ASK
        : "החג נכנס בערב, והאירוע חייב להסתיים לפני כניסתו." + ASK,
    );
  }

  /* Fasts */
  const majorFast = evs.find((e) => (e.getFlags() & flags.MAJOR_FAST) !== 0);
  if (majorFast) {
    add("major_fast", "blocked", stripNiqqud(majorFast.renderBrief("he")), "צום ציבורי." + ASK);
  }
  const minorFast = evs.find(isPublicMinorFast);
  if (minorFast) {
    add("minor_fast", "avoid", stripNiqqud(minorFast.renderBrief("he")), "יום צום ציבורי. כדאי להימנע, או לקיים רק אחרי סיום הצום." + ASK);
  }

  /* Three Weeks / Nine Days, by custom */
  const tammuz17 = hdAbs(17, months.TAMUZ, year);
  const av1 = hdAbs(1, months.AV, year);
  const tbEnd = tishaBAvEnd(year);
  if (opts.custom === "ashkenaz") {
    if (abs >= tammuz17 && abs <= tbEnd) {
      add(
        "three_weeks",
        "blocked",
        "שלושת השבועות",
        "מי״ז בתמוז ועד תשעה באב, לפי מנהג אשכנז, לא עורכים חתונות." + ASK,
      );
    }
  } else {
    if (abs >= av1 && abs <= tbEnd) {
      add(
        "nine_days",
        "blocked",
        "תשעת הימים",
        "מראש חודש אב ועד תשעה באב, לפי מנהג ספרד, לא עורכים חתונות." + ASK,
      );
    } else if (abs >= tammuz17 && abs < av1) {
      add(
        "three_weeks_sepharad",
        "info",
        "שלושת השבועות",
        "לפי מנהג ספרד מותר עד ראש חודש אב. מנהג אשכנז אוסר, ולכן אם יש אורחים אשכנזים כדאי לשקול זאת.",
      );
    }
  }

  /* Omer, by custom */
  const pesach = hdAbs(15, months.NISAN, year);
  const lagBaOmer = hdAbs(18, months.IYYAR, year);
  const omerLastBlocked = opts.custom === "sepharad" ? lagBaOmer : lagBaOmer - 1;
  if (abs >= pesach && abs <= omerLastBlocked) {
    add(
      "omer",
      "blocked",
      "ספירת העומר",
      (opts.custom === "sepharad"
        ? "מפסח ועד ל״ג בעומר (כולל) לא עורכים חתונות לפי מנהג ספרד."
        : "מפסח ועד ערב ל״ג בעומר לא עורכים חתונות לפי מנהג אשכנז.") +
        " יש קהילות שמתחילות כבר בראש חודש אייר, ובציונות הדתית יש מתירים ביום העצמאות." +
        ASK,
    );
  } else if (abs === lagBaOmer && opts.custom === "ashkenaz") {
    add("lag_baomer", "info", "ל״ג בעומר", "מותר לפי מנהג אשכנז, אבל זה יום מבוקש ויקר, כדאי להזמין מראש.");
  }

  /* Statutory memorial days: public entertainment is banned from sunset to nightfall */
  const memorialToday = evs.find((e) => e.getDesc() === "Yom HaShoah" || e.getDesc() === "Yom HaZikaron");
  if (memorialToday) {
    add(
      "memorial_day",
      "blocked",
      stripNiqqud(memorialToday.renderBrief("he")),
      "בחוק אסורים בו עינוגים ציבוריים, החל מהשקיעה בערב ועד צאת הכוכבים. אולמות לא יארחו אירוע.",
    );
  } else {
    const memorialTomorrow = tomorrowEvs.find((e) => e.getDesc() === "Yom HaShoah" || e.getDesc() === "Yom HaZikaron");
    if (memorialTomorrow) {
      add(
        "memorial_eve",
        "avoid",
        `ערב ${stripNiqqud(memorialTomorrow.renderBrief("he"))}`,
        `האיסור בחוק על עינוגים ציבוריים מתחיל בשקיעה (בערך ${sun.sunset}), ולכן אירוע ערב לא ייתכן.`,
      );
    }
  }

  /* Aseret Yemei Teshuva: a widespread custom to avoid, not a prohibition */
  const tishrei3 = hdAbs(3, months.TISHREI, year);
  const tishrei9 = hdAbs(9, months.TISHREI, year);
  if (abs >= tishrei3 && abs <= tishrei9 && !out.some((f) => f.severity === "blocked" || f.severity === "avoid")) {
    add("ten_days", "caution", "עשרת ימי תשובה", "רבים נוהגים להימנע מחתונה בין ראש השנה ליום כיפור." + ASK);
  }

  /* Popular / festive dates (information only) */
  const festive = evs.find((e) => ["Purim", "Tu B'Av", "Chanukah: 1 Candle"].includes(e.getDesc()) || /^Chanukah/.test(e.getDesc()));
  if (festive && !out.some((f) => f.severity === "blocked")) {
    add("festive", "info", stripNiqqud(festive.renderBrief("he")), "מותר, אבל תאריך עמוס וייתכנו מחירים גבוהים וזמינות נמוכה של ספקים.");
  }

  const month = date.getUTCMonth() + 1;
  const price = priceOf(iso, month);
  if (out.length === 0) add("clear", "good", "אין מגבלות לוח", "לא מצאנו מגבלה הלכתית או חוקית ידועה בתאריך הזה.");

  // worst first, then stable
  out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  return {
    iso,
    weekday: weekdayName(iso),
    weekdayIndex: wd,
    hebrewDate: stripNiqqud(hd.renderGematriya(true)),
    holidays: holidayNames(hd),
    flags: out,
    verdict: verdictOf(out),
    priceLevel: price.level,
    priceNote: price.note,
    season: seasonOf(month),
    weatherNote: weatherOf(month),
    sun,
  };
}

export type ScanOptions = {
  from: string;
  to: string;
  custom: CalendarCustom;
  city: string;
  /** Allowed weekday indexes (0=Sunday). Default: all. */
  weekdays?: number[];
  /** Drop dates whose verdict is worse than this. Default "caution". */
  worstAllowed?: Verdict;
  maxDays?: number;
};

const VERDICT_RANK: Record<Verdict, number> = { ok: 0, caution: 1, avoid: 2, blocked: 3 };

/** All dates in [from, to] that pass the filters, ordered by date. */
export function scanDates(opts: ScanOptions): DateAssessment[] {
  const worst = VERDICT_RANK[opts.worstAllowed ?? "caution"];
  const limit = opts.maxDays ?? 500;
  const out: DateAssessment[] = [];
  let cursor = opts.from;
  for (let i = 0; i < limit && cursor <= opts.to; i++) {
    if (!opts.weekdays || opts.weekdays.includes(weekdayIndex(cursor))) {
      const a = assessDate(cursor, { custom: opts.custom, city: opts.city });
      if (VERDICT_RANK[a.verdict] <= worst) out.push(a);
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}
