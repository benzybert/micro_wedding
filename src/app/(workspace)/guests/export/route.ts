import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { toCsv } from "@/lib/csv";
import { ATTENDING_LABEL, DIET_LABEL, TIER_SHORT } from "@/lib/guests";
import { getWorkspace } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const ws = await getWorkspace();
  if (!ws) return new Response("Unauthorized", { status: 401 });

  const [households, guests, tables] = await Promise.all([
    db.select().from(schema.households).where(eq(schema.households.weddingId, ws.wedding.id)),
    db.select().from(schema.guests).where(eq(schema.guests.weddingId, ws.wedding.id)),
    db.select().from(schema.seatingTables).where(eq(schema.seatingTables.weddingId, ws.wedding.id)),
  ]);
  const hh = new Map(households.map((h) => [h.id, h] as const));
  const tbl = new Map(tables.map((t) => [t.id, t.name] as const));
  const side = { a: ws.wedding.partnerAName, b: ws.wedding.partnerBName, both: "משותף" } as const;

  const rows: (string | number | boolean | null)[][] = [
    ["שם", "משק בית", "צד", "רשימה", "קבוצה", "טלפון", "אימייל", "תשובה", "אוכל", "אלרגיות", "ילד/ה", "שולחן", "הערות"],
  ];
  for (const g of guests) {
    const h = hh.get(g.householdId);
    rows.push([
      g.name,
      h?.name ?? "",
      h ? side[h.side] : "",
      h ? TIER_SHORT[h.tier] : "",
      h?.groupLabel ?? "",
      h?.phone ?? "",
      h?.email ?? "",
      ATTENDING_LABEL[g.attending],
      DIET_LABEL[g.diet],
      g.allergies ?? "",
      g.isChild ? "כן" : "",
      g.tableId ? (tbl.get(g.tableId) ?? "") : "",
      g.notes ?? "",
    ]);
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="guests.csv"',
      "Cache-Control": "no-store",
    },
  });
}
