import { describe, expect, it } from "vitest";
import { compressOffset, daysUntilWedding } from "./plan-schedule";

describe("compressOffset", () => {
  it("leaves everything alone when the date is unknown or far enough away", () => {
    expect(compressOffset(160, { daysLeft: null })).toBe(160);
    expect(compressOffset(160, { daysLeft: 400 })).toBe(160);
    expect(compressOffset(180, { daysLeft: 180 })).toBe(180);
  });

  it("keeps last-month logistics at their nominal offset", () => {
    expect(compressOffset(7, { daysLeft: 60 })).toBe(7);
    expect(compressOffset(30, { daysLeft: 60 })).toBe(30);
  });

  it("squeezes long-horizon tasks into the time left, preserving order", () => {
    const left = 100;
    const mapped = [180, 160, 130, 90, 60, 31].map((o) => compressOffset(o, { daysLeft: left }));
    expect(mapped[0]).toBeLessThanOrEqual(left - 3); // earliest task still starts in the future
    for (let i = 1; i < mapped.length; i++) expect(mapped[i]).toBeLessThanOrEqual(mapped[i - 1]!);
    expect(mapped.every((m) => m > 30)).toBe(true);
  });

  it("never schedules a compressed task before today when plenty of days remain", () => {
    for (const left of [40, 60, 90, 120, 150]) {
      for (const offset of [180, 170, 160, 150, 100, 60, 50]) {
        expect(compressOffset(offset, { daysLeft: left })).toBeLessThanOrEqual(Math.max(left - 3, 31));
      }
    }
  });

  it("keeps hard deadlines honest", () => {
    // enough time: unchanged
    expect(compressOffset(75, { hard: true, daysLeft: 120 })).toBe(75);
    // 60 days left: aim at tomorrow, still ≥ the 45-day rule
    expect(compressOffset(75, { hard: true, daysLeft: 60 })).toBe(59);
    // 50 days left: due tomorrow, still before the 45-day cut-off
    expect(compressOffset(75, { hard: true, daysLeft: 50 })).toBe(49);
    // 30 days left: the 45-day rule is already missed, stays overdue (45), never "fixed" by sliding it
    expect(compressOffset(75, { hard: true, daysLeft: 30 })).toBe(45);
  });
});

describe("daysUntilWedding", () => {
  it("counts days, null without a date, negative after", () => {
    expect(daysUntilWedding("2027-03-23", "2026-10-22")).toBe(152);
    expect(daysUntilWedding(null, "2026-10-22")).toBeNull();
    expect(daysUntilWedding("2026-10-01", "2026-10-22")).toBe(-21);
  });
});
