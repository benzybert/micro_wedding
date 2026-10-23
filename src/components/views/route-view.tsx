"use client";

import { RABBINATE } from "@/config/benchmarks";
import { addDays, diffDays, formatLongDate, todayIso, weekdayOf } from "@/lib/hebrew-calendar";
import {
  CIVIL_FOREIGN_SPOUSE_NOTE,
  docKey,
  RABBINATE_DOCS,
  ROUTES,
  WHO_GOES_CIVIL,
} from "@/lib/registration";
import type { Route } from "@/lib/state";
import { useAppState } from "../app-state";
import { Badge, Card, Check, Disclaimer, Notice, PageHeader, Ready } from "../ui";

export function RouteView() {
  return (
    <>
      <PageHeader
        title="מסלול רישום"
        lead="איך מתחתנים, מה צריך להביא, ומה המועד שאי אפשר לפספס."
      />
      <Ready>
        <RouteBody />
      </Ready>
      <Disclaimer />
    </>
  );
}

function RouteBody() {
  const [state, update] = useAppState();
  const { profile } = state;
  const today = todayIso();
  const info = ROUTES[profile.route];

  const setRoute = (route: Route) => update((s) => ({ ...s, profile: { ...s.profile, route } }));
  const toggleDoc = (id: string, value: boolean) =>
    update((s) => {
      const done = { ...s.done };
      if (value) done[docKey(id)] = true;
      else delete done[docKey(id)];
      return { ...s, done };
    });

  const latest = profile.weddingDate ? addDays(profile.weddingDate, -RABBINATE.latestOpenDaysBefore) : null;
  const left = latest ? diffDays(today, latest) : null;
  const doneDocs = RABBINATE_DOCS.filter((d) => state.done[docKey(d.id)]).length;

  return (
    <>
      <Card title="המסלול שלכם">
        <div className="grid grid-3" role="radiogroup" aria-label="מסלול נישואין">
          {(Object.keys(ROUTES) as Route[]).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={profile.route === r}
              className={profile.route === r ? "primary" : ""}
              onClick={() => setRoute(r)}
            >
              {ROUTES[r].label}
            </button>
          ))}
        </div>
        <p style={{ marginBlockStart: 12 }}>{info.tagline}</p>
        <p className="muted">{info.cost}</p>
        <details>
          <summary>מי בוחר במסלול אזרחי</summary>
          <p style={{ marginBlockStart: 8 }}>{WHO_GOES_CIVIL}</p>
        </details>
      </Card>

      {profile.route === "rabbinate" && latest !== null && left !== null ? (
        <Notice tone={left < 0 ? "blocked" : left <= 14 ? "caution" : "info"}>
          <strong>המועד האחרון לפתוח תיק נישואין: {formatLongDate(latest)}.</strong>{" "}
          {weekdayOf(latest) === 6 ? "המועד חל בשבת, ולכן תכננו להגיע לפני כן. " : ""}
          {left < 0
            ? "המועד עבר. פנו היום ללשכת רישום ושאלו מה אפשרי."
            : left === 0
              ? "היום."
              : `בעוד ${left} ימים. עדיף להתחיל כבר 60–90 יום לפני החתונה.`}
        </Notice>
      ) : null}

      <Card title="השלבים">
        <ol style={{ paddingInlineStart: 22, margin: 0 }}>
          {info.steps.map((s) => (
            <li key={s} style={{ marginBlockEnd: 6 }}>
              {s}
            </li>
          ))}
        </ol>
      </Card>

      {info.caveats.length > 0 ? (
        <Card title="חשוב לדעת">
          <ul style={{ paddingInlineStart: 22, margin: 0 }}>
            {info.caveats.map((c) => (
              <li key={c} style={{ marginBlockEnd: 6 }}>
                {c}
              </li>
            ))}
          </ul>
          {profile.route !== "rabbinate" && profile.foreignSpouse ? (
            <Notice tone="caution">{CIVIL_FOREIGN_SPOUSE_NOTE}</Notice>
          ) : null}
        </Card>
      ) : null}

      {profile.route === "rabbinate" ? (
        <Card
          title={
            <span className="row">
              מסמכים לתיק <Badge tone={doneDocs === RABBINATE_DOCS.length ? "ok" : "info"}>{doneDocs}/{RABBINATE_DOCS.length}</Badge>
            </span>
          }
        >
          <p className="muted">
            סמנו מה כבר יש לכם. חלק מהמסמכים רלוונטיים רק למי שעלה, התגייר, התגרש או התאלמן.
          </p>
          <div className="stack">
            {RABBINATE_DOCS.map((d) => (
              <div key={d.id}>
                <Check checked={!!state.done[docKey(d.id)]} onChange={(v) => toggleDoc(d.id, v)}>
                  {d.label}
                </Check>
                {d.note ? <div className="field-hint" style={{ marginInlineStart: 28 }}>{d.note}</div> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title="ברור יהדות ועזרה">
        <p>
          אם להורים אין תעודת נישואין של הרבנות בישראל, ייתכן שייפתח ברור יהדות. זה תהליך נפרד בבית הדין האזורי, ללא
          עלות, ואין לו זמן מפורסם. מי שקרוב מדרגה ראשונה שלו כבר נישא בישראל דרך ברור עשוי להיות פטור. עדיף להתחיל
          מוקדם ככל האפשר.
        </p>
        <p style={{ marginBlockEnd: 0 }}>
          ארגון ITIM מלווה זוגות בתהליך מול הרבנות: <a href="https://www.itim.org.il/" rel="noreferrer noopener" target="_blank">itim.org.il</a>.
          פרטים רשמיים על פתיחת תיק:{" "}
          <a href="https://www.gov.il/he/pages/opening_a_marriage_file" rel="noreferrer noopener" target="_blank">
            gov.il
          </a>
          .
        </p>
      </Card>
    </>
  );
}
