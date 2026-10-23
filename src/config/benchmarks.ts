// Indicative 2026 figures for an Israeli wedding. Source: the israeli-wedding-planner
// skill (SKILL.md and references/). They are market ranges, not quotes: no official
// body publishes wedding-vendor prices. Every screen that shows one says so.
// Statutory figures (VAT, Rabbinate fee, ACUM tariff) are re-published every year:
// update them here and nowhere else.

export const VAT_RATE = 0.18; // since 1 January 2025

/** Up to this many invited people we still call it a micro wedding (our convention). */
export const MICRO_MAX_GUESTS = 50;

export const RABBINATE = {
  fee: 844, // from 1 January 2026
  discountRate: 0.4, // olim, soldiers, national service, students under 30, etc.
  latestOpenDaysBefore: 45, // hard cut-off, Ministry of Religious Services
  recommendedFromDaysBefore: 90,
  recommendedToDaysBefore: 60,
} as const;

export const ACUM = {
  fee: 395.3, // T008 family-event tariff, incl. VAT, 2026
  payDaysBefore: 3, // must be paid and reported at least 72 hours before
} as const;

/** Waiting period for a divorced or widowed woman (Shulchan Aruch EH 13:1). */
export const WAITING_DAYS = 90;

export type Region = "center" | "periphery";
export type VenueType = "budget" | "mid" | "premium" | "luxury" | "other";

export const VENUE_TYPES: { key: VenueType; label: string }[] = [
  { key: "budget", label: "אולם בסיסי" },
  { key: "mid", label: "אולם בינוני" },
  { key: "premium", label: "אולם / גן יוקרתי" },
  { key: "luxury", label: "יוקרה (תל אביב)" },
  { key: "other", label: "אחר: מסעדה, וילה, חצר" },
];

/** Per-plate bands in NIS (2026), `null` where the guide gives no band. */
export const PER_PLATE_BANDS: Record<VenueType, Record<Region, [number, number] | null>> = {
  budget: { center: [250, 290], periphery: [170, 240] },
  mid: { center: [290, 350], periphery: [240, 300] },
  premium: { center: [350, 500], periphery: [300, 420] },
  luxury: { center: [500, 800], periphery: [400, 600] },
  other: { center: null, periphery: null },
};

export type BudgetLineKey =
  | "photo_video"
  | "music"
  | "dress"
  | "suit"
  | "makeup"
  | "flowers"
  | "invitations"
  | "civil_route"
  | "other"
  | "contingency";

export interface BudgetLineDef {
  key: BudgetLineKey;
  label: string;
  /** Typical range for a standard (200-400 guest) wedding, NIS. */
  range?: [number, number];
  /** Suggested share of the total when splitting a budget, percent. */
  share: number;
  hint?: string;
}

export const BUDGET_LINES: BudgetLineDef[] = [
  { key: "photo_video", label: "צילום ווידאו", range: [7000, 18000], share: 10, hint: "חבילה בסיסית מכ־5,000, מלאה 10,000–15,000" },
  { key: "music", label: "מוזיקה (תקליטן או להקה)", range: [4000, 15000], share: 6, hint: "בנוסף לרישיון אקו״ם" },
  { key: "dress", label: "שמלת כלה", range: [3000, 15000], share: 6 },
  { key: "suit", label: "חליפה", range: [1500, 5000], share: 2 },
  { key: "makeup", label: "איפור ושיער", range: [2000, 5000], share: 3 },
  { key: "flowers", label: "פרחים ועיצוב", range: [2000, 10000], share: 4 },
  { key: "invitations", label: "הזמנות ומגנטים", range: [1000, 3000], share: 2 },
  { key: "civil_route", label: "נישואים אזרחיים (נסיעה, טקס, אפוסטיל)", share: 0, hint: "קפריסין בערך 3,000–7,000, יוטה אונליין בערך 1,900–3,000" },
  { key: "other", label: "הסעות, מתנות לאורחים, טיפים", range: [3000, 8000], share: 4 },
  { key: "contingency", label: "רזרבה", share: 5, hint: "הצעה שלנו: שמרו מרווח לבלתי צפוי" },
];

/** Suggested share for the venue and catering, percent (range in the guide: 55-65). */
export const VENUE_SHARE = 58;

export type GuestGroupKey = "closeFamily" | "friends" | "extendedFamily" | "colleagues" | "acquaintances";

/** Average cash gift per person, NIS. A social norm people report, not a measured figure. */
export const GUEST_GROUPS: { key: GuestGroupKey; label: string; avgGift: number }[] = [
  { key: "closeFamily", label: "משפחה קרובה", avgGift: 750 },
  { key: "friends", label: "חברים", avgGift: 400 },
  { key: "extendedFamily", label: "משפחה מורחבת", avgGift: 350 },
  { key: "colleagues", label: "עמיתים לעבודה", avgGift: 300 },
  { key: "acquaintances", label: "מכרים", avgGift: 250 },
];
