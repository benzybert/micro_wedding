"use client";

import Link from "next/link";
import { useRef } from "react";
import { MICRO_MAX_GUESTS, type Region } from "@/config/benchmarks";
import { summarizeBudget } from "@/lib/budget";
import { planningHeadcount, summarizeGuests } from "@/lib/guests";
import { diffDays, formatLongDate, todayIso } from "@/lib/hebrew-calendar";
import { buildAlerts } from "@/lib/insights";
import { defaultState, type Custom, type Profile, type Route } from "@/lib/state";
import { buildTimeline } from "@/lib/timeline";
import { summarizeVendors } from "@/lib/vendors";
import { replaceState, resetState, useAppState } from "../app-state";
import { Card, Check, Disclaimer, Field, NumberInput, PageHeader, Ready, Stat, shekel } from "../ui";

export function DashboardView() {
  return (
    <>
      <PageHeader
        title="מיקרו חתונה"
        lead="כל מה שצריך לתכנן חתונה קטנה בישראל, במקום אחד: תאריך שפנוי, תקציב, אורחים, ספקים ולוח זמנים."
      />
      <Ready>
        <Overview />
      </Ready>
      <Disclaimer />
    </>
  );
}

function Overview() {
  const [state, update] = useAppState();
  const today = todayIso();
  const { profile } = state;
  const setProfile = (patch: Partial<Profile>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const guests = summarizeGuests(state.guests);
  const headcount = planningHeadcount(guests, profile.plannedGuests);
  const budget = summarizeBudget(state.budget, { headcount, route: profile.route, discount40: profile.discount40 });
  const vendors = summarizeVendors(state.vendors);
  const tasks = buildTimeline(profile, state.done, today);
  const alerts = buildAlerts(state, today);
  const bookedCount = vendors.categories.filter((c) => c.booked).length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  const days = profile.weddingDate ? diffDays(today, profile.weddingDate) : null;
  const names = [profile.partnerA, profile.partnerB].filter(Boolean).join(" ו");

  return (
    <>
      <Card title={names ? `שלום ${names}` : "בואו נתחיל"}>
        <div className="grid grid-3">
          <Stat
            label="עד החתונה"
            value={days === null ? "אין תאריך" : days > 0 ? `${days} ימים` : days === 0 ? "היום!" : "עבר"}
            sub={profile.weddingDate ? formatLongDate(profile.weddingDate) : <Link href="/date">בחרו תאריך</Link>}
          />
          <Stat
            label="אורחים"
            value={headcount || "—"}
            sub={
              guests.parties > 0
                ? `${guests.confirmed} אישרו · ${guests.pending} ממתינים`
                : profile.plannedGuests
                  ? "מספר משוער"
                  : <Link href="/guests">הוסיפו מוזמנים</Link>
            }
          />
          <Stat
            label="תקציב מתוכנן"
            value={budget.amount > 0 ? shekel(budget.amount) : "—"}
            sub={
              budget.total !== null
                ? budget.remaining !== null && budget.remaining >= 0
                  ? `נשארו ${shekel(budget.remaining)}`
                  : `חריגה ${shekel(-(budget.remaining ?? 0))}`
                : <Link href="/budget">קבעו תקציב</Link>
            }
          />
          <Stat label="ספקים סגורים" value={bookedCount} sub={<Link href="/vendors">לספקים</Link>} />
          <Stat
            label="משימות"
            value={tasks.length ? `${doneTasks}/${tasks.length}` : "—"}
            sub={tasks.length ? <Link href="/timeline">ללוח הזמנים</Link> : "מופיעות אחרי שבוחרים תאריך"}
          />
        </div>
        {headcount > MICRO_MAX_GUESTS ? (
          <p className="muted" style={{ marginBlockStart: 12 }}>
            מעל {MICRO_MAX_GUESTS} אורחים כבר לא מיקרו חתונה, אבל הכלים כאן עדיין מתאימים.
          </p>
        ) : null}
      </Card>

      {alerts.length > 0 ? (
        <Card title="מה דורש תשומת לב">
          <ul className="alert-list">
            {alerts.map((a) => (
              <li key={a.id} className={`alert-${a.level}`}>
                <span aria-hidden>{a.level === "red" ? "⛔" : a.level === "amber" ? "⚠️" : "ℹ️"}</span>
                <span>
                  {a.text} {a.href ? <Link href={a.href}>לפתוח</Link> : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="הפרטים שלנו" id="profile">
        <div className="grid grid-2">
          <Field label="שם הראשון/ה">
            <input type="text" value={profile.partnerA} onChange={(e) => setProfile({ partnerA: e.target.value })} />
          </Field>
          <Field label="שם השני/ה">
            <input type="text" value={profile.partnerB} onChange={(e) => setProfile({ partnerB: e.target.value })} />
          </Field>
          <Field label="תאריך החתונה" hint="בדקו קודם בלשונית ״תאריך״ שהוא פנוי">
            <input type="date" value={profile.weddingDate} onChange={(e) => setProfile({ weddingDate: e.target.value })} />
          </Field>
          <Field label="מספר אורחים משוער" hint="עד שיש רשימת מוזמנים">
            <NumberInput value={profile.plannedGuests} onChange={(v) => setProfile({ plannedGuests: v })} />
          </Field>
          <Field label="מסלול הנישואין" hint="הרבנות, או נישואין אזרחיים בקפריסין או ביוטה">
            <select value={profile.route} onChange={(e) => setProfile({ route: e.target.value as Route })}>
              <option value="rabbinate">הרבנות</option>
              <option value="cyprus">אזרחי: קפריסין</option>
              <option value="utah">אזרחי: יוטה בזום</option>
            </select>
          </Field>
          <Field label="מנהג הקהילה" hint="קובע את שלושת השבועות והעומר. אם לא בטוחים, שאלו את מסדר הקידושין">
            <select value={profile.custom} onChange={(e) => setProfile({ custom: e.target.value as Custom })}>
              <option value="ashkenazi">אשכנזי</option>
              <option value="sephardi">ספרדי</option>
            </select>
          </Field>
          <Field label="אזור">
            <select value={profile.region} onChange={(e) => setProfile({ region: e.target.value as Region })}>
              <option value="center">מרכז</option>
              <option value="periphery">פריפריה</option>
            </select>
          </Field>
        </div>
        <div className="stack" style={{ marginBlockStart: 14 }}>
          <Check checked={profile.discount40} onChange={(v) => setProfile({ discount40: v })}>
            זכאים להנחה של 40% באגרת הרישום (עולים, חיילים, שירות לאומי, סטודנטים מתחת לגיל 30)
          </Check>
          <Check checked={profile.previouslyMarried} onChange={(v) => setProfile({ previouslyMarried: v })}>
            אחד מאיתנו היה נשוי בעבר (גרושה או אלמנה ממתינה 90 יום)
          </Check>
          {profile.previouslyMarried ? (
            <Field label="תאריך הגירושין או הפטירה">
              <input type="date" value={profile.priorEndDate} onChange={(e) => setProfile({ priorEndDate: e.target.value })} />
            </Field>
          ) : null}
          <Check checked={profile.foreignSpouse} onChange={(v) => setProfile({ foreignSpouse: v })}>
            אחד מאיתנו אינו אזרח ישראלי
          </Check>
          <Check checked={profile.needsBerur} onChange={(v) => setProfile({ needsBerur: v })}>
            ייתכן שנצטרך ברור יהדות (להורים אין תעודת נישואין של הרבנות בישראל)
          </Check>
        </div>
      </Card>

      <DataPanel />
    </>
  );
}

function DataPanel() {
  const [state] = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "micro-wedding.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (window.confirm("לטעון את הקובץ? הנתונים הנוכחיים יוחלפו.")) replaceState(parsed);
    } catch {
      window.alert("לא הצלחנו לקרוא את הקובץ.");
    }
  }

  return (
    <Card title="הנתונים שלכם">
      <p className="muted">
        הכול נשמר בדפדפן הזה בלבד. כדי לעבור למכשיר אחר או לשתף עם בן או בת הזוג, ייצאו קובץ וייבאו אותו שם.
      </p>
      <div className="row">
        <button type="button" onClick={exportJson}>
          ייצוא לקובץ
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          ייבוא מקובץ
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importJson(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="danger"
          onClick={() => {
            if (window.confirm("למחוק את כל הנתונים מהדפדפן הזה? אי אפשר לבטל.")) resetState();
          }}
        >
          מחיקת הכול
        </button>
      </div>
      <p className="muted" style={{ marginBlockStart: 10, marginBlockEnd: 0 }}>
        {state.guests.length} מוזמנים · {state.vendors.length} ספקים ·{" "}
        {JSON.stringify(state) === JSON.stringify(defaultState()) ? "עדיין ריק" : "נשמר"}
      </p>
    </Card>
  );
}
