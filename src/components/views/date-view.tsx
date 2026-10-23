"use client";

import { useMemo, useState } from "react";
import { RABBINATE } from "@/config/benchmarks";
import {
  bestDatesByMonth,
  checkDate,
  earliestAfterPriorMarriage,
  type DateReport,
  type DayTier,
  type SeasonTier,
  type Status,
} from "@/lib/date-rules";
import { addDays, diffDays, formatLongDate, parseIso, todayIso, WEEKDAY_HE, MONTH_HE } from "@/lib/hebrew-calendar";
import type { Custom, Route } from "@/lib/state";
import { useAppState } from "../app-state";
import { Badge, Card, Disclaimer, Field, Notice, PageHeader, Ready } from "../ui";

const DAY_NOTE: Record<DayTier, string> = {
  low: "ימים א׳–ד׳: התמחור הזול ביותר",
  peak: "יום חמישי: התוספת הגבוהה ביותר, כמעט כמו עונת שיא",
  friday: "יום שישי בצהריים: תוספת מחיר, וצריך לסיים לפני שבת",
  motzei: "מוצאי שבת: תוספת קטנה",
};
const SEASON_NOTE: Record<SeasonTier, string> = {
  low: "חורף (נובמבר–פברואר): הכי זול, והזמן הטוב למיקוח",
  mid: "אביב וסתיו: בינוני",
  high: "קיץ (יוני–אוגוסט): ביקוש שיא, מזמינים 12 חודשים מראש",
};
const STATUS_LABEL: Record<Status, string> = { ok: "פנוי", caution: "דורש בירור", blocked: "לא זמין" };
const STATUS_MARK: Record<Status, string> = { ok: "✓", caution: "!", blocked: "✕" };

const DOW_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const monthFmt = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" });

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}
function shiftMonth(first: string, delta: number): string {
  const [y, m] = first.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  return d.toISOString().slice(0, 10);
}

export function DateView() {
  return (
    <>
      <PageHeader
        title="תאריך"
        lead="איזה תאריכים פנויים לפי הלוח העברי ולפי החוק, ואילו מהם זולים. הכול תלוי במנהג שלכם."
      />
      <Ready>
        <Planner />
      </Ready>
      <Disclaimer />
    </>
  );
}

function Planner() {
  const [state, update] = useAppState();
  const { profile } = state;
  const today = todayIso();
  const opts = { custom: profile.custom, route: profile.route } as const;

  const [selected, setSelected] = useState<string>(profile.weddingDate);
  const [month, setMonth] = useState<string>(monthStart(profile.weddingDate || addDays(today, 60)));

  const setProfile = (patch: { custom?: Custom; route?: Route }) =>
    update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const days = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Array.from({ length: count }, (_, i) => checkDate(`${month.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`, opts));
  }, [month, opts.custom, opts.route]);

  const earliest = addDays(today, profile.route === "rabbinate" ? RABBINATE.latestOpenDaysBefore + 1 : 14);
  const picks = useMemo(
    () => bestDatesByMonth(earliest, 12, 2, opts),
    [earliest, opts.custom, opts.route],
  );

  const report: DateReport | null = selected && parseIso(selected) ? checkDate(selected, opts) : null;
  const leading = days[0]?.weekday ?? 0;
  const [yy, mm] = month.split("-").map(Number);
  const waiting =
    profile.previouslyMarried && profile.priorEndDate ? earliestAfterPriorMarriage(profile.priorEndDate) : null;

  function pick(iso: string) {
    setSelected(iso);
    setMonth(monthStart(iso));
  }

  return (
    <>
      <Card title="מה חל עליכם">
        <div className="grid grid-2">
          <Field label="מנהג הקהילה" hint="אשכנזים וספרדים נבדלים בשלושת השבועות ובעומר">
            <select value={profile.custom} onChange={(e) => setProfile({ custom: e.target.value as Custom })}>
              <option value="ashkenazi">אשכנזי</option>
              <option value="sephardi">ספרדי</option>
            </select>
          </Field>
          <Field label="מסלול" hint="מחוץ לרבנות, כללי ההלכה הם המלצה ולא חסם">
            <select value={profile.route} onChange={(e) => setProfile({ route: e.target.value as Route })}>
              <option value="rabbinate">הרבנות</option>
              <option value="cyprus">אזרחי: קפריסין</option>
              <option value="utah">אזרחי: יוטה בזום</option>
            </select>
          </Field>
        </div>
        {waiting ? (
          <Notice tone="caution">
            אחרי גירושין או פטירה: התאריך המוקדם ביותר הוא {formatLongDate(waiting)} (90 יום, בלי יום האירוע ובלי יום
            האירוסין). מה מתחיל את הספירה שנוי במחלוקת, ולכן אשרו את התאריך מול לשכת רישום הנישואין.
          </Notice>
        ) : null}
      </Card>

      <Card>
        <div className="cal-head">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="החודש הקודם">
            →
          </button>
          <h2 style={{ margin: 0 }} aria-live="polite">
            {monthFmt.format(new Date(Date.UTC(yy, mm - 1, 1, 12)))}
          </h2>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="החודש הבא">
            ←
          </button>
        </div>
        <div className="cal" role="group" aria-label="לוח שנה">
          {DOW_SHORT.map((d) => (
            <div key={d} className="cal-dow" aria-hidden>
              {d}
            </div>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <div key={`e${i}`} className="cal-empty" />
          ))}
          {days.map((d) => {
            const dayNum = Number(d.date.slice(8));
            const past = diffDays(today, d.date) < 0;
            return (
              <button
                key={d.date}
                type="button"
                className={`cal-cell cal-${d.status} ${d.date === profile.weddingDate ? "is-wedding" : ""} ${d.date === today ? "is-today" : ""}`}
                aria-pressed={d.date === selected}
                aria-label={`${formatLongDate(d.date)}, ${d.hebrewLabel}: ${STATUS_LABEL[d.status]}`}
                style={past ? { opacity: 0.45 } : undefined}
                onClick={() => setSelected(d.date)}
              >
                <span>{dayNum}</span>
                <small>{d.hebrew.day === 1 ? MONTH_HE[d.hebrew.month] : d.hebrew.day}</small>
                <span className="mark" aria-hidden>
                  {STATUS_MARK[d.status]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="legend" aria-hidden>
          <span>✓ פנוי</span>
          <span>! דורש בירור</span>
          <span>✕ לא זמין</span>
          <span>♥ התאריך שלכם</span>
        </div>
      </Card>

      {report ? (
        <Card title={formatLongDate(report.date)}>
          <div className="row" style={{ marginBlockEnd: 10 }}>
            <Badge tone={report.status === "ok" ? "ok" : report.status === "caution" ? "caution" : "blocked"}>
              {STATUS_LABEL[report.status]}
            </Badge>
            <span className="muted">{report.hebrewLabel} {report.hebrew.year}</span>
          </div>

          {report.findings.length === 0 ? (
            <Notice tone="ok">אין כאן חסם הלכתי או חוקי מוכר. עדיין כדאי לאשר מול מסדר הקידושין.</Notice>
          ) : (
            report.findings.map((f) => (
              <Notice key={f.id} tone={f.severity === "blocked" ? "blocked" : "caution"}>
                <strong>{f.title}.</strong> {f.detail}
              </Notice>
            ))
          )}
          {report.customDependent ? (
            <Notice tone="info">
              התשובה לתאריך הזה שונה בין אשכנזים לספרדים. אם אינכם בטוחים מה המנהג שלכם, שאלו את מסדר הקידושין.
            </Notice>
          ) : null}

          <ul style={{ paddingInlineStart: 20, margin: "0 0 12px" }}>
            <li>{DAY_NOTE[report.dayTier]}</li>
            <li>{SEASON_NOTE[report.season]}</li>
          </ul>

          {profile.route === "rabbinate" ? (
            <p className="muted">
              פתיחת תיק נישואין: המועד האחרון {formatLongDate(addDays(report.date, -RABBINATE.latestOpenDaysBefore))}
              {diffDays(today, report.date) > RABBINATE.latestOpenDaysBefore
                ? ` (בעוד ${diffDays(today, report.date) - RABBINATE.latestOpenDaysBefore} ימים)`
                : " (כבר עבר או היום)"}
              .
            </p>
          ) : null}

          <div className="row">
            <button
              type="button"
              className="primary"
              disabled={report.status === "blocked"}
              onClick={() => update((s) => ({ ...s, profile: { ...s.profile, weddingDate: report.date } }))}
            >
              {profile.weddingDate === report.date ? "זה התאריך שלנו ✓" : "קבעו כתאריך החתונה"}
            </button>
            {profile.weddingDate === report.date ? (
              <button
                type="button"
                onClick={() => update((s) => ({ ...s, profile: { ...s.profile, weddingDate: "" } }))}
              >
                ביטול התאריך
              </button>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="muted" style={{ margin: 0 }}>
            לחצו על יום בלוח כדי לראות מה חל עליו.
          </p>
        </Card>
      )}

      <Card title="תאריכים פנויים וזולים">
        <p className="muted">
          הזולים ביותר בכל חודש בשנה הקרובה, לפי יום בשבוע ועונה. זה ביקוש יחסי, לא מחיר: שאלו כל מקום מה הוא גובה.
          {profile.route === "rabbinate"
            ? ` מוצגים רק תאריכים שאפשר עוד לפתוח להם תיק (${RABBINATE.latestOpenDaysBefore} יום מראש).`
            : ""}
        </p>
        <div className="stack">
          {picks.map((p) => (
            <div key={p.month}>
              <h3>{monthFmt.format(new Date(`${p.month}-01T12:00:00Z`))}</h3>
              <div className="row" style={{ marginBlockStart: 6 }}>
                {p.dates.map((d) => (
                  <button key={d.date} type="button" onClick={() => pick(d.date)}>
                    {d.date.slice(8)}/{d.date.slice(5, 7)} · יום {WEEKDAY_HE[d.weekday]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
