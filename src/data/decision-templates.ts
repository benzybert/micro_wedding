import type { CeremonyTrack } from "@/db/schema";

/**
 * Typical micro-wedding decisions, each with starter criteria (editable) and, where useful,
 * starter options. `offsetDays` = days before the wedding by which it should be settled.
 */
export type DecisionTemplate = {
  key: string;
  title: string;
  category: "date" | "venue" | "ceremony" | "vendors" | "attire" | "guests" | "design";
  description: string;
  offsetDays: number;
  priority: "high" | "normal" | "low";
  criteria: { name: string; weight: number }[];
  options?: { name: string; details?: string }[];
  tracks?: CeremonyTrack[];
  link?: string;
};

export const DECISION_TEMPLATES: DecisionTemplate[] = [
  {
    key: "date",
    title: "תאריך החתונה",
    category: "date",
    description: "בודקים את התאריכים האפשריים בעמוד התאריך, ואז מחליטים כאן. תאריך קובע זמינות של מקום וספקים.",
    offsetDays: 180,
    priority: "high",
    criteria: [
      { name: "זמינות האורחים החשובים", weight: 5 },
      { name: "התאמה ללוח העברי ולמנהג", weight: 5 },
      { name: "מחיר (יום בשבוע ועונה)", weight: 4 },
      { name: "מזג אוויר", weight: 3 },
      { name: "משמעות אישית לשניכם", weight: 3 },
    ],
    link: "/date",
  },
  {
    key: "guest-cap",
    title: "תקרת אורחים",
    category: "guests",
    description: "כמה מקומות יש? המספר הזה קובע מקום, תקציב ומי נכנס לרשימה.",
    offsetDays: 175,
    priority: "high",
    criteria: [
      { name: "תקציב", weight: 5 },
      { name: "אינטימיות", weight: 4 },
      { name: "מי יפגע אם לא יוזמן", weight: 3 },
    ],
    options: [{ name: "עד 20 איש" }, { name: "עד 40 איש" }, { name: "עד 60 איש" }],
  },
  {
    key: "ceremony-track",
    title: "מסלול הנישואין",
    category: "ceremony",
    description:
      "רבנות היא המסלול היחיד לחופה דתית יהודית שנרשמת בארץ. נישואין אזרחיים בחו״ל (קפריסין או יוטה בזום) נרשמים במשרד הפנים. רישום אינו מכריע על תוקף לכל מטרה, ולבן/בת זוג שאינם אזרחים הוא לא מסדיר מעמד.",
    offsetDays: 160,
    priority: "high",
    criteria: [
      { name: "הכרה ורישום", weight: 5 },
      { name: "התאמה לערכים שלנו", weight: 5 },
      { name: "קבלה על ידי המשפחה", weight: 3 },
      { name: "עלות", weight: 3 },
      { name: "פשטות וזמן", weight: 3 },
    ],
    options: [
      { name: "רבנות עם מסדר קידושין מטעם הרבנות", details: "מסדר הקידושין מטעם הרבנות בלי עלות נוספת." },
      { name: "מסדר קידושין פרטי ורישום ברבנות", details: "בחירת רב שאתם מכירים, בעלות נוספת." },
      { name: "קפריסין", details: "נסיעה של יום או יומיים, רישום במשרד הפנים אחרי אפוסטיל ותרגום." },
      { name: "יוטה בזום", details: "אונליין, אפוסטיל ותרגום, ורישום במשרד הפנים." },
      { name: "טקס אישי ללא תוקף משפטי, והרישום בנפרד", details: "טקס משמעותי שאתם מעצבים בעצמכם." },
    ],
  },
  {
    key: "venue-type",
    title: "סוג המקום",
    category: "venue",
    description: "מסעדה, גן אירועים, וילה, טבע או אולם קטן. בחירה בסוג המקום מצמצמת את החיפוש.",
    offsetDays: 165,
    priority: "high",
    criteria: [
      { name: "מחיר כולל (מקום ואוכל)", weight: 5 },
      { name: "אווירה", weight: 4 },
      { name: "גשם או חום: יש תוכנית?", weight: 3 },
      { name: "כשרות שמתאימה לאורחים", weight: 4 },
      { name: "נגישות וחניה", weight: 3 },
      { name: "תפוסה: מינימום ומקסימום", weight: 4 },
    ],
    options: [{ name: "מסעדה" }, { name: "גן אירועים" }, { name: "וילה או בית פרטי" }, { name: "חוף או טבע" }, { name: "אולם קטן" }],
  },
  {
    key: "venue",
    title: "המקום הספציפי",
    category: "venue",
    description:
      "משווים 3 הצעות כתובות לאותו תאריך ואותה כמות אורחים. לשאול: מחיר לצלחת לפני/אחרי מע״מ, מה כלול, רישיון עסק, תפוסה בכתב, תנאי דחייה וביטול.",
    offsetDays: 160,
    priority: "high",
    criteria: [
      { name: "מחיר כולל מע״מ", weight: 5 },
      { name: "אווירה", weight: 4 },
      { name: "הסעיפים בחוזה (דחייה וביטול)", weight: 4 },
      { name: "נוחות לאורחים", weight: 3 },
      { name: "הרגשה אחרי הסיור", weight: 4 },
    ],
  },
  {
    key: "food",
    title: "סגנון הסעודה",
    category: "venue",
    description: "ארוחה מסודרת, בופה, עמידה או ברנץ׳. במיקרו אפשר להשקיע באוכל ולא באולם.",
    offsetDays: 120,
    priority: "normal",
    criteria: [
      { name: "טעם", weight: 5 },
      { name: "מחיר לאדם", weight: 4 },
      { name: "התאמה לתזונות שונות", weight: 3 },
      { name: "אינטימיות והשיחה", weight: 3 },
    ],
    options: [{ name: "ארוחה מסודרת" }, { name: "בופה" }, { name: "קוקטייל בעמידה" }, { name: "ברנץ׳" }],
  },
  {
    key: "photographer",
    title: "צלם/ת",
    category: "vendors",
    description: "בודקים תיק עבודות מלא (לא רק רילז), כמה תמונות ערוכות, מועד מסירה מובטח בכתב, ועל מה אפשר להתפשר.",
    offsetDays: 140,
    priority: "normal",
    criteria: [
      { name: "סגנון שמתאים לנו", weight: 5 },
      { name: "מחיר", weight: 4 },
      { name: "כימיה ונוחות", weight: 4 },
      { name: "זמן מסירה בכתב", weight: 3 },
    ],
  },
  {
    key: "music",
    title: "מוזיקה",
    category: "vendors",
    description: "ב-DJ, הרכב חי או פלייליסט, הרישיון (אקו״ם) חל על כולם. כדאי להסכים מי משלם.",
    offsetDays: 130,
    priority: "normal",
    criteria: [
      { name: "אווירה", weight: 5 },
      { name: "מחיר", weight: 4 },
      { name: "ציוד כלול", weight: 3 },
      { name: "גמישות ברפרטואר", weight: 3 },
    ],
    options: [{ name: "DJ" }, { name: "הרכב חי" }, { name: "נגן/ית בטקס ופלייליסט" }],
  },
  {
    key: "officiant",
    title: "מי עורך/ת את הטקס",
    category: "ceremony",
    description: "מסדר קידושין מהרבנות (בלי עלות נוספת), רב או רבה שאתם מכירים, או עורך/ת טקס אזרחי.",
    offsetDays: 120,
    priority: "normal",
    criteria: [
      { name: "חיבור אישי", weight: 5 },
      { name: "הכרה ורישום", weight: 5 },
      { name: "גמישות בנוסח", weight: 3 },
      { name: "עלות", weight: 2 },
    ],
  },
  {
    key: "attire",
    title: "לבוש",
    category: "attire",
    description: "קנייה, השכרה או תפירה. בהזמנה אישית צריך להתחיל חודשים מראש.",
    offsetDays: 130,
    priority: "normal",
    criteria: [
      { name: "הרגשה ונוחות", weight: 5 },
      { name: "מחיר", weight: 4 },
      { name: "זמן התאמות", weight: 3 },
    ],
  },
  {
    key: "flowers",
    title: "עיצוב ופרחים",
    category: "design",
    description: "במיקרו אפשר להקטין עיצוב ולהשקיע בחופה ובשולחן אחד יפה.",
    offsetDays: 100,
    priority: "low",
    criteria: [
      { name: "סגנון", weight: 4 },
      { name: "מחיר", weight: 4 },
      { name: "הגעה למקום לפני האירוע", weight: 2 },
    ],
  },
  {
    key: "invitations",
    title: "סגנון הזמנה",
    category: "design",
    description: "דיגיטלית בוואטסאפ עם קישור לאישור הגעה, או מוגמרת/מודפסת. אפשר גם שניהם.",
    offsetDays: 90,
    priority: "low",
    criteria: [
      { name: "מחיר", weight: 3 },
      { name: "אישי ומרגש", weight: 4 },
      { name: "מהירות", weight: 3 },
    ],
    options: [{ name: "דיגיטלית בוואטסאפ" }, { name: "מודפסת" }, { name: "שתיהן" }],
  },
];

export function decisionTemplatesForTrack(track: CeremonyTrack): DecisionTemplate[] {
  return DECISION_TEMPLATES.filter((t) => !t.tracks || t.tracks.includes(track));
}
