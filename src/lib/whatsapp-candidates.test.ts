import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT,
  MAX_CANDIDATES,
  cleanName,
  monthsAgo,
  nameSet,
  normalizeName,
  parseWhatsappExport,
  phoneSet,
  relativeAge,
  stagingSummary,
  whatsappPhone,
} from "./whatsapp-candidates";

const NOW = new Date("2026-10-23T10:00:00.000Z");
const file = (chats: unknown[], over: Record<string, unknown> = {}) =>
  JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: NOW.toISOString(), chats, ...over });
const chat = (name: string | null, phone: string, lastMessageAt: string) => ({ name, phone, lastMessageAt });

describe("monthsAgo", () => {
  it("subtracts calendar months", () => {
    expect(monthsAgo(NOW, 6).toISOString()).toBe("2026-04-23T10:00:00.000Z");
    expect(monthsAgo(NOW, 12).toISOString()).toBe("2025-10-23T10:00:00.000Z");
  });
  it("clamps to the end of a shorter month instead of spilling into the next one", () => {
    expect(monthsAgo(new Date("2026-08-31T00:00:00Z"), 6).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(monthsAgo(new Date("2024-03-31T00:00:00Z"), 1).toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });
  it("crosses year boundaries", () => {
    expect(monthsAgo(new Date("2026-02-15T00:00:00Z"), 3).toISOString()).toBe("2025-11-15T00:00:00.000Z");
  });
});

describe("whatsappPhone", () => {
  it("accepts WhatsApp-style digits without a plus", () => {
    expect(whatsappPhone("972501234567")).toBe("972501234567");
    expect(whatsappPhone("+972 50-123-4567")).toBe("972501234567");
  });
  it("keeps foreign numbers (no Israeli-only assumption)", () => {
    expect(whatsappPhone("14155550123")).toBe("14155550123");
  });
  it("rejects junk", () => {
    expect(whatsappPhone("")).toBeNull();
    expect(whatsappPhone("abc")).toBeNull();
    expect(whatsappPhone("12345")).toBeNull();
    expect(whatsappPhone(5 as unknown as string)).toBeNull();
    // a long opaque id (e.g. a privacy-preserving LID) is not a phone number
    expect(whatsappPhone("1234567890123456789")).toBeNull();
  });
});

describe("cleanName", () => {
  it("strips control and bidi-override characters and collapses whitespace", () => {
    expect(cleanName("  דנה‮  כהן\u0007 ")).toBe("דנה כהן");
  });
  it("caps the length and tolerates non-strings", () => {
    expect(cleanName("א".repeat(500))).toHaveLength(120);
    expect(cleanName(null)).toBe("");
  });
});

describe("parseWhatsappExport", () => {
  it("keeps chats inside the window, newest first, and counts what it drops", () => {
    const r = parseWhatsappExport(
      file([
        chat("ישן", "972501111111", "2026-01-01T00:00:00Z"),
        chat("דנה", "972502222222", "2026-09-01T00:00:00Z"),
        chat("יוסי", "972503333333", "2026-10-20T00:00:00Z"),
        chat("שבור", "not-a-phone", "2026-10-20T00:00:00Z"),
        chat("תאריך שבור", "972504444444", "yesterday-ish"),
      ]),
      { now: NOW, months: 6 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates.map((c) => c.name)).toEqual(["יוסי", "דנה"]);
    expect(r.stats).toEqual({ total: 5, outsideWindow: 1, invalid: 2, duplicates: 0 });
  });

  it("applies the window chosen at upload even when the file holds older chats", () => {
    const chats = [chat("א", "972501111111", "2026-07-01T00:00:00Z"), chat("ב", "972502222222", "2026-10-01T00:00:00Z")];
    const wide = parseWhatsappExport(file(chats), { now: NOW, months: 6 });
    const narrow = parseWhatsappExport(file(chats), { now: NOW, months: 1 });
    expect(wide.ok && wide.candidates).toHaveLength(2);
    expect(narrow.ok && narrow.candidates.map((c) => c.name)).toEqual(["ב"]);
  });

  it("includes a chat exactly on the cutoff", () => {
    const r = parseWhatsappExport(file([chat("גבול", "972501111111", "2026-04-23T10:00:00.000Z")]), { now: NOW, months: 6 });
    expect(r.ok && r.candidates).toHaveLength(1);
  });

  it("merges the same phone listed twice, keeping the latest contact and any name", () => {
    const r = parseWhatsappExport(
      file([chat(null, "972501234567", "2026-08-01T00:00:00Z"), chat("דנה", "+972-50-123-4567", "2026-09-15T00:00:00Z")]),
      { now: NOW, months: 6 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0]).toMatchObject({ name: "דנה", phone: "972501234567" });
    expect(r.candidates[0]!.lastContactAt.toISOString()).toBe("2026-09-15T00:00:00.000Z");
    expect(r.stats.duplicates).toBe(1);
  });

  it("falls back to the formatted phone when the contact has no name", () => {
    const r = parseWhatsappExport(file([chat(null, "972501234567", "2026-10-01T00:00:00Z")]), { now: NOW, months: 6 });
    expect(r.ok && r.candidates[0]!.name).toBe("050-123-4567");
  });

  it("treats a future timestamp (phone clock skew) as now, not as invalid", () => {
    const r = parseWhatsappExport(file([chat("עתיד", "972501234567", "2026-10-30T00:00:00Z")]), { now: NOW, months: 1 });
    expect(r.ok && r.candidates[0]!.lastContactAt.toISOString()).toBe(NOW.toISOString());
  });

  it("rejects things that are not a whatsapp-pull file", () => {
    for (const text of ["", "not json", "[]", JSON.stringify({ chats: [] }), file([], { version: 2 }), file([], { format: "other" })]) {
      expect(parseWhatsappExport(text, { now: NOW, months: 6 }).ok).toBe(false);
    }
  });

  it("refuses more than MAX_CANDIDATES in the window and asks for a shorter one", () => {
    const chats = Array.from({ length: MAX_CANDIDATES + 1 }, (_, i) => chat(`אורח ${i}`, `97250${String(1000000 + i)}`, "2026-10-01T00:00:00Z"));
    const r = parseWhatsappExport(file(chats), { now: NOW, months: 6 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("חלון קצר יותר");
  });
});

describe("phone and name sets", () => {
  it("matches phones across formats", () => {
    const known = phoneSet(["050-123-4567", null, "", "garbage"]);
    expect(known.has("972501234567")).toBe(true);
    expect(known.size).toBe(1);
  });
  it("matches names ignoring case, spacing, punctuation and bidi noise", () => {
    expect(normalizeName("  דנה   כהן ")).toBe(normalizeName("דנה כהן"));
    expect(normalizeName("Dana-Cohen")).toBe(normalizeName("dana cohen"));
    expect(nameSet(["דנה כהן", "", "  "]).has(normalizeName("דנה  כהן"))).toBe(true);
    expect(nameSet(["דנה כהן"]).has(normalizeName("דנה"))).toBe(false);
  });
});

describe("relativeAge", () => {
  const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000);
  it.each([
    [0, "היום"],
    [1, "אתמול"],
    [2, "לפני יומיים"],
    [9, "לפני 9 ימים"],
    [14, "לפני שבועיים"],
    [30, "לפני 4 שבועות"],
    [61, "לפני חודשיים"],
    [100, "לפני 3 חודשים"],
    [200, "לפני 6 חודשים"],
    [400, "לפני שנה"],
    [800, "לפני שנתיים"],
    [1200, "לפני 3 שנים"],
  ])("%i days → %s", (days, label) => {
    expect(relativeAge(ago(days), NOW)).toBe(label);
  });
  it("never goes negative for a timestamp slightly in the future", () => {
    expect(relativeAge(new Date(NOW.getTime() + 60_000), NOW)).toBe("היום");
  });
});

describe("stagingSummary", () => {
  it("lists only the non-zero buckets", () => {
    const stats = { total: 10, outsideWindow: 3, invalid: 0, duplicates: 0 };
    expect(stagingSummary({ added: 5, alreadyGuests: 1, alreadyStaged: 0 }, stats)).toBe(
      "נוספו 5 אנשים לרשימת האישור. 1 כבר ברשימת האורחים. 3 מחוץ לטווח הזמן.",
    );
    expect(stagingSummary({ added: 0, alreadyGuests: 0, alreadyStaged: 0 }, { ...stats, outsideWindow: 0 })).toBe("לא נוספו אנשים חדשים.");
  });
});
