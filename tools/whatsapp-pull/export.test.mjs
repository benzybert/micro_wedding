import { describe, expect, it } from "vitest";
import { parseWhatsappExport } from "../../src/lib/whatsapp-candidates.ts";
import { EXPORT_FORMAT, buildExport, monthsAgo } from "./export.mjs";

const NOW = new Date("2026-10-23T10:00:00.000Z");
const sec = (iso) => Math.floor(new Date(iso).getTime() / 1000);
const people = {
  dana: { id: 1, timestamp: sec("2026-10-20T08:00:00Z") },
  yossi: { id: 2, timestamp: sec("2026-08-01T08:00:00Z") },
  old: { id: 3, timestamp: sec("2026-01-01T08:00:00Z") },
};
const book = {
  1: { phone: "972501234567@c.us", name: "דנה כהן", saved: true },
  2: { phone: "972502222222", name: "", saved: false },
  3: { phone: "972503333333", name: "ישן", saved: true },
};
const resolve = async (chat) => book[chat.id];

describe("monthsAgo (same rules as src/lib/whatsapp-candidates.ts)", () => {
  it("subtracts calendar months and clamps short months", () => {
    expect(monthsAgo(NOW, 6).toISOString()).toBe("2026-04-23T10:00:00.000Z");
    expect(monthsAgo(new Date("2026-08-31T00:00:00Z"), 6).toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});

describe("buildExport", () => {
  it("keeps one-to-one chats inside the window, newest first, as the documented file shape", async () => {
    const { file, stats } = await buildExport(Object.values(people), { now: NOW, months: 6, resolve });
    expect(file).toMatchObject({ format: EXPORT_FORMAT, version: 1, exportedAt: NOW.toISOString() });
    expect(file.chats).toEqual([
      { name: "דנה כהן", phone: "972501234567", lastMessageAt: "2026-10-20T08:00:00.000Z" },
      { name: "", phone: "972502222222", lastMessageAt: "2026-08-01T08:00:00.000Z" },
    ]);
    expect(stats).toEqual({ total: 3, groups: 0, empty: 0, outsideWindow: 1, noPhone: 0, unsaved: 0, kept: 2 });
  });

  it("never exports groups, and does not resolve chats it is going to drop", async () => {
    const asked = [];
    const { stats } = await buildExport(
      [{ id: 9, isGroup: true, timestamp: sec("2026-10-20T00:00:00Z") }, people.old, { id: 10, timestamp: 0 }, people.dana],
      { now: NOW, months: 6, resolve: async (c) => (asked.push(c.id), book[c.id]) },
    );
    expect(asked).toEqual([1]);
    expect(stats).toMatchObject({ groups: 1, outsideWindow: 1, empty: 1, kept: 1 });
  });

  it("skips chats whose phone cannot be resolved (e.g. a privacy id with no number)", async () => {
    const { file, stats } = await buildExport([people.dana, people.yossi], {
      now: NOW,
      months: 6,
      resolve: async (c) => (c.id === 1 ? { phone: "", name: "דנה", saved: true } : book[2]),
    });
    expect(file.chats.map((c) => c.phone)).toEqual(["972502222222"]);
    expect(stats.noPhone).toBe(1);
  });

  it("--saved-only drops numbers that are not in the phone's contacts", async () => {
    const { file, stats } = await buildExport(Object.values(people), { now: NOW, months: 6, savedOnly: true, resolve });
    expect(file.chats.map((c) => c.name)).toEqual(["דנה כהן"]);
    expect(stats.unsaved).toBe(1);
  });

  it("collapses the same number appearing in two chats, keeping the latest", async () => {
    const { file } = await buildExport(
      [
        { id: 1, timestamp: sec("2026-09-01T00:00:00Z") },
        { id: 1, timestamp: sec("2026-10-01T00:00:00Z") },
      ],
      { now: NOW, months: 6, resolve },
    );
    expect(file.chats).toHaveLength(1);
    expect(file.chats[0].lastMessageAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("contract: micro-wedding's importer accepts exactly what the tool writes", async () => {
    const { file } = await buildExport(Object.values(people), { now: NOW, months: 12, resolve });
    const parsed = parseWhatsappExport(JSON.stringify(file), { now: NOW, months: 12 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.candidates.map((c) => c.phone)).toEqual(["972501234567", "972502222222", "972503333333"]);
    // an unnamed contact shows up under its phone number rather than blank
    expect(parsed.candidates[1].name).toBe("050-222-2222");
    expect(parsed.stats).toMatchObject({ invalid: 0, outsideWindow: 0, duplicates: 0 });
  });
});
