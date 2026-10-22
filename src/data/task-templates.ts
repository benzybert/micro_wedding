import type { CeremonyTrack } from "@/db/schema";

/**
 * Starter checklist for an Israeli micro wedding. `offsetDays` = days BEFORE the wedding (negative = after).
 * Dates are derived from the wedding date at read time, so changing the date moves every task.
 * Content follows the Israeli-wedding-planner reference; figures are 2026 and must be re-checked.
 */
export type TaskTemplate = {
  key: string;
  title: string;
  notes?: string;
  category: TaskCategory;
  offsetDays: number;
  hard?: boolean;
  link?: string;
  /** Only for these ceremony tracks (default: all). */
  tracks?: CeremonyTrack[];
};

export type TaskCategory = "planning" | "legal" | "vendors" | "guests" | "attire" | "logistics" | "after";

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  planning: "תכנון",
  legal: "רישום וטקס",
  vendors: "ספקים",
  guests: "אורחים",
  attire: "לבוש ויופי",
  logistics: "לוגיסטיקה",
  after: "אחרי החתונה",
};

const RELIGIOUS: CeremonyTrack[] = ["rabbinate", "private_rabbi"];

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    key: "budget",
    title: "לקבוע תקציב כולל ותקרת אורחים",
    notes: "במיקרו חתונה התקרה היא ההחלטה הכי משפיעה: היא קובעת איזה מקום, איזה אוכל וכמה נשאר לשאר.",
    category: "planning",
    offsetDays: 180,
    link: "/budget",
  },
  {
    key: "pick-date",
    title: "לבחור תאריך שמתאים ללוח העברי ולמנהג שלכם",
    notes: "בודקים שבת, חגים, צומות, ספירת העומר ושלושת השבועות לפי המנהג, ואת הימים הממוקדים לחיסכון (ראשון עד רביעי, חורף).",
    category: "planning",
    offsetDays: 180,
    link: "/date",
  },
  {
    key: "guest-list-draft",
    title: "לגבש רשימת אורחים: א׳ (חייבים), ב׳ (רוצים), ג׳ (אם יהיה מקום)",
    category: "guests",
    offsetDays: 170,
    link: "/guests",
  },
  {
    key: "ceremony-track",
    title: "להחליט על מסלול הנישואין",
    notes: "רבנות, מסדר קידושין פרטי עם רישום ברבנות, נישואין אזרחיים בחו״ל (קפריסין או יוטה בזום) או מסלול אחר. ההחלטה משפיעה על המסמכים והלו״ז.",
    category: "legal",
    offsetDays: 160,
    link: "/decisions",
  },
  {
    key: "venue",
    title: "להזמין מקום ולחתום על חוזה ברור",
    notes:
      "לבקש בכתב: מחיר לצלחת לפני או אחרי מע״מ (18%), מינימום ומקסימום סועדים, מה כלול (חניה, עמדת DJ, עיצוב), רישיון עסק מוצג, תפוסה מרבית בכתב, תנאי ביטול וסעיף דחייה (מצב ביטחוני, צו קריאה, הגבלת התקהלות), ותוכנית גשם לגן.",
    category: "vendors",
    offsetDays: 160,
    link: "/decisions",
  },
  {
    key: "postponement-clause",
    title: "לוודא סעיף דחייה בחוזים (נפרד מביטול)",
    notes:
      "הסעיף צריך לכלול טריגרים שניתן לאמת (מצב מיוחד בעורף, הוראת פיקוד העורף, צו סגירה, צו קריאה) והעברת המקדמה במלואה לתאריך חדש. כדאי לשאול סוכן ביטוח בכתב אם הגבלת התקהלות מכוסה בביטוח אירוע.",
    category: "vendors",
    offsetDays: 150,
  },
  { key: "photographer", title: "להזמין צלם/ת (ווידאו אם רוצים)", category: "vendors", offsetDays: 140, link: "/vendors" },
  {
    key: "music",
    title: "להזמין מוזיקה ולהסכים מי משלם אקו״ם",
    notes: "גם נגן/ית אחד או פלייליסט מחייבים רישיון אקו״ם. כדאי להגדיר בחוזה מי משלם.",
    category: "vendors",
    offsetDays: 130,
    link: "/vendors",
  },
  {
    key: "attire",
    title: "לבחור שמלה וחליפה (ולקבוע התאמות)",
    notes: "שמלה בהזמנה אישית דורשת בדרך כלל 4 עד 6 חודשים. קנייה או השכרה מהירות יותר.",
    category: "attire",
    offsetDays: 130,
  },
  { key: "makeup", title: "להזמין איפור ושיער (כולל ניסיון)", category: "attire", offsetDays: 110, link: "/vendors" },
  { key: "flowers", title: "לבחור עיצוב ופרחים", category: "vendors", offsetDays: 100, link: "/vendors" },
  {
    key: "marriage-docs",
    title: "לאסוף מסמכים לתיק נישואין",
    notes:
      "תעודת זהות מקורית של שניכם, תמונת פספורט לכל אחד, כתובה של ההורים (מקור או העתק מאושר), וכל מסמך נוסף שהלשכה תבקש (למשל תעודת רווקות או עדות). עולים וגרים צריכים מסמכים נוספים.",
    category: "legal",
    offsetDays: 100,
    tracks: RELIGIOUS,
  },
  {
    key: "berur-yahadut",
    title: "לבדוק אם נדרש בירור יהדות",
    notes:
      "אם להורים אין כתובה מהרבנות בישראל ייתכן שייפתח בירור יהדות. זה מסלול נפרד בבית דין אזורי, ללא עלות, אבל אין זמן סיום מובטח. עדיף להתחיל מוקדם. אם קרוב מדרגה ראשונה כבר נישא בארץ דרך בירור, ייתכן שתהיו פטורים.",
    category: "legal",
    offsetDays: 150,
    tracks: RELIGIOUS,
  },
  {
    key: "prenup",
    title: "להחליט על הסכם ממון (לפני החתונה)",
    notes:
      "הסכם ממון שנחתם לפני החתונה אפשר לאשר אצל נוטריון, או אצל רשם הנישואין אם נעשה לפני או בעת הנישואין. אחרי החתונה צריך אישור בית משפט לענייני משפחה או בית דין. זה הפריט היחיד בלו״ז שנעשה קשה יותר אחרי החופה.",
    category: "legal",
    offsetDays: 60,
  },
  {
    key: "get-prenup",
    title: "לשקול הסכם למניעת סרבנות גט",
    notes: "צהר, איתים עם יד לאישה וכולך מפרסמים טפסים חינמיים. מומלץ לחתום לפני החופה, אפשר גם אחריה.",
    category: "legal",
    offsetDays: 60,
    tracks: RELIGIOUS,
  },
  {
    key: "open-marriage-file",
    title: "לפתוח תיק נישואין בלשכת הרישום",
    notes:
      "שניכם מגיעים יחד. אפשר בכל לשכה בארץ, ולפעמים להתחיל בשירת הים. המועד האחרון הוא 45 יום לפני החתונה. אפשר לפתוח עד כשלושה חודשים מראש. אגרה ב-2026: 844 ₪ (מתעדכנת בינואר, יש הנחה של 40% לזכאים).",
    category: "legal",
    offsetDays: 75,
    hard: true,
    tracks: RELIGIOUS,
  },
  {
    key: "invitations",
    title: "לעצב ולהכין הזמנה (דיגיטלית או מודפסת)",
    category: "guests",
    offsetDays: 90,
  },
  {
    key: "send-wave-a",
    title: "לשלוח הזמנות לרשימה א׳",
    notes: "שולחים בוואטסאפ עם קישור אישי לאישור הגעה.",
    category: "guests",
    offsetDays: 75,
    link: "/guests/invite",
  },
  { key: "transport", title: "לסגור הסעות / חניה לאורחים", category: "logistics", offsetDays: 60 },
  {
    key: "ceremony-plan",
    title: "לתכנן את הטקס",
    notes: "מי מסדר/ת, נוסח, עדים, ברכות, שירים, מי מלווה אתכם לחופה.",
    category: "legal",
    offsetDays: 60,
  },
  {
    key: "send-wave-b",
    title: "גל הזמנות שני מרשימה ב׳ (לפי מקומות שהתפנו)",
    category: "guests",
    offsetDays: 50,
    link: "/guests/invite",
  },
  {
    key: "rsvp-deadline",
    title: "מועד אחרון לאישורי הגעה ותזכורות לממתינים",
    category: "guests",
    offsetDays: 30,
    link: "/guests",
  },
  { key: "final-fitting", title: "מדידה אחרונה (שמלה וחליפה)", category: "attire", offsetDays: 30 },
  {
    key: "menu",
    title: "לסגור תפריט והעדפות תזונה עם המקום",
    notes: "הסיכום הכולל צמחונים, טבעונים, ללא גלוטן ואלרגיות מופיע בעמוד האורחים.",
    category: "vendors",
    offsetDays: 21,
    link: "/guests",
  },
  { key: "seating", title: "לסדר הושבה", category: "guests", offsetDays: 14, link: "/guests/seating" },
  {
    key: "day-timeline",
    title: "לשלוח לספקים לו״ז ליום החתונה",
    category: "logistics",
    offsetDays: 14,
    link: "/timeline",
  },
  {
    key: "final-headcount",
    title: "לאשר מספר סועדים סופי מול המקום",
    notes: "שבוע לפני. מי שלא ענה לתזכורות, ברור איתו בטלפון.",
    category: "vendors",
    offsetDays: 7,
    link: "/guests",
  },
  {
    key: "mikveh",
    title: "לתאם טבילה במקווה (1 עד 7 ימים לפני)",
    category: "legal",
    offsetDays: 7,
    tracks: RELIGIOUS,
  },
  {
    key: "acum",
    title: "לשלם ולדווח על רישיון אקו״ם",
    notes: "לפחות 72 שעות לפני האירוע, באתר אקו״ם. תעריף אירוע משפחתי ב-2026: 395.30 ₪ כולל מע״מ.",
    category: "vendors",
    offsetDays: 7,
    hard: true,
  },
  {
    key: "payments",
    title: "להכין תשלומי יתרה ומעטפות לספקים",
    category: "logistics",
    offsetDays: 5,
    link: "/budget",
  },
  {
    key: "ceremony-items",
    title: "טבעות, כתובה, כוס ועדים",
    notes: "מוודאים שהטבעות והכתובה אצל מישהו אחראי, ושיש שני עדים כשרים.",
    category: "legal",
    offsetDays: 3,
    tracks: RELIGIOUS,
  },
  {
    key: "marriage-certificate",
    title: "לאסוף תעודת נישואין ולעדכן מעמד במשרד הפנים",
    notes: "מסדר הקידושין מעביר את הנישואין לרשות האוכלוסין. בודקים שהמעמד התעדכן, ומשנים שם משפחה אם רוצים. את הכתובה שומרים במקום בטוח.",
    category: "after",
    offsetDays: -14,
    tracks: RELIGIOUS,
  },
  { key: "thank-you", title: "להודות לאורחים ולספקים", category: "after", offsetDays: -14 },

  /* Civil marriage abroad */
  {
    key: "civil-choose",
    title: "לבחור: קפריסין או נישואין אזרחיים בזום (יוטה)",
    notes:
      "קפריסין: כ-3,000 עד 7,000 ₪ הכל כלול (אינדיקטיבי), טיול של יום או יומיים. יוטה בזום: כ-1,900 עד 3,000 ₪, בלי נסיעה. שני המסלולים נרשמים במשרד הפנים. הרישום אינו מסדיר מעמד לבן/בת זוג שאינם אזרחים.",
    category: "legal",
    offsetDays: 120,
    tracks: ["civil_abroad"],
  },
  {
    key: "civil-book",
    title: "להזמין תאריך וטקס (עירייה בקפריסין או נציג בזום)",
    notes: "לברר עם העירייה בקפריסין אילו מסמכים נדרשים ממי. ביוטה, הרשם יקריא אזהרה בקול לפני הטקס, וזה תקין.",
    category: "legal",
    offsetDays: 90,
    tracks: ["civil_abroad"],
  },
  {
    key: "civil-apostille",
    title: "אפוסטיל על התעודה",
    category: "legal",
    offsetDays: -3,
    tracks: ["civil_abroad"],
  },
  {
    key: "civil-register",
    title: "לרשום את הנישואין במשרד הפנים",
    notes: "תרגום נוטריוני לעברית. כדאי לבקש מפקיד תמצית רישום מודפסת במקום עמדת שירות עצמי.",
    category: "after",
    offsetDays: -14,
    tracks: ["civil_abroad"],
  },
];

export function templatesForTrack(track: CeremonyTrack): TaskTemplate[] {
  return TASK_TEMPLATES.filter((t) => !t.tracks || t.tracks.includes(track));
}
