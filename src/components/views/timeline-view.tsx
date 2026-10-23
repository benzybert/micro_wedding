"use client";

import Link from "next/link";
import { formatLongDate, todayIso } from "@/lib/hebrew-calendar";
import { buildTimeline, PHASE_LABEL, type TaskStatus, type TimelineTask } from "@/lib/timeline";
import { useAppState } from "../app-state";
import { Badge, Card, Check, Disclaimer, Notice, PageHeader, Ready } from "../ui";

const SECTIONS: { status: TaskStatus; title: string }[] = [
  { status: "missed", title: "פספסתם מועד אחרון" },
  { status: "now", title: "לטפל עכשיו" },
  { status: "soon", title: "בשבועיים הקרובים" },
  { status: "later", title: "בהמשך" },
  { status: "done", title: "בוצע" },
];

export function TimelineView() {
  return (
    <>
      <PageHeader
        title="לוח זמנים"
        lead="משימות שנבנות לאחור מתאריך החתונה. מועדים קשיחים של החוק מסומנים בנפרד ממועדים מומלצים."
      />
      <Ready>
        <Timeline />
      </Ready>
      <Disclaimer />
    </>
  );
}

function Timeline() {
  const [state, update] = useAppState();
  const today = todayIso();
  const tasks = buildTimeline(state.profile, state.done, today);

  if (!state.profile.weddingDate) {
    return (
      <Notice tone="info">
        לוח הזמנים נבנה מתאריך החתונה. <Link href="/date">בחרו תאריך</Link> או הזינו אותו בסקירה.
      </Notice>
    );
  }

  const toggle = (t: TimelineTask, value: boolean) =>
    update((s) => {
      const done = { ...s.done };
      if (value) done[t.doneKey] = true;
      else delete done[t.doneKey];
      return { ...s, done };
    });

  return (
    <>
      <Notice tone="info">
        הלוח מבוסס על לוח זמנים לחתונה סטנדרטית. במיקרו חתונה אפשר בדרך כלל לקצר את המשימות הרכות, ולכן משימה שהמועד
        המומלץ שלה עבר מופיעה כ״לטפל עכשיו״. המועדים הקשיחים לא מתקצרים.
      </Notice>
      {SECTIONS.map(({ status, title }) => {
        const list = tasks.filter((t) => t.status === status);
        if (list.length === 0) return null;
        return (
          <Card key={status} title={`${title} (${list.length})`}>
            {list.map((t) => (
              <div key={t.id} className={`item ${t.status === "done" ? "done" : ""}`}>
                <Check checked={t.status === "done"} onChange={(v) => toggle(t, v)}>
                  <span className="task-title">{t.title}</span>
                </Check>
                {t.detail ? <p className="muted" style={{ margin: "6px 0 0" }}>{t.detail}</p> : null}
                <div className="row task-meta" style={{ marginBlockStart: 6 }}>
                  <Badge tone="info">{PHASE_LABEL[t.phase]}</Badge>
                  <span>מומלץ עד {formatLongDate(t.due)}</span>
                  {t.latest ? <Badge tone={t.status === "missed" ? "blocked" : "caution"}>מועד קשיח: {formatLongDate(t.latest)}</Badge> : null}
                  {t.href ? <Link href={t.href}>לפתוח</Link> : null}
                </div>
              </div>
            ))}
          </Card>
        );
      })}
    </>
  );
}
