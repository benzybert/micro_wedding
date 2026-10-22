import type { Diet, Side, Tier } from "@/db/schema";

/* Minimal CSV/TSV reader & writer (quotes, escaped quotes, newlines in cells; delimiter auto-detected). */

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch as keyof typeof counts] += 1;
  }
  const delim = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",") as string;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

function escapeCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection, then quote when needed.
  const safe = /^[=+\-@]/.test(s) && !/^[+-]?\d[\d\s().-]*$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** UTF-8 with BOM so Excel opens Hebrew correctly. */
export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return `﻿${rows.map((r) => r.map(escapeCell).join(",")).join("\r\n")}\r\n`;
}

/* ───────── guest import ───────── */

export type ImportedGuest = {
  name: string;
  household: string;
  side: Side;
  tier: Tier;
  phone: string | null;
  email: string | null;
  diet: Diet;
  allergies: string | null;
  isChild: boolean;
  notes: string | null;
};

const HEADERS: Record<string, string[]> = {
  name: ["שם", "שם מלא", "אורח", "name", "guest", "full name"],
  household: ["משק בית", "משפחה", "קבוצה משפחתית", "household", "family", "party"],
  side: ["צד", "side"],
  tier: ["רמה", "עדיפות", "דרגה", "tier", "priority", "list"],
  phone: ["טלפון", "נייד", "פלאפון", "phone", "mobile", "cell"],
  email: ["אימייל", "מייל", "דוא\"ל", "email", "e-mail"],
  diet: ["תזונה", "העדפת אוכל", "diet", "meal"],
  allergies: ["אלרגיות", "אלרגיה", "allergies", "allergy"],
  child: ["ילד", "ילד/ה", "child", "kid"],
  notes: ["הערות", "הערה", "notes", "note"],
};

function indexColumns(header: string[]): Partial<Record<keyof typeof HEADERS, number>> {
  const idx: Partial<Record<keyof typeof HEADERS, number>> = {};
  header.forEach((h, i) => {
    const norm = h.trim().toLowerCase();
    for (const [field, aliases] of Object.entries(HEADERS)) {
      if (idx[field] === undefined && aliases.some((a) => a.toLowerCase() === norm)) idx[field] = i;
    }
  });
  return idx;
}

const yes = (v: string) => /^(כן|ילד|ילדה|y|yes|true|1|x|v|✓)$/i.test(v.trim());

export function parseTier(v: string): Tier {
  const s = v.trim().toLowerCase();
  if (["א", "א׳", "a", "must", "חייב", "חייבים", "1"].includes(s)) return "must";
  if (["ג", "ג׳", "c", "maybe", "אולי", "אם יהיה מקום", "3"].includes(s)) return "maybe";
  return "want";
}

export function parseSide(v: string, aName?: string, bName?: string): Side {
  const s = v.trim().toLowerCase();
  if (!s) return "both";
  if (["a", "א", "צד א", "צד א׳"].includes(s) || (aName && s === aName.trim().toLowerCase())) return "a";
  if (["b", "ב", "צד ב", "צד ב׳"].includes(s) || (bName && s === bName.trim().toLowerCase())) return "b";
  return "both";
}

export function parseDiet(v: string): Diet {
  const s = v.trim().toLowerCase();
  if (/טבעוני|vegan/.test(s)) return "vegan";
  if (/צמחוני|vegetarian/.test(s)) return "vegetarian";
  if (/גלוטן|gluten/.test(s)) return "gluten_free";
  return "regular";
}

export const MAX_IMPORT_ROWS = 500;

export function parseGuestImport(text: string, names?: { a?: string; b?: string }): { guests: ImportedGuest[]; errors: string[] } {
  const rows = parseCsv(text);
  const errors: string[] = [];
  if (rows.length === 0) return { guests: [], errors: ["הקובץ ריק."] };

  const first = rows[0]!;
  let idx = indexColumns(first);
  let body = rows.slice(1);
  if (idx.name === undefined) {
    // No recognised header: treat the first column as the name.
    idx = { name: 0, phone: first.length > 1 ? 1 : undefined };
    body = rows;
  }
  const get = (r: string[], k: keyof typeof HEADERS) => (idx[k] === undefined ? "" : (r[idx[k]!] ?? ""));

  const guests: ImportedGuest[] = [];
  body.slice(0, MAX_IMPORT_ROWS).forEach((r, i) => {
    const name = get(r, "name").slice(0, 120);
    if (!name) {
      errors.push(`שורה ${i + 2}: חסר שם.`);
      return;
    }
    guests.push({
      name,
      household: (get(r, "household") || name).slice(0, 120),
      side: parseSide(get(r, "side"), names?.a, names?.b),
      tier: parseTier(get(r, "tier")),
      phone: get(r, "phone").slice(0, 40) || null,
      email: get(r, "email").slice(0, 160) || null,
      diet: parseDiet(get(r, "diet")),
      allergies: get(r, "allergies").slice(0, 200) || null,
      isChild: yes(get(r, "child")),
      notes: get(r, "notes").slice(0, 500) || null,
    });
  });
  if (body.length > MAX_IMPORT_ROWS) errors.push(`יובאו ${MAX_IMPORT_ROWS} השורות הראשונות בלבד.`);
  return { guests, errors };
}
