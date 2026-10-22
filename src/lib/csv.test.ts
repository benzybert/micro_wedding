import { describe, expect, it } from "vitest";
import { parseCsv, parseGuestImport, toCsv } from "./csv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes and embedded newlines", () => {
    const rows = parseCsv('שם,הערות\r\n"כהן, דנה","אמרה ""שלום""\nבשבת"\r\nלוי,');
    expect(rows).toEqual([
      ["שם", "הערות"],
      ["כהן, דנה", 'אמרה "שלום"\nבשבת'],
      ["לוי", ""],
    ]);
  });
  it("auto-detects semicolon and tab delimiters and strips a BOM", () => {
    expect(parseCsv("﻿שם;טלפון\nדנה;050")).toEqual([["שם", "טלפון"], ["דנה", "050"]]);
    expect(parseCsv("name\tphone\nDan\t052")).toEqual([["name", "phone"], ["Dan", "052"]]);
  });
  it("skips blank lines", () => {
    expect(parseCsv("a,b\n\n,\nc,d\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("toCsv", () => {
  it("round-trips through parseCsv with a BOM for Excel", () => {
    const out = toCsv([["שם", "הערות"], ["כהן, דנה", 'אמרה "שלום"']]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(parseCsv(out)).toEqual([["שם", "הערות"], ["כהן, דנה", 'אמרה "שלום"']]);
  });
  it("neutralises spreadsheet formulas but keeps phone numbers intact", () => {
    const out = toCsv([["=HYPERLINK(\"x\")", "+972501234567", "-5"]]);
    expect(out).toContain("'=HYPERLINK");
    expect(out).toContain("+972501234567");
    expect(out).not.toContain("'+972");
  });
});

describe("parseGuestImport", () => {
  it("maps Hebrew headers, groups by household column and parses enums", () => {
    const csv = [
      "שם,משק בית,צד,רמה,טלפון,תזונה,ילד,אלרגיות",
      "דנה כהן,משפחת כהן,נועה,א,050-111-2222,טבעונית,,",
      "יוסי כהן,משפחת כהן,נועה,א,,רגיל,כן,בוטנים",
      "רון לוי,,דן,ג׳,052-333-4444,צמחוני,,",
    ].join("\n");
    const { guests, errors } = parseGuestImport(csv, { a: "נועה", b: "דן" });
    expect(errors).toEqual([]);
    expect(guests).toHaveLength(3);
    expect(guests[0]).toMatchObject({ name: "דנה כהן", household: "משפחת כהן", side: "a", tier: "must", diet: "vegan" });
    expect(guests[1]).toMatchObject({ isChild: true, allergies: "בוטנים" });
    expect(guests[2]).toMatchObject({ household: "רון לוי", side: "b", tier: "maybe", diet: "vegetarian" });
  });

  it("treats headerless input as 'name[,phone]' lines", () => {
    const { guests } = parseGuestImport("דנה כהן,0501112222\nרון לוי");
    expect(guests.map((g) => g.name)).toEqual(["דנה כהן", "רון לוי"]);
    expect(guests[0]?.phone).toBe("0501112222");
  });

  it("reports rows without a name and caps the import size", () => {
    const { guests, errors } = parseGuestImport("שם,טלפון\n,050\nדנה,051");
    expect(guests).toHaveLength(1);
    expect(errors[0]).toMatch(/שורה 2/);
    const many = ["שם", ...Array.from({ length: 520 }, (_, i) => `אורח ${i}`)].join("\n");
    expect(parseGuestImport(many).guests).toHaveLength(500);
  });
});
