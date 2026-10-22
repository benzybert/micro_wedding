/** Run-of-show for a ~40-guest evening wedding. Minutes are relative to the chuppah start (0). */
export type TimelineTemplateItem = { offsetMin: number; durationMin: number; title: string; notes?: string };

export const TIMELINE_TEMPLATE: TimelineTemplateItem[] = [
  { offsetMin: -120, durationMin: 60, title: "הגעת הספקים: עיצוב, סאונד וצילום", notes: "מישהו אחראי פותח את המקום ומראה לספקים איפה להציב." },
  { offsetMin: -60, durationMin: 30, title: "הכנות אחרונות ואיפור", notes: "בני הזוג מוכנים, הצלם מצלם את ההכנות." },
  { offsetMin: -45, durationMin: 45, title: "קבלת פנים לאורחים", notes: "שתייה, חטיפים, מקבלים את האורחים בנפרד או יחד." },
  { offsetMin: 0, durationMin: 25, title: "חופה", notes: "מסדר/ת הטקס, עדים, טבעות, שבע ברכות." },
  { offsetMin: 25, durationMin: 15, title: "יחוד / רגע פרטי", notes: "רבע שעה לבד, עם משהו לאכול." },
  { offsetMin: 40, durationMin: 30, title: "צילומים משפחתיים", notes: "רשימת צילומים מראש: מי עם מי." },
  { offsetMin: 70, durationMin: 15, title: "כניסה לסעודה וברכת המוציא" },
  { offsetMin: 85, durationMin: 45, title: "מנה ראשונה וברכות" },
  { offsetMin: 130, durationMin: 60, title: "מנה עיקרית ושיחה" },
  { offsetMin: 190, durationMin: 60, title: "ריקודים ומוזיקה" },
  { offsetMin: 250, durationMin: 20, title: "עוגה וקינוח" },
  { offsetMin: 270, durationMin: 0, title: "סיום וחלוקת מתנות לאורחים" },
];

/** "18:00" + offset minutes → "HH:MM" (wraps past midnight). */
export function addMinutes(hhmm: string, minutes: number): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
