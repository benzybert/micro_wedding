/**
 * Indicative Israeli wedding cost data (2026). NOT quotes: ranges move with region, season, weekday and
 * guest count, and no official body publishes them. Always collect written quotes (and ask whether the
 * per-plate price is before or after 18% VAT).
 */

export type BudgetCategory = {
  key: string;
  he: string;
  /** Share of a typical budget (sums to 1). */
  share: number;
  hint: string;
};

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { key: "venue_catering", he: "מקום ואוכל", share: 0.56, hint: "מחיר לצלחת × סועדים. הסעיף הגדול ביותר. לברר אם המחיר לפני או אחרי מע״מ." },
  { key: "photo_video", he: "צילום ווידאו", share: 0.1, hint: "חבילה בסיסית מ-5,000 ₪, מלאה ופרימיום 10,000–15,000 ₪." },
  { key: "music", he: "מוזיקה", share: 0.06, hint: "DJ או הרכב. כולל רישיון אקו״ם (קבוע לאירוע)." },
  { key: "attire", he: "לבוש", share: 0.07, hint: "שמלה (קנייה, השכרה או תפירה) וחליפה." },
  { key: "beauty", he: "איפור ושיער", share: 0.03, hint: "כדאי ניסיון לפני ההזמנה." },
  { key: "flowers_design", he: "פרחים ועיצוב", share: 0.05, hint: "חופה, שולחנות. הרבה מקומות עובדים עם מעצבים חיצוניים." },
  { key: "invitations", he: "הזמנות", share: 0.02, hint: "הזמנה דיגיטלית עולה מעט, מגנטים מודפסים יותר." },
  { key: "ceremony_fees", he: "טקס ורישום", share: 0.01, hint: "אגרת רישום ברבנות, מסדר קידושין פרטי, או אגרות נישואין אזרחיים." },
  { key: "other", he: "הסעות, מתנות ושונות", share: 0.05, hint: "הסעות, מתנות לאורחים, תשר." },
  { key: "contingency", he: "רזרבה", share: 0.05, hint: "הוצאות שלא חזיתם. מומלץ לא לוותר עליה." },
];

export const BUDGET_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.key, c.he]));

/** 2026 family-event tariff (T008) for ACUM, incl. VAT. Re-published every year, confirm before paying. */
export const ACUM_FAMILY_EVENT_2026 = 395.3;
/** Rabbinate marriage registration fee from 1 Jan 2026; 40% discount for eligible groups. Confirm yearly. */
export const RABBINATE_FEE_2026 = 844;

/** Per-plate bands (₪), central Israel vs periphery. Micro weddings often pay more per plate because of venue minimums. */
export const PER_PLATE_BANDS = [
  { type: "אולם בסיסי", central: [250, 290], periphery: [170, 240] },
  { type: "אולם בינוני", central: [290, 350], periphery: [240, 300] },
  { type: "אולם/גן יוקרתי", central: [350, 500], periphery: [300, 420] },
  { type: "מקום יוקרה", central: [500, 800], periphery: [400, 600] },
] as const;
