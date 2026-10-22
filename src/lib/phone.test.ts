import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, whatsappLink } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["050-123-4567", "972501234567"],
    ["0501234567", "972501234567"],
    ["050 123 4567", "972501234567"],
    ["+972 50-123-4567", "972501234567"],
    ["972501234567", "972501234567"],
    ["00972501234567", "972501234567"],
    ["501234567", "972501234567"],
    ["03-5551234", "97235551234"],
    ["(052) 987-6543", "972529876543"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("accepts other international numbers with a plus", () => {
    expect(normalizePhone("+1 (415) 555-2671")).toBe("14155552671");
    expect(normalizePhone("+44 7911 123456")).toBe("447911123456");
  });

  it.each(["", "abc", "123", "050-123", "0001", "+972 50 12", "07", null, undefined])("rejects %j", (input) => {
    expect(normalizePhone(input as string)).toBeNull();
  });
});

describe("formatPhone / whatsappLink", () => {
  it("formats Israeli mobiles", () => {
    expect(formatPhone("+972501234567")).toBe("050-123-4567");
    expect(formatPhone("035551234")).toBe("03-5551234");
  });
  it("keeps unparseable input visible", () => {
    expect(formatPhone("בקרוב")).toBe("בקרוב");
  });
  it("builds a wa.me link with the encoded Hebrew text", () => {
    const link = whatsappLink("050-123-4567", "שלום! 🎉");
    expect(link).toBe(`https://wa.me/972501234567?text=${encodeURIComponent("שלום! 🎉")}`);
    expect(whatsappLink("lol", "x")).toBeNull();
  });
});
