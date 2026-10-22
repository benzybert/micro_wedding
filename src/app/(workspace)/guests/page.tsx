import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock, Download, MessageCircle, Plus, Upload, Users, UtensilsCrossed, X } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { SegmentedBar } from "@/components/ui/progress";
import { inputClass } from "@/components/ui/field";
import { AutoSubmitSelect } from "@/components/guests/client-bits";
import { setTierAction } from "@/app/actions/guests";
import { requireWorkspace } from "@/lib/session";
import { getGuestData } from "@/lib/queries";
import {
  DIET_LABEL,
  STATUS_LABEL,
  TIER_LABEL,
  TIER_SHORT,
  bySide,
  capacityByTier,
  dietSummary,
  headcount,
  householdStatus,
  sideLabel,
  suggestWave,
  type HouseholdStatus,
} from "@/lib/guests";
import { formatPhone } from "@/lib/phone";
import { plural } from "@/lib/format";
import type { Tier } from "@/db/schema";

export const metadata: Metadata = { title: "אורחים" };

const STATUS_TONE: Record<HouseholdStatus, Tone> = { not_invited: "neutral", waiting: "amber", partial: "amber", yes: "sage", no: "rose" };

type SP = { status?: string; tier?: string; side?: string; q?: string };

export default async function GuestsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { wedding } = await requireWorkspace();
  const sp = await searchParams;
  const { households, guests } = await getGuestData(wedding.id);

  const hc = headcount(guests);
  const tiers = capacityByTier(households, guests, wedding.guestCap);
  const wave = suggestWave(households, guests, wedding.guestCap);
  const sides = bySide(households, guests);
  const diet = dietSummary(guests);
  const free = wedding.guestCap - hc.expected;

  const rows = households.map((h) => {
    const members = guests.filter((g) => g.householdId === h.id);
    return { h, members, status: householdStatus(h, members) };
  });

  const q = (sp.q ?? "").trim().toLowerCase();
  const filtered = rows.filter(({ h, members, status }) => {
    if (sp.status && sp.status !== "all" && status !== sp.status) return false;
    if (sp.tier && sp.tier !== "all" && h.tier !== sp.tier) return false;
    if (sp.side && sp.side !== "all" && h.side !== sp.side) return false;
    if (q && !`${h.name} ${h.phone ?? ""} ${h.groupLabel ?? ""} ${members.map((m) => m.name).join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const waveNames = wave.suggestions.map((s) => households.find((h) => h.id === s.householdId)?.name).filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="אורחים"
        description={`${plural(hc.expected, "מקום תפוס", "מקומות תפוסים")} מתוך ${wedding.guestCap}. ${free >= 0 ? `נשארו ${free}` : `חורגים ב-${-free}`}.`}
        actions={
          <>
            <Link href="/guests/invite" className={buttonClass("secondary")}>
              <MessageCircle className="size-4" aria-hidden />
              שליחת הזמנות
            </Link>
            <Link href="/guests/seating" className={buttonClass("secondary")}>
              <Users className="size-4" aria-hidden />
              הושבה
            </Link>
            <Link href="/guests/new" className={buttonClass("primary")}>
              <Plus className="size-4" aria-hidden />
              הוספה
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle as="h2">תפוסה</SectionTitle>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-display text-3xl font-semibold text-sage-ink tabular-nums">{hc.yes}</p>
              <p className="text-xs text-muted">מגיעים</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold text-amber-ink tabular-nums">{hc.pending}</p>
              <p className="text-xs text-muted">ממתינים</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold text-rose-ink tabular-nums">{hc.no}</p>
              <p className="text-xs text-muted">לא מגיעים</p>
            </div>
          </div>
          <SegmentedBar
            label="תפוסה"
            max={wedding.guestCap}
            segments={[
              { value: hc.yes, tone: "sage", label: "מגיעים" },
              { value: hc.pending, tone: "amber", label: "ממתינים" },
            ]}
          />
          <p className={`mt-2 text-sm ${free < 0 ? "font-medium text-rose-ink" : "text-muted"}`}>
            {free < 0 ? `חריגה של ${-free} מקומות מעל התקרה (${wedding.guestCap}).` : `${free} מקומות פנויים מתוך ${wedding.guestCap}.`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {sideLabel("a", wedding.partnerAName, wedding.partnerBName)}: {sides.a} · {sideLabel("b", wedding.partnerAName, wedding.partnerBName)}: {sides.b} · משותף: {sides.both}
          </p>
        </Card>

        <Card>
          <SectionTitle>קו החיתוך</SectionTitle>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-1 text-start font-normal">רשימה</th>
                <th className="pb-1 text-end font-normal">מקומות</th>
                <th className="pb-1 text-end font-normal">מצטבר</th>
                <th className="pb-1 text-end font-normal">
                  <span className="sr-only">נכנס</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tiers.rows.map((r) => (
                <tr key={r.tier} className="border-t border-line">
                  <td className="py-1.5">{TIER_LABEL[r.tier]}</td>
                  <td className="py-1.5 text-end tabular-nums">{r.seats}</td>
                  <td className="py-1.5 text-end tabular-nums">{r.cumulative}</td>
                  <td className="py-1.5 text-end">{r.seats === 0 ? null : r.fits ? <Check className="ms-auto size-4 text-sage-ink" aria-label="נכנס" /> : <X className="ms-auto size-4 text-rose-ink" aria-label="חורג" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">
            {tiers.cutTier ? `הקו עובר אחרי רשימה ${TIER_SHORT[tiers.cutTier]}.` : tiers.rows[0]?.seats ? "אפילו רשימה א׳ חורגת מהתקרה." : "הוסיפו אורחים כדי לראות איפה עובר הקו."}
            {tiers.overBy > 0 ? ` צריך לוותר על ${tiers.overBy}.` : ""}
          </p>
        </Card>

        <Card>
          <SectionTitle>מי אפשר להזמין עכשיו</SectionTitle>
          {wave.suggestions.length ? (
            <>
              <p className="mb-2 text-sm text-muted">יש {wave.freeSeats} מקומות פנויים. לפי רשימה ב׳ ואז ג׳:</p>
              <p className="mb-3 text-sm font-medium">{waveNames.slice(0, 5).join(" · ")}{waveNames.length > 5 ? ` ועוד ${waveNames.length - 5}` : ""}</p>
              <Link href="/guests/invite" className={buttonClass("secondary", "sm")}>
                לגל ההזמנות
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted">{wave.freeSeats === 0 ? "המקומות מלאים. כשמישהו יסרב, כאן יופיעו מי שאפשר להזמין במקומו." : "אין מי שמחכה ברשימות ב׳ וג׳."}</p>
          )}
        </Card>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          חיפוש
          <input name="q" defaultValue={sp.q ?? ""} placeholder="שם, טלפון, קבוצה" dir="auto" className={inputClass} />
        </label>
        <FilterSelect label="סטטוס" name="status" value={sp.status} options={[["all", "הכל"], ...Object.entries(STATUS_LABEL)]} />
        <FilterSelect label="רשימה" name="tier" value={sp.tier} options={[["all", "הכל"], ["must", "א׳"], ["want", "ב׳"], ["maybe", "ג׳"]]} />
        <FilterSelect label="צד" name="side" value={sp.side} options={[["all", "הכל"], ["a", wedding.partnerAName], ["b", wedding.partnerBName], ["both", "משותף"]]} />
        <button type="submit" className={buttonClass("secondary")}>
          סינון
        </button>
      </form>

      {households.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="עוד אין אורחים ברשימה">
          <p className="mb-4">מתחילים מרשימה א׳: מי שאי אפשר בלעדיו. אחר כך ב׳ וג׳, והמערכת תראה איפה הקו מול תקרת האורחים.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/guests/new" className={buttonClass("primary")}>
              <Plus className="size-4" aria-hidden /> הוספת משק בית
            </Link>
            <Link href="/guests/import" className={buttonClass("secondary")}>
              <Upload className="size-4" aria-hidden /> ייבוא מאקסל
            </Link>
          </div>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-8 text-center text-muted">לא נמצאו אורחים שמתאימים לסינון.</p>
      ) : (
        <ul className="grid gap-3">
          {filtered.map(({ h, members, status }) => (
            <li key={h.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/guests/${h.id}`} className="font-display text-lg font-semibold hover:underline">
                      {h.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {[h.groupLabel, sideLabel(h.side, wedding.partnerAName, wedding.partnerBName), h.phone ? formatPhone(h.phone) : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                    <form action={setTierAction}>
                      <input type="hidden" name="id" value={h.id} />
                      <AutoSubmitSelect name="tier" defaultValue={h.tier} aria-label={`רשימה עבור ${h.name}`}>
                        {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
                          <option key={t} value={t}>
                            רשימה {TIER_SHORT[t]}
                          </option>
                        ))}
                      </AutoSubmitSelect>
                    </form>
                  </div>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {members.map((m) => (
                    <li key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pe-3 ps-2 text-sm">
                      {m.attending === "yes" ? <Check className="size-3.5 text-sage-ink" aria-label="מגיע/ה" /> : m.attending === "no" ? <X className="size-3.5 text-rose-ink" aria-label="לא מגיע/ה" /> : <Clock className="size-3.5 text-muted" aria-label="ממתין" />}
                      <bdi>{m.name}</bdi>
                      {m.isChild ? <span className="text-xs text-muted">(ילד/ה)</span> : null}
                      {m.diet !== "regular" ? (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted">
                          <UtensilsCrossed className="size-3" aria-hidden />
                          {DIET_LABEL[m.diet]}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {guests.length > 0 ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionTitle>לקייטרינג: העדפות אוכל</SectionTitle>
            <p className="text-sm text-muted">מחושב מכל מי שלא סירב.</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(diet.counts).map(([k, v]) => (
                <li key={k} className="flex justify-between rounded-lg bg-surface-2 px-3 py-2">
                  <span>{DIET_LABEL[k as keyof typeof DIET_LABEL]}</span>
                  <span className="font-medium tabular-nums">{v}</span>
                </li>
              ))}
            </ul>
            {diet.allergies.length ? (
              <div className="mt-3">
                <p className="mb-1 text-sm font-medium">אלרגיות</p>
                <ul className="space-y-1 text-sm text-muted">
                  {diet.allergies.map((a, i) => (
                    <li key={i}>
                      <bdi>{a.name}</bdi>: {a.allergy}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
          <Card>
            <SectionTitle>ייבוא וייצוא</SectionTitle>
            <p className="mb-3 text-sm text-muted">מעבירים רשימה מאקסל או מקובץ אנשי קשר, או מורידים את הרשימה לקובץ שנפתח באקסל.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/guests/import" className={buttonClass("secondary")}>
                <Upload className="size-4" aria-hidden /> ייבוא
              </Link>
              <a href="/guests/export" className={buttonClass("secondary")}>
                <Download className="size-4" aria-hidden /> ייצוא ל-CSV
              </a>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value?: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <select name={name} defaultValue={value ?? "all"} className={`${inputClass} w-auto min-w-28`}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
