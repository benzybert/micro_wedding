import { z } from "zod";
import { formatPhone, normalizePhone } from "@/lib/phone";

/*
 * Pure logic for importing "people I chatted with on WhatsApp" as guest candidates.
 * The file comes from tools/whatsapp-pull (run on the couple's own machine): name, phone and the time of the
 * last message per chat. Never message content.
 */

export const EXPORT_FORMAT = "micro-wedding/whatsapp-chats";
export const EXPORT_VERSION = 1;

/** Server Actions accept 1MB bodies by default; 1000 chats are ~100KB. */
export const MAX_FILE_BYTES = 600_000;
export const MAX_CANDIDATES = 1000;

export const WINDOW_MONTHS = [1, 3, 6, 12, 24] as const;
export const DEFAULT_WINDOW_MONTHS = 6;
export const WINDOW_LABEL: Record<(typeof WINDOW_MONTHS)[number], string> = {
  1: "החודש האחרון",
  3: "3 החודשים האחרונים",
  6: "חצי השנה האחרונה",
  12: "השנה האחרונה",
  24: "השנתיים האחרונות",
};

const DAY_MS = 86_400_000;

export type Candidate = { name: string; phone: string; lastContactAt: Date };

export type ParseStats = {
  /** Chats found in the file. */
  total: number;
  outsideWindow: number;
  /** Missing/garbled phone or date. */
  invalid: number;
  /** Same phone twice in the file. */
  duplicates: number;
};

export type ParseResult = { ok: true; candidates: Candidate[]; stats: ParseStats } | { ok: false; error: string };

/** `now` minus whole calendar months, clamped to the last day of a shorter month (31 Aug − 6 → 28 Feb). */
export function monthsAgo(now: Date, months: number): Date {
  const d = new Date(now.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** Strips control and bidi-override characters (WhatsApp display names are arbitrary text), collapses spaces. */
export function cleanName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** WhatsApp ids are always full international numbers, so a missing "+" is added before normalising. */
export function whatsappPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits ? normalizePhone(`+${digits}`) : null;
}

const chatSchema = z.object({
  name: z.string().nullish(),
  phone: z.string().max(40),
  lastMessageAt: z.string().max(40),
});

const envelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  chats: z.array(z.unknown()),
});

export function parseWhatsappExport(text: string, opts: { now: Date; months: number }): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "זה לא קובץ JSON תקין. מעלים את הקובץ שהכלי whatsapp-pull יצר." };
  }
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return { ok: false, error: "הקובץ לא מגיע מהכלי whatsapp-pull (פורמט או גרסה לא מוכרים)." };

  const cutoff = monthsAgo(opts.now, opts.months);
  const stats: ParseStats = { total: envelope.data.chats.length, outsideWindow: 0, invalid: 0, duplicates: 0 };
  const byPhone = new Map<string, Candidate>();

  for (const entry of envelope.data.chats) {
    const chat = chatSchema.safeParse(entry);
    const phone = chat.success ? whatsappPhone(chat.data.phone) : null;
    const at = chat.success ? new Date(chat.data.lastMessageAt) : null;
    if (!chat.success || !phone || !at || Number.isNaN(at.getTime())) {
      stats.invalid += 1;
      continue;
    }
    // A phone clock that runs ahead must not push a chat out of "recent".
    const lastContactAt = at > opts.now ? opts.now : at;
    if (lastContactAt < cutoff) {
      stats.outsideWindow += 1;
      continue;
    }
    const name = cleanName(chat.data.name);
    const seen = byPhone.get(phone);
    if (seen) {
      stats.duplicates += 1;
      if (lastContactAt > seen.lastContactAt) seen.lastContactAt = lastContactAt;
      if (!seen.name && name) seen.name = name;
      continue;
    }
    byPhone.set(phone, { name, phone, lastContactAt });
  }

  if (byPhone.size > MAX_CANDIDATES) {
    return { ok: false, error: `${byPhone.size} שיחות בטווח הזמן. המקסימום הוא ${MAX_CANDIDATES}: בחרו חלון קצר יותר.` };
  }

  const candidates = [...byPhone.values()]
    .map((c) => ({ ...c, name: c.name || formatPhone(c.phone) }))
    .sort((a, b) => b.lastContactAt.getTime() - a.lastContactAt.getTime());
  return { ok: true, candidates, stats };
}

/** Normalised set of phones (any format) for membership checks. */
export function phoneSet(phones: readonly (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const p of phones) {
    const n = normalizePhone(p);
    if (n) out.add(n);
  }
  return out;
}

export function normalizeName(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s'"׳״.\-]+/g, " ")
    .trim();
}

export function nameSet(names: readonly string[]): Set<string> {
  return new Set(names.map(normalizeName).filter(Boolean));
}

/** "לפני 3 חודשים": how long ago the last message was. */
export function relativeAge(at: Date, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - at.getTime()) / DAY_MS));
  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  if (days === 2) return "לפני יומיים";
  if (days < 14) return `לפני ${days} ימים`;
  if (days < 60) {
    const weeks = Math.floor(days / 7);
    return weeks === 2 ? "לפני שבועיים" : `לפני ${weeks} שבועות`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30.4);
    return months === 2 ? "לפני חודשיים" : `לפני ${months} חודשים`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "לפני שנה" : years === 2 ? "לפני שנתיים" : `לפני ${years} שנים`;
}

export function stagingSummary(r: { added: number; alreadyGuests: number; alreadyStaged: number }, stats: ParseStats): string {
  const parts = [r.added ? `נוספו ${r.added} אנשים לרשימת האישור` : "לא נוספו אנשים חדשים"];
  if (r.alreadyGuests) parts.push(`${r.alreadyGuests} כבר ברשימת האורחים`);
  if (r.alreadyStaged) parts.push(`${r.alreadyStaged} כבר הופיעו קודם (ממתינים או נדחו)`);
  if (stats.outsideWindow) parts.push(`${stats.outsideWindow} מחוץ לטווח הזמן`);
  if (stats.invalid) parts.push(`${stats.invalid} דולגו (מספר או תאריך לא תקינים)`);
  return `${parts.join(". ")}.`;
}
