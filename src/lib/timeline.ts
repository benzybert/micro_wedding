// The planning timeline, built backwards from the wedding date. Offsets follow the
// planning guide's standard timeline (written for a full-size wedding). For a micro
// wedding most soft steps can be squeezed, so a step whose recommended date has
// passed shows as "now", not as a failure. Only statutory cut-offs can be "missed".

import { ACUM, RABBINATE } from "@/config/benchmarks";
import { addDays, diffDays } from "./hebrew-calendar";
import type { Profile, Route } from "./state";

export type Phase = "planning" | "vendors" | "legal" | "final" | "after";

export const PHASE_LABEL: Record<Phase, string> = {
  planning: "תכנון",
  vendors: "ספקים",
  legal: "רישום וחוק",
  final: "ממש לפני",
  after: "אחרי החתונה",
};

export interface TaskDef {
  id: string;
  title: string;
  detail?: string;
  phase: Phase;
  /** Recommended date, in days before the wedding (negative: after it). */
  daysBefore: number;
  /** Hard cut-off, in days before the wedding. */
  latestDaysBefore?: number;
  routes?: Route[];
  when?: (p: Profile) => boolean;
  href?: string;
}

const MONTH = 30;

export const TASKS: TaskDef[] = [
  // planning
  { id: "budget", title: "לקבוע תקציב ומספר מוזמנים משוער", phase: "planning", daysBefore: 12 * MONTH, href: "/budget" },
  { id: "date", title: "לאשר תאריך שפנוי לפי הלוח העברי והמנהג שלכם", phase: "planning", daysBefore: 12 * MONTH, href: "/date" },
  {
    id: "berur",
    title: "ברור יהדות: להתחיל מיד",
    detail:
      "אין זמן טיפול מפורסם, ולכן אי אפשר לתכנן לפי מספר. פותחים תיק בבית הדין האזורי הקרוב. אם קרוב מדרגה ראשונה כבר נישא בישראל דרך ברור, ייתכן פטור. ארגון ITIM מלווה בתהליך.",
    phase: "legal",
    daysBefore: 13 * MONTH,
    routes: ["rabbinate"],
    when: (p) => p.needsBerur,
    href: "/route",
  },
  {
    id: "waiting-period",
    title: "לוודא את 90 הימים להבחנה מול לשכת רישום הנישואין",
    detail: "גרושה או אלמנה ממתינה 90 יום. מה מתחיל את הספירה שנוי במחלוקת, ולכן המועד הקובע הוא זה שהלשכה מקבלת.",
    phase: "legal",
    daysBefore: 12 * MONTH,
    when: (p) => p.previouslyMarried,
    href: "/date",
  },
  {
    id: "foreign-spouse",
    title: "לתכנן את הליך המעמד לבן או בת זוג שאינם אזרחים",
    detail:
      "רישום הנישואין במרשם אינו מעמד. ההליך מדורג: עד שישה חודשים ברישיון ב/1, אחר כך א/5 לשנה ועד ארבע שנים, עם ראיון על אמיתות הקשר.",
    phase: "legal",
    daysBefore: 12 * MONTH,
    when: (p) => p.foreignSpouse,
    href: "/route",
  },
  { id: "rabbinate-docs", title: "להתחיל לאסוף מסמכים לתיק הנישואין", phase: "legal", daysBefore: 12 * MONTH, routes: ["rabbinate"], href: "/route" },

  // vendors
  {
    id: "venue",
    title: "לסגור מקום ואוכל, אחרי שלוש הצעות בכתב",
    detail: "מחיר לצלחת לפני או אחרי מע״מ, מינימום מוזמנים, רישיון עסק מוצג ותקרת תפוסה בכתב, וסעיף דחייה.",
    phase: "vendors",
    daysBefore: 12 * MONTH,
    href: "/vendors",
  },
  { id: "photo", title: "לסגור צלם וצלם וידאו", phase: "vendors", daysBefore: 10 * MONTH, href: "/vendors" },
  { id: "music", title: "לסגור תקליטן או להקה, ולהחליט מי משלם אקו״ם", phase: "vendors", daysBefore: 10 * MONTH, href: "/vendors" },
  { id: "dress", title: "לבחור שמלה וחליפה (להתאמות צריך 4–6 חודשים)", phase: "vendors", daysBefore: 8 * MONTH },
  { id: "makeup", title: "לסגור איפור ושיער, אחרי ניסיון", phase: "vendors", daysBefore: 6 * MONTH, href: "/vendors" },
  { id: "invitations", title: "להזמין הזמנות ומגנטים", phase: "vendors", daysBefore: 6 * MONTH },
  { id: "flowers", title: "לסגור פרחים ועיצוב, אחרי ביקור במקום", phase: "vendors", daysBefore: 6 * MONTH, href: "/vendors" },

  // legal: rabbinate
  {
    id: "rabbinate-open",
    title: "לפתוח תיק נישואין. המועד האחרון הוא 45 יום לפני החתונה",
    detail:
      "שני בני הזוג מגיעים יחד, בכל לשכת רישום שבחרתם. אפשר להתחיל באינטרנט במערכת שירת הים, וההגעה הפיזית עדיין חובה. ITIM מציינת עד שלושה חודשים מראש כנקודת הפתיחה המעשית.",
    phase: "legal",
    daysBefore: RABBINATE.recommendedToDaysBefore,
    latestDaysBefore: RABBINATE.latestOpenDaysBefore,
    routes: ["rabbinate"],
    href: "/route",
  },
  { id: "witnesses", title: "לארגן שני עדים כשרים לכתובה, שאינם קרובי דם של אחד מכם", phase: "final", daysBefore: 14, routes: ["rabbinate"] },
  { id: "mikveh", title: "לתאם טבילה במקווה (1–7 ימים לפני)", phase: "final", daysBefore: 7, routes: ["rabbinate"] },

  // legal: civil routes
  {
    id: "cyprus-municipality",
    title: "לברר מול העירייה בקפריסין מה היא דורשת: תיק משותף או נפרד לכל אחד",
    detail: "העיריות שונות זו מזו. מבררים לפני שמזמינים טיסה.",
    phase: "legal",
    daysBefore: 6 * MONTH,
    routes: ["cyprus"],
    href: "/route",
  },
  { id: "cyprus-trip", title: "להזמין טיסות ותור לטקס", phase: "legal", daysBefore: 4 * MONTH, routes: ["cyprus"] },
  {
    id: "utah-officiant",
    title: "לבחור מכהן ולתאם טקס בזום",
    detail: "בטקס יקרא המכהן בקול אזהרה שנישואין מקוונים עלולים להיות לא תקפים במקום מגוריכם. זה נדרש בחוק של יוטה.",
    phase: "legal",
    daysBefore: 4 * MONTH,
    routes: ["utah"],
    href: "/route",
  },

  // legal: all routes
  {
    id: "prenup-property",
    title: "הסכם ממון: לחתום לפני החתונה",
    detail:
      "לפני הנישואין אפשר לאשר אותו אצל נוטריון, ולפני או בזמן הנישואין גם אצל רשם הנישואין. אחרי החתונה צריך אישור של בית המשפט לענייני משפחה או של בית דין דתי. אין חובה לחתום.",
    phase: "legal",
    daysBefore: MONTH,
    latestDaysBefore: 1,
  },
  {
    id: "prenup-get",
    title: "הסכם מניעת סרבנות גט: מומלץ לפני החופה",
    detail: "אפשר לחתום גם אחרי. טופס חינמי מפרסמים צהר, ITIM עם יד לאשה וקולך. האימות שונה בין הטפסים.",
    phase: "legal",
    daysBefore: MONTH,
    routes: ["rabbinate", "cyprus", "utah"],
  },

  // final month
  { id: "headcount-seating", title: "לסגור רשימת מוזמנים וסידורי ישיבה", phase: "final", daysBefore: MONTH, href: "/guests" },
  { id: "transport", title: "לארגן הסעות, אם צריך", phase: "final", daysBefore: 3 * MONTH },
  { id: "fitting", title: "התאמה אחרונה לשמלה ולחליפה", phase: "final", daysBefore: MONTH },
  { id: "confirm-vendors", title: "לאשר את כל הספקים בכתב", phase: "final", daysBefore: MONTH, href: "/vendors" },
  {
    id: "acum",
    title: "לשלם ולדווח רישיון אקו״ם, לפחות 72 שעות לפני",
    detail: `תעריף ${ACUM.fee} ₪ כולל מע״מ לאירוע משפחתי (2026). משלמים באתר acum.org.il. כל השמעת מוזיקה דורשת רישיון, גם רשימת שירים.`,
    phase: "final",
    daysBefore: 14,
    latestDaysBefore: ACUM.payDaysBefore,
  },
  { id: "final-count", title: "לאשר מספר מוזמנים סופי מול המקום", phase: "final", daysBefore: 7, href: "/guests" },
  { id: "day-schedule", title: "להכין לוח זמנים ליום החתונה ולשלוח לספקים", phase: "final", daysBefore: 7 },

  // after
  {
    id: "certificate",
    title: "לאסוף תעודת נישואין ולוודא שהמעמד עודכן במשרד הפנים",
    detail: "מסדר הקידושין מעביר את הנישואין לרשות האוכלוסין. אם אחד מכם מחליף שם משפחה, עושים זאת במשרד הפנים.",
    phase: "after",
    daysBefore: -14,
    routes: ["rabbinate"],
  },
  {
    id: "civil-apostille",
    title: "לקבל אפוסטיל על התעודה ולרשום במשרד הפנים עם תרגום נוטריוני",
    detail: "במשרד הפנים בקשו מפקיד להפיק תמצית רישום חדשה, ולא מהעמדה האוטומטית. יש משרדים שלא מקבלים אותה.",
    phase: "after",
    daysBefore: -21,
    routes: ["cyprus", "utah"],
    href: "/route",
  },
  { id: "ketubah", title: "לשמור את הכתובה במקום בטוח", detail: "היא המסמך המחייב אם הנישואין יידונו בבית דין.", phase: "after", daysBefore: -14, routes: ["rabbinate"] },
];

export type TaskStatus = "done" | "missed" | "now" | "soon" | "later";

export interface TimelineTask extends TaskDef {
  due: string;
  latest: string | null;
  status: TaskStatus;
  doneKey: string;
}

export const taskKey = (id: string) => `task:${id}`;

export function buildTimeline(profile: Profile, done: Record<string, boolean>, today: string): TimelineTask[] {
  if (!profile.weddingDate) return [];
  const wedding = profile.weddingDate;
  const out: TimelineTask[] = [];

  for (const t of TASKS) {
    if (t.routes && !t.routes.includes(profile.route)) continue;
    if (t.when && !t.when(profile)) continue;
    const due = addDays(wedding, -t.daysBefore);
    const latest = t.latestDaysBefore === undefined ? null : addDays(wedding, -t.latestDaysBefore);
    const doneKey = taskKey(t.id);

    let status: TaskStatus;
    if (done[doneKey]) status = "done";
    else if (latest !== null && diffDays(latest, today) > 0) status = "missed";
    else if (diffDays(today, due) < 0) status = "now";
    else if (diffDays(today, due) <= 14) status = "soon";
    else status = "later";

    out.push({ ...t, due, latest, status, doneKey });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
}
