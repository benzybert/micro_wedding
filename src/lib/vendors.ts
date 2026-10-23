import { VAT_RATE } from "@/config/benchmarks";
import type { Vendor, VendorCategory } from "./state";

export interface VendorCategoryInfo {
  key: VendorCategory;
  label: string;
  /** Questions to put to every vendor in this category (from the planning guide). */
  ask: string[];
  /** Signs to walk away from. */
  redFlags: string[];
}

export const VENDOR_CATEGORIES: VendorCategory[] = [
  "venue",
  "photographer",
  "videographer",
  "music",
  "makeup",
  "flowers",
  "rabbi",
  "dress",
  "suit",
  "invitations",
  "transport",
  "other",
];

export const VENDOR_INFO: Record<VendorCategory, VendorCategoryInfo> = {
  venue: {
    key: "venue",
    label: "מקום ואוכל",
    ask: [
      "מחיר לצלחת: לפני או אחרי מע״מ? בכתב.",
      "מינימום מוזמנים שמחייבים אתכם.",
      "מה כלול ומה לא: עמדת תקליטן, חניה, עיצוב, תוספות.",
      "גיבוי לגשם (בגנים).",
      "רישיון עסק מוצג במקום, ותקרת תפוסה בכתב.",
      "סעיף דחייה נפרד מביטול, עם העברת המקדמה במלואה למועד חדש.",
      "תעודת כשרות שהמועצה הדתית מקבלת.",
    ],
    redFlags: ["אין חוזה בכתב", "מדיניות ביטול לא ברורה", "אין רישיון מוצג", "אין סעיף דחייה"],
  },
  photographer: {
    key: "photographer",
    label: "צלם",
    ask: ["פורטפוליו מלא", "מספר תמונות ערוכות", "רחפן", "זמן אספקה, בכתב"],
    redFlags: ["אין חוזה עם תאריך מסירה לאלבום"],
  },
  videographer: {
    key: "videographer",
    label: "צילום וידאו",
    ask: ["קליפ מרוכז וגם טקס מלא", "רחפן", "זמן אספקה"],
    redFlags: ["אספקה של יותר משלושה חודשים"],
  },
  music: {
    key: "music",
    label: "תקליטן או להקה",
    ask: ["ציוד כלול?", "מי משלם את רישיון אקו״ם: אתם או הוא? בכתב.", "גמישות ברשימת השירים"],
    redFlags: ["לא מזכיר את אקו״ם (תשלמו אותו בכל מקרה)"],
  },
  makeup: {
    key: "makeup",
    label: "איפור ושיער",
    ask: ["ניסיון איפור לפני סגירה", "הגעה למקום האירוע", "מחיר ללוויה (אם יש)"],
    redFlags: ["אין ניסיון איפור לפני ההזמנה"],
  },
  flowers: {
    key: "flowers",
    label: "פרחים ועיצוב",
    ask: ["מרכזי שולחן", "עיצוב החופה", "תיאום עם המקום"],
    redFlags: ["לא מבקרים במקום לפני האירוע"],
  },
  rabbi: {
    key: "rabbi",
    label: "מסדר קידושין",
    ask: ["מסדר מטעם הרבנות הוא ללא עלות; מסדר פרטי הוא בתוספת.", "יידעו את הרבנות על בחירתכם."],
    redFlags: [],
  },
  dress: { key: "dress", label: "שמלה", ask: ["קנייה, השכרה או תפירה", "4–6 חודשים להתאמות"], redFlags: [] },
  suit: { key: "suit", label: "חליפה", ask: ["קנייה או השכרה"], redFlags: [] },
  invitations: { key: "invitations", label: "הזמנות ומגנטים", ask: ["כמות, מועד אספקה"], redFlags: [] },
  transport: { key: "transport", label: "הסעות", ask: ["מספר נוסעים, שעות איסוף"], redFlags: [] },
  other: { key: "other", label: "אחר", ask: [], redFlags: [] },
};

export function quoteWithVat(v: Pick<Vendor, "quote" | "quoteIncludesVat">): number | null {
  if (v.quote === null) return null;
  return Math.round(v.quoteIncludesVat ? v.quote : v.quote * (1 + VAT_RATE));
}

/** Quotes the couple can still choose from. */
function live(v: Vendor): boolean {
  return v.status !== "rejected";
}

export interface CategorySummary {
  category: VendorCategory;
  vendors: Vendor[];
  quotes: number;
  best: Vendor | null;
  booked: Vendor | null;
  /** Fewer than three written quotes and nothing booked yet. */
  needsMoreQuotes: boolean;
}

export interface VendorSummary {
  categories: CategorySummary[];
  bookedTotal: number;
  depositsPaid: number;
  bookedWithoutContract: Vendor[];
}

export const MIN_QUOTES = 3;

export function summarizeVendors(vendors: Vendor[]): VendorSummary {
  const categories: CategorySummary[] = [];
  for (const category of VENDOR_CATEGORIES) {
    const inCat = vendors.filter((v) => v.category === category);
    if (inCat.length === 0) continue;
    const quoted = inCat.filter((v) => live(v) && quoteWithVat(v) !== null);
    const best = [...quoted].sort((a, b) => (quoteWithVat(a) ?? 0) - (quoteWithVat(b) ?? 0))[0] ?? null;
    const booked = inCat.find((v) => v.status === "booked") ?? null;
    categories.push({
      category,
      vendors: inCat,
      quotes: quoted.length,
      best,
      booked,
      needsMoreQuotes: !booked && quoted.length < MIN_QUOTES,
    });
  }

  const booked = vendors.filter((v) => v.status === "booked");
  return {
    categories,
    bookedTotal: booked.reduce((s, v) => s + (quoteWithVat(v) ?? 0), 0),
    depositsPaid: vendors.reduce((s, v) => s + (v.deposit ?? 0), 0),
    bookedWithoutContract: booked.filter((v) => !v.contractSigned),
  };
}
