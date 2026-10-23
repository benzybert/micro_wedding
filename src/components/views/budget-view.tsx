"use client";

import { ACUM, BUDGET_LINES, PER_PLATE_BANDS, VAT_RATE, VENUE_TYPES, type BudgetLineKey, type VenueType } from "@/config/benchmarks";
import { suggestAllocation, summarizeBudget } from "@/lib/budget";
import { planningHeadcount, summarizeGuests } from "@/lib/guests";
import type { AppState, VenueBudget } from "@/lib/state";
import { useAppState } from "../app-state";
import { Card, Check, Disclaimer, Field, Notice, NumberInput, PageHeader, Ready, Stat, shekel, shekelExact } from "../ui";

export function BudgetView() {
  return (
    <>
      <PageHeader
        title="תקציב"
        lead="חשבו את העלות האמיתית, כולל מע״מ, מינימום מוזמנים והאגרות שכולם שוכחים."
      />
      <Ready>
        <Budget />
      </Ready>
      <Disclaimer />
    </>
  );
}

function Budget() {
  const [state, update] = useAppState();
  const { profile, budget } = state;
  const guests = summarizeGuests(state.guests);
  const headcount = planningHeadcount(guests, profile.plannedGuests);
  const ctx = { headcount, route: profile.route, discount40: profile.discount40 };
  const summary = summarizeBudget(budget, ctx);

  const setBudget = (fn: (b: AppState["budget"]) => AppState["budget"]) => update((s) => ({ ...s, budget: fn(s.budget) }));
  const setVenue = (patch: Partial<VenueBudget>) => setBudget((b) => ({ ...b, venue: { ...b.venue, ...patch } }));
  const setLine = (key: BudgetLineKey, patch: { planned?: number | null; actual?: number | null }) =>
    setBudget((b) => ({ ...b, lines: { ...b.lines, [key]: { ...b.lines[key], ...patch } } }));

  const band = PER_PLATE_BANDS[budget.venue.type][profile.region];
  const venue = summary.venue;
  const hasTyped = BUDGET_LINES.some((d) => budget.lines[d.key].planned !== null);

  function applySuggestion() {
    if (budget.total === null) return;
    if (hasTyped && !window.confirm("להחליף את ההערכות שהזנתם בחלוקה המוצעת?")) return;
    const alloc = suggestAllocation(budget.total, ctx);
    setBudget((b) => {
      const lines = { ...b.lines };
      for (const [key, amount] of Object.entries(alloc.lines) as [BudgetLineKey, number][]) {
        lines[key] = { ...lines[key], planned: amount };
      }
      return { ...b, lines };
    });
  }

  const alloc = budget.total !== null ? suggestAllocation(budget.total, ctx) : null;

  return (
    <>
      <Card title="התקציב והסכום">
        <div className="grid grid-2">
          <Field label="התקציב הכולל שלנו (₪)">
            <NumberInput value={budget.total} onChange={(v) => setBudget((b) => ({ ...b, total: v }))} step={1000} />
          </Field>
          <Field label="אורחים לחישוב" hint={guests.parties > 0 ? "מתוך רשימת המוזמנים: אישרו וממתינים" : "הערכה מהסקירה, עד שיש רשימה"}>
            <input type="text" readOnly value={headcount || "—"} />
          </Field>
        </div>
        {alloc ? (
          <div className="stack" style={{ marginBlockStart: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              לפי החלוקה האינדיקטיבית של המדריך, אחרי אגרות קבועות של {shekelExact(alloc.fixed)}: למקום ולאוכל כ־
              {shekel(alloc.venue)}
              {alloc.venuePerPlate ? `, כלומר עד כ־${shekel(alloc.venuePerPlate)} לצלחת כולל מע״מ` : ""}.
            </p>
            <div className="row">
              <button type="button" onClick={applySuggestion}>
                מלאו חלוקה מוצעת בשאר השורות
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="מקום ואוכל">
        <div className="grid grid-2">
          <Field label="סוג המקום">
            <select value={budget.venue.type} onChange={(e) => setVenue({ type: e.target.value as VenueType })}>
              {VENUE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="מחיר לצלחת (₪)"
            hint={band ? `טווח אינדיקטיבי 2026, ${profile.region === "center" ? "מרכז" : "פריפריה"}: ${band[0]}–${band[1]}` : "אין טווח במדריך לסוג הזה: קבלו הצעות"}
          >
            <NumberInput value={budget.venue.perPlate} onChange={(v) => setVenue({ perPlate: v })} />
          </Field>
          <Field label="מינימום צלחות שהמקום מחייב" hint="במיקרו חתונה זה לעיתים הסעיף היקר ביותר">
            <NumberInput value={budget.venue.minPlates} onChange={(v) => setVenue({ minPlates: v })} />
          </Field>
          <Field label="תוספות (₪)" hint="עמדת תקליטן, חניה, עיצוב, שירות. כולל מע״מ">
            <NumberInput value={budget.venue.extras} onChange={(v) => setVenue({ extras: v })} />
          </Field>
          <Field label="סכום סופי בחוזה (₪)" hint="כשיש חוזה חתום, יחליף את החישוב">
            <NumberInput value={budget.venue.actual} onChange={(v) => setVenue({ actual: v })} />
          </Field>
        </div>
        <div style={{ marginBlockStart: 12 }}>
          <Check checked={budget.venue.includesVat} onChange={(v) => setVenue({ includesVat: v })}>
            המחיר לצלחת כבר כולל מע״מ ({Math.round(VAT_RATE * 100)}%)
          </Check>
        </div>

        {(budget.venue.perPlate ?? 0) > 0 ? (
          <div className="stack" style={{ marginBlockStart: 12 }}>
            <div className="grid grid-3">
              <Stat label="צלחות לחיוב" value={venue.chargedPlates} sub={`${headcount} אורחים`} />
              <Stat label="מחיר צלחת בפועל" value={shekelExact(Math.round(venue.perPlateGross * 100) / 100)} sub="כולל מע״מ" />
              <Stat label="סה״כ מקום ואוכל" value={shekel(venue.total)} />
            </div>
            {!budget.venue.includesVat ? (
              <Notice tone="info">
                מע״מ מוסיף {shekelExact(Math.round(venue.vatPerPlate * 100) / 100)} לכל צלחת, כלומר{" "}
                {shekel(venue.vatPerPlate * venue.chargedPlates)} בסך הכול. מקומות מצטטים לפעמים לפני ולפעמים אחרי
                מע״מ, ולכן בקשו בכתב מה כלול בציטוט.
              </Notice>
            ) : null}
            {venue.emptyPlates > 0 ? (
              <Notice tone="caution">
                המינימום של המקום גבוה ב־{venue.emptyPlates} צלחות ממספר האורחים. זה {shekel(venue.emptyPlates * venue.perPlateGross)}{" "}
                על שולחנות ריקים: שווה לנסות לנהל משא ומתן על המינימום, או לבדוק מקום אחר.
              </Notice>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card title="שאר ההוצאות">
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>סעיף</th>
                <th className="num">תכנון (₪)</th>
                <th className="num">בפועל (₪)</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows
                .filter((r) => r.key !== "venue")
                .map((r) => (
                  <tr key={r.key}>
                    <td>
                      {r.label}
                      {r.def?.range ? (
                        <div className="field-hint">
                          חתונה סטנדרטית: {r.def.range[0].toLocaleString("he-IL")}–{r.def.range[1].toLocaleString("he-IL")}
                        </div>
                      ) : null}
                      {r.def?.hint ? <div className="field-hint">{r.def.hint}</div> : null}
                      {r.key === "acum" ? <div className="field-hint">תעריף קבוע ל־2026, משולם באתר אקו״ם עד 72 שעות לפני</div> : null}
                      {r.key === "rabbinate" ? <div className="field-hint">מתעדכן מדי שנה. 40% הנחה לזכאים (בסקירה)</div> : null}
                    </td>
                    {r.auto ? (
                      <td className="num" colSpan={2}>
                        {shekelExact(r.amount)}
                      </td>
                    ) : (
                      <>
                        <td className="num">
                          <NumberInput
                            ariaLabel={`תכנון: ${r.label}`}
                            value={budget.lines[r.key as BudgetLineKey].planned}
                            onChange={(v) => setLine(r.key as BudgetLineKey, { planned: v })}
                          />
                        </td>
                        <td className="num">
                          <NumberInput
                            ariaLabel={`בפועל: ${r.label}`}
                            value={budget.lines[r.key as BudgetLineKey].actual}
                            onChange={(v) => setLine(r.key as BudgetLineKey, { actual: v })}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="field-hint" style={{ marginBlockStart: 8 }}>
          הטווחים הם לחתונה סטנדרטית של 200–400 אורחים. במיקרו חתונה רבים מהם נמוכים יותר. הזינו סכומים כולל מע״מ.
        </p>
      </Card>

      <Card title="סיכום">
        <div className="grid grid-3">
          <Stat label="סה״כ עלות" value={shekel(summary.amount)} sub={`${shekel(summary.planned)} לפי התכנון`} />
          {summary.remaining !== null ? (
            <Stat
              label={summary.over ? "חריגה" : "נשאר בתקציב"}
              value={shekel(Math.abs(summary.remaining))}
              sub={summary.over ? "מעל התקציב" : "מתוך " + shekel(budget.total ?? 0)}
            />
          ) : (
            <Stat label="נשאר בתקציב" value="—" sub="הזינו תקציב כולל" />
          )}
          <Stat label="לכל אורח" value={summary.perGuest !== null ? shekel(summary.perGuest) : "—"} />
        </div>
        <div className="stack" style={{ marginBlockStart: 14 }}>
          {summary.rows
            .filter((r) => r.amount > 0)
            .map((r) => (
              <div key={r.key}>
                <div className="row row-between">
                  <span>{r.label}</span>
                  <span className="muted">
                    {shekel(r.amount)} · {r.share}%
                  </span>
                </div>
                <div className="bar" aria-hidden>
                  <span style={{ width: `${Math.min(100, r.share)}%` }} />
                </div>
              </div>
            ))}
        </div>
        {guests.estimatedGifts > 0 ? (
          <Notice tone="info">
            מתנות במזומן: אם כל מי שלא סירב יגיע, בערך {shekel(guests.estimatedGifts)} (ממוצעים נהוגים לפי סוג קשר).
            זה כלל אצבע שמדווחים עליו ולא מדד, ולכן אל תתקצבו הוצאות על סמך זה.
          </Notice>
        ) : null}
        <p className="field-hint">
          רישיון אקו״ם: {ACUM.fee} ₪ לכל אירוע. אם התקליטן משלם אותו, ודאו שזה כתוב בחוזה.
        </p>
      </Card>
    </>
  );
}
