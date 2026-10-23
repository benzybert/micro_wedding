/*
 * Pure part of whatsapp-pull: turns the chat list WhatsApp Web exposes into the file micro-wedding imports.
 * No WhatsApp or file-system access here, so it can be tested. The file never contains message content.
 */

export const EXPORT_FORMAT = "micro-wedding/whatsapp-chats";
export const EXPORT_VERSION = 1;

/** `now` minus whole calendar months, clamped to the last day of a shorter month (31 Aug − 6 → 28 Feb). */
export function monthsAgo(now, months) {
  const d = new Date(now.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * @param chats  raw chats: `{ isGroup, timestamp }` where `timestamp` is the last activity in unix seconds
 * @param opts   `{ now, months, savedOnly, resolve }`; `resolve(chat)` returns `{ phone, name, saved }` and is
 *               only called for one-to-one chats inside the window (it is the slow, WhatsApp-bound step)
 */
export async function buildExport(chats, { now, months, savedOnly = false, resolve }) {
  const cutoffMs = monthsAgo(now, months).getTime();
  const stats = { total: chats.length, groups: 0, empty: 0, outsideWindow: 0, noPhone: 0, unsaved: 0, kept: 0 };
  const byPhone = new Map();

  for (const chat of chats) {
    if (chat.isGroup) {
      stats.groups += 1;
      continue;
    }
    const lastMs = Number(chat.timestamp) * 1000;
    if (!Number.isFinite(lastMs) || lastMs <= 0) {
      stats.empty += 1;
      continue;
    }
    if (lastMs < cutoffMs) {
      stats.outsideWindow += 1;
      continue;
    }
    const info = await resolve(chat);
    const phone = String(info?.phone ?? "").replace(/\D/g, "");
    if (phone.length < 8 || phone.length > 15) {
      stats.noPhone += 1;
      continue;
    }
    if (savedOnly && !info.saved) {
      stats.unsaved += 1;
      continue;
    }
    const seen = byPhone.get(phone);
    if (!seen || seen.lastMs < lastMs) byPhone.set(phone, { name: String(info.name ?? ""), phone, lastMs });
  }

  const rows = [...byPhone.values()].sort((a, b) => b.lastMs - a.lastMs);
  stats.kept = rows.length;
  return {
    stats,
    file: {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: now.toISOString(),
      chats: rows.map((r) => ({ name: r.name, phone: r.phone, lastMessageAt: new Date(r.lastMs).toISOString() })),
    },
  };
}
