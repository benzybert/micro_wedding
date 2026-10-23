import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, Circle, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { ProgressBar } from "@/components/ui/progress";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Field, Select, TextField } from "@/components/ui/field";
import { ConfirmButton } from "@/components/guests/client-bits";
import { createTaskAction, deleteTaskAction, toggleTaskAction } from "@/app/actions/tasks";
import { TASK_CATEGORY_LABEL, type TaskCategory } from "@/data/task-templates";
import { requireWorkspace } from "@/lib/session";
import { getTasks } from "@/lib/queries";
import { daysBetween, formatDateShort, relativeDays, todayIso } from "@/lib/format";
import { groupTasks, taskDue, taskProgress } from "@/lib/tasks";

export const metadata: Metadata = { title: "משימות" };

export default async function TasksPage() {
  const { wedding } = await requireWorkspace();
  const today = todayIso();
  const tasks = await getTasks(wedding.id);
  const groups = groupTasks(tasks, wedding.weddingDate, today);
  const progress = taskProgress(tasks);

  type T = (typeof tasks)[number];
  const Item = ({ t }: { t: T }) => {
    const due = taskDue(t, wedding.weddingDate);
    const diff = due ? daysBetween(today, due) : null;
    const late = diff !== null && diff < 0 && !t.done;
    return (
      <li className="flex items-start gap-3 py-3">
        <form action={toggleTaskAction}>
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" className="mt-0.5 grid size-7 place-items-center rounded-full text-muted hover:text-sage-ink" aria-label={t.done ? `סימון "${t.title}" כלא הושלמה` : `סימון "${t.title}" כהושלמה`}>
            {t.done ? <CheckCircle2 className="size-6 text-sage-ink" aria-hidden /> : <Circle className="size-6" aria-hidden />}
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <p className={t.done ? "text-muted line-through" : "font-medium"}>{t.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <Badge>{TASK_CATEGORY_LABEL[t.category as TaskCategory] ?? "אחר"}</Badge>
            {due && !t.done ? (
              <Badge tone={late ? "rose" : diff !== null && diff <= 14 ? "amber" : "neutral"}>
                <CalendarClock className="size-3" aria-hidden />
                {formatDateShort(due)} · {relativeDays(diff ?? 0)}
              </Badge>
            ) : null}
            {t.hardDeadline && !t.done ? (
              <Badge tone="rose">
                <ShieldAlert className="size-3" aria-hidden /> מועד קשיח
              </Badge>
            ) : null}
            {!due && t.dueOffsetDays != null && !t.done ? <span className="text-muted">{t.dueOffsetDays >= 0 ? `${t.dueOffsetDays} ימים לפני החתונה` : `${-t.dueOffsetDays} ימים אחרי`}</span> : null}
            {t.linkHref ? (
              <Link href={t.linkHref} className="inline-flex items-center gap-1 font-medium text-brand-ink hover:underline">
                לעמוד <ArrowLeft className="size-3" aria-hidden />
              </Link>
            ) : null}
          </div>
          {t.notes ? (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs text-muted hover:text-ink">פרטים</summary>
              <p className="mt-1 whitespace-pre-line text-sm text-muted">{t.notes}</p>
            </details>
          ) : null}
        </div>
        {!t.templateKey ? (
          <form action={deleteTaskAction}>
            <input type="hidden" name="id" value={t.id} />
            <ConfirmButton message={`למחוק את "${t.title}"?`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-rose-soft hover:text-rose-ink">
              <Trash2 className="size-4" aria-label="מחיקה" />
            </ConfirmButton>
          </form>
        ) : null}
      </li>
    );
  };

  const Section = ({ title, items, hint }: { title: string; items: T[]; hint?: string }) =>
    items.length ? (
      <section className="mb-6">
        <h2 className="mb-1 font-display text-xl font-semibold">
          {title} <span className="text-base font-normal text-muted">({items.length})</span>
        </h2>
        {hint ? <p className="mb-1 text-sm text-muted">{hint}</p> : null}
        <Card className="py-1">
          <ul className="divide-y divide-line">{items.map((t) => <Item key={t.id} t={t} />)}</ul>
        </Card>
      </section>
    ) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="משימות" description="נגזרות מתאריך החתונה: משנים תאריך, והכל זז. ברירת המחדל מתאימה לחתונה קטנה בישראל, ואפשר להוסיף משלכם." />
      <Card className="mb-6">
        <p className="mb-2 font-medium">
          {progress.done} מתוך {progress.total} הושלמו
        </p>
        <ProgressBar value={progress.done} max={Math.max(progress.total, 1)} tone="sage" label="משימות שהושלמו" />
        {!wedding.weddingDate ? (
          <p className="mt-3 text-sm text-amber-ink">
            עוד אין תאריך חתונה, ולכן המשימות מוצגות לפי &quot;כמה ימים לפני&quot;. <Link href="/settings" className="font-medium underline">הזינו תאריך בהגדרות</Link> כשיהיה, והן יקבלו תאריכים.
          </p>
        ) : null}
      </Card>

      <Section title="עכשיו" items={groups.now} hint="באיחור או בשבועיים הקרובים." />
      <Section title="בקרוב" items={groups.soon} />
      <Section title="בהמשך" items={groups.later} />
      <Section title="בלי תאריך" items={groups.undated} />

      <Card className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
          <Plus className="size-5" aria-hidden /> משימה משלכם
        </h2>
        <ActionForm action={createTaskAction} className="grid gap-3 sm:grid-cols-4" resetOnSuccess>
          <TextField label="מה צריך לעשות?" name="title" required maxLength={200} className="sm:col-span-2" />
          <Field label="נושא">
            {(a) => (
              <Select {...a} name="category" defaultValue="planning">
                {Object.entries(TASK_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <TextField label="עד תאריך" name="dueDate" type="date" />
          <div className="sm:col-span-4">
            <SubmitButton>הוספה</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {groups.done.length ? (
        <details className="mb-6">
          <summary className="mb-2 cursor-pointer font-display text-xl font-semibold">הושלמו ({groups.done.length})</summary>
          <Card className="py-1">
            <ul className="divide-y divide-line">{groups.done.map((t) => <Item key={t.id} t={t} />)}</ul>
          </Card>
        </details>
      ) : null}
    </div>
  );
}
