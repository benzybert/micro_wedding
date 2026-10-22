import { daysBetween } from "@/lib/format";

/*
 * The templates assume ~6 months of planning. When the wedding is closer, seeding every task at its
 * nominal offset would make half the list "overdue" on day one. Compress the long-horizon offsets into
 * the time that actually remains, but never move hard deadlines closer to the wedding than the real
 * rule allows (the rabbinate file must be opened ≥45 days ahead, ACUM ≥72 hours ahead).
 */

export const TEMPLATE_HORIZON_DAYS = 180;
/** Offsets up to this many days are "last month" logistics and are kept as-is. */
const KEEP_BELOW = 30;
/** Hard deadlines can never be later than this many days before the wedding (45-day rabbinate rule). */
export const HARD_FLOOR_DAYS = 45;

export function daysUntilWedding(weddingDate: string | null, today: string): number | null {
  return weddingDate ? daysBetween(today, weddingDate) : null;
}

export function compressOffset(offset: number, opts: { hard?: boolean; daysLeft: number | null }): number {
  const { daysLeft } = opts;
  if (daysLeft === null || offset <= KEEP_BELOW) return offset;

  if (opts.hard) {
    // Aim at "tomorrow" if there is still time before the real cut-off; otherwise keep it (it IS late).
    if (daysLeft >= offset) return offset;
    return Math.min(offset, Math.max(daysLeft - 1, HARD_FLOOR_DAYS));
  }

  if (daysLeft >= TEMPLATE_HORIZON_DAYS) return offset;
  // Earliest allowed offset leaves a few days to start; never below KEEP_BELOW so order is preserved.
  const horizon = Math.max(daysLeft - 3, KEEP_BELOW + 1);
  const scaled = KEEP_BELOW + ((offset - KEEP_BELOW) * (horizon - KEEP_BELOW)) / (TEMPLATE_HORIZON_DAYS - KEEP_BELOW);
  return Math.max(KEEP_BELOW + 1, Math.round(scaled));
}
