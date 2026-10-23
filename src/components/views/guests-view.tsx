"use client";

import { useState, type FormEvent } from "react";
import { GUEST_GROUPS, MICRO_MAX_GUESTS, type GuestGroupKey } from "@/config/benchmarks";
import { summarizeGuests } from "@/lib/guests";
import { newId, type Diet, type Guest, type Rsvp, type Side } from "@/lib/state";
import { useAppState } from "../app-state";
import { Badge, Card, Disclaimer, Field, Notice, NumberInput, PageHeader, Ready, Stat } from "../ui";

const RSVP_LABEL: Record<Rsvp, string> = { pending: "ממתין", yes: "אישר/ה", no: "לא מגיע/ה" };
const DIET_LABEL: Record<Diet, string> = {
  none: "ללא הגבלה",
  vegetarian: "צמחוני",
  vegan: "טבעוני",
  glutenFree: "ללא גלוטן",
  other: "אחר (ראו הערה)",
};

export function GuestsView() {
  return (
    <>
      <PageHeader title="אורחים" lead="רשימת המוזמנים, אישורי הגעה והעדפות אוכל, כדי שהמקום יקבל מספר אחד מדויק." />
      <Ready>
        <Guests />
      </Ready>
      <Disclaimer />
    </>
  );
}

function Guests() {
  const [state, update] = useAppState();
  const { profile, guests } = state;
  const summary = summarizeGuests(guests);
  const [filter, setFilter] = useState<"all" | Rsvp>("all");
  const [draft, setDraft] = useState<{ name: string; group: GuestGroupKey; side: Side; partySize: number | null }>({
    name: "",
    group: "friends",
    side: "both",
    partySize: 1,
  });

  const sideLabel: Record<Side, string> = {
    a: profile.partnerA || "צד א׳",
    b: profile.partnerB || "צד ב׳",
    both: "משותף",
  };

  const patch = (id: string, p: Partial<Guest>) =>
    update((s) => ({ ...s, guests: s.guests.map((g) => (g.id === id ? { ...g, ...p } : g)) }));

  function add(e: FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const guest: Guest = {
      id: newId(),
      name,
      group: draft.group,
      side: draft.side,
      partySize: Math.max(1, Math.round(draft.partySize ?? 1)),
      rsvp: "pending",
      diet: "none",
      note: "",
    };
    update((s) => ({ ...s, guests: [...s.guests, guest] }));
    setDraft({ ...draft, name: "", partySize: 1 });
  }

  const shown = guests.filter((g) => filter === "all" || g.rsvp === filter);
  const dietTotal = Object.values(summary.byDiet).reduce((a, b) => a + b, 0);

  return (
    <>
      <Card title="סיכום">
        <div className="grid grid-3">
          <Stat label="מוזמנים" value={summary.invited} sub={`${summary.parties} הזמנות`} />
          <Stat label="אישרו" value={summary.confirmed} />
          <Stat label="ממתינים" value={summary.pending} />
          <Stat label="לא מגיעים" value={summary.declined} />
          <Stat label="לתכנון הצלחות" value={summary.headcount} sub="אישרו + ממתינים" />
        </div>
        {summary.invited > MICRO_MAX_GUESTS ? (
          <Notice tone="info">ברשימה יותר מ־{MICRO_MAX_GUESTS} מוזמנים, זה כבר לא מיקרו.</Notice>
        ) : null}
        <p className="muted" style={{ marginBlockStart: 10, marginBlockEnd: 0 }}>
          לא כולם שאישרו מגיעים, ולא כולם שלא ענו נעדרים. אשרו מספר סופי מול המקום בשבוע האחרון.
        </p>
        {dietTotal > 0 ? (
          <p style={{ marginBlockStart: 10, marginBlockEnd: 0 }}>
            העדפות אוכל:{" "}
            {(Object.entries(summary.byDiet) as [Exclude<Diet, "none">, number][])
              .filter(([, n]) => n > 0)
              .map(([k, n]) => `${DIET_LABEL[k]} ${n}`)
              .join(" · ")}
          </p>
        ) : null}
      </Card>

      <Card title="הוספת מוזמן">
        <form onSubmit={add} className="grid grid-2">
          <Field label="שם">
            <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="כמה אנשים בהזמנה" hint="כולל המוזמן/ת עצמו/ה והמלווים">
            <NumberInput value={draft.partySize} min={1} onChange={(v) => setDraft({ ...draft, partySize: v })} />
          </Field>
          <Field label="קשר">
            <select value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value as GuestGroupKey })}>
              {GUEST_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="מצד מי">
            <select value={draft.side} onChange={(e) => setDraft({ ...draft, side: e.target.value as Side })}>
              {(Object.keys(sideLabel) as Side[]).map((k) => (
                <option key={k} value={k}>
                  {sideLabel[k]}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <button type="submit" className="primary" disabled={!draft.name.trim()}>
              הוספה
            </button>
          </div>
        </form>
      </Card>

      <Card title={`הרשימה (${shown.length})`}>
        <div className="row" style={{ marginBlockEnd: 12 }} role="group" aria-label="סינון לפי תשובה">
          {(["all", "yes", "pending", "no"] as const).map((f) => (
            <button key={f} type="button" className={filter === f ? "primary" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "הכול" : RSVP_LABEL[f]}
            </button>
          ))}
        </div>

        {guests.length === 0 ? (
          <p className="muted">עוד אין מוזמנים. הוסיפו את הראשון למעלה.</p>
        ) : shown.length === 0 ? (
          <p className="muted">אין מוזמנים בסינון הזה.</p>
        ) : (
          shown.map((g) => (
            <div key={g.id} className={`item ${g.rsvp === "no" ? "declined" : ""}`}>
              <div className="row row-between" style={{ marginBlockEnd: 8 }}>
                <div className="row">
                  <strong>{g.name}</strong>
                  <Badge tone={g.rsvp === "yes" ? "ok" : g.rsvp === "no" ? "blocked" : "caution"}>{RSVP_LABEL[g.rsvp]}</Badge>
                  <span className="muted">
                    {g.partySize > 1 ? `${g.partySize} אנשים · ` : ""}
                    {sideLabel[g.side]}
                  </span>
                </div>
                <button
                  type="button"
                  className="link danger"
                  onClick={() => {
                    if (window.confirm(`למחוק את ${g.name}?`)) update((s) => ({ ...s, guests: s.guests.filter((x) => x.id !== g.id) }));
                  }}
                >
                  מחיקה
                </button>
              </div>
              <div className="item-grid">
                <Field label="תשובה">
                  <select value={g.rsvp} onChange={(e) => patch(g.id, { rsvp: e.target.value as Rsvp })}>
                    {(Object.keys(RSVP_LABEL) as Rsvp[]).map((k) => (
                      <option key={k} value={k}>
                        {RSVP_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="אנשים">
                  <NumberInput value={g.partySize} min={1} onChange={(v) => patch(g.id, { partySize: Math.max(1, Math.round(v ?? 1)) })} />
                </Field>
                <Field label="קשר">
                  <select value={g.group} onChange={(e) => patch(g.id, { group: e.target.value as GuestGroupKey })}>
                    {GUEST_GROUPS.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="מצד מי">
                  <select value={g.side} onChange={(e) => patch(g.id, { side: e.target.value as Side })}>
                    {(Object.keys(sideLabel) as Side[]).map((k) => (
                      <option key={k} value={k}>
                        {sideLabel[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="אוכל">
                  <select value={g.diet} onChange={(e) => patch(g.id, { diet: e.target.value as Diet })}>
                    {(Object.keys(DIET_LABEL) as Diet[]).map((k) => (
                      <option key={k} value={k}>
                        {DIET_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="הערה">
                  <input type="text" value={g.note} onChange={(e) => patch(g.id, { note: e.target.value })} />
                </Field>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
