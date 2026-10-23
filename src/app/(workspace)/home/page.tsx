import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckSquare, Scale, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { ProgressBar, SegmentedBar } from "@/components/ui/progress";
import { Stat } from "@/components/ui/page";
import { requireWorkspace } from "@/lib/session";
import { getBudgetItems, getDecisions, getGuestData, getRecentActivity, getTasks } from "@/lib/queries";
import { budgetHeadcount, summarizeBudget } from "@/lib/budget";
import { decisionDue, dueState } from "@/lib/decisions";
import { daysBetween, formatDateLong, formatDateShort, formatILS, relativeDays, todayIso } from "@/lib/format";
import { headcount } from "@/lib/guests";
import { hebrewDateOf } from "@/lib/hebrew-calendar";
import { groupTasks, taskDue, taskProgress } from "@/lib/tasks";

export const metadata: Metadata = { title: "בית" };

export default async function HomePage() {
  const { wedding } = await requireWorkspace();
  const today = todayIso();
  const [{ households, guests }, tasks, decisions, budgetItems, activity] = await Promise.all([
    getGuestData(wedding.id),
    getTasks(wedding.id),
    getDecisions(wedding.id),
    getBudgetItems(wedding.id),
    getRecentActivity(wedding.id, 6),
  ]);

  const hc = headcount(guests);
  const invited = households.filter((h) => h.invitedAt).length;
  const decided = decisions.filter((d) => d.status === "decided").length;
  const overdueDecisions = decisions.filter((d) => d.status !== "decided" && dueState(decisionDue(d, wedding.weddingDate), today) === "overdue");
  const budget = summarizeBudget(budgetItems, budgetHeadcount(hc.expected, wedding.guestCap), wedding.budgetTotal);
  const groups = groupTasks(tasks, wedding.weddingDate, today);
  const progress = taskProgress(tasks);
  const daysLeft = wedding.weddingDate ? daysBetween(today, wedding.weddingDate) : null;

  const soonDecisions = decisions
    .filter((d) => d.status !== "decided")
    .map((d) => ({ d, due: decisionDue(d, wedding.weddingDate) }))
    .filter((x) => x.due && ["overdue", "soon"].includes(dueState(x.due, today)))
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))
    .slice(0, 4);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="overflow-hidden rounded-card border border-line bg-brand-soft p-6 sm:p-8">
        <p className="text-sm font-medium text-brand-ink">החתונה של</p>
        <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
          {wedding.partnerAName} ו{wedding.partnerBName}
        </h1>
        {wedding.weddingDate ? (
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-lg font-medium">{formatDateLong(wedding.weddingDate)}</p>
              <p className="text-sm text-muted">{hebrewDateOf(wedding.weddingDate)}</p>
            </div>
            <div className="text-end">
              <p className="font-display text-5xl font-semibold leading-none tabular-nums text-brand-ink">{Math.abs(daysLeft ?? 0)}</p>
              <p className="text-sm text-muted">{daysLeft !== null && daysLeft < 0 ? "ימים מאז החתונה" : "ימים עד החתונה"}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted">עוד אין תאריך, וזה בסדר. אפשר לבדוק מה אפשרי לפי הלוח העברי והמנהג שלכם, ולהזין תאריך בהגדרות כשיהיה.</p>
            <Link href="/date" className={buttonClass("primary")}>
              <CalendarDays className="size-4" aria-hidden />
              למצוא תאריך
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/guests" className="group block">
          <Card className="h-full transition-colors group-hover:border-brand">
            <div className="mb-3 flex items-center gap-2 text-brand-ink">
              <Users className="size-5" aria-hidden />
              <span className="font-medium">אורחים</span>
            </div>
            <Stat label="מגיעים" value={hc.yes} hint={`${hc.pending} ממתינים · תקרה ${wedding.guestCap}`} />
            <SegmentedBar
              className="mt-3"
              label="אורחים"
              max={wedding.guestCap}
              segments={[
                { value: hc.yes, tone: "sage", label: "מגיעים" },
                { value: hc.pending, tone: "amber", label: "ממתינים" },
              ]}
            />
            <p className="mt-2 text-xs text-muted">{invited} משקי בית הוזמנו מתוך {households.length}</p>
          </Card>
        </Link>

        <Link href="/decisions" className="group block">
          <Card className="h-full transition-colors group-hover:border-brand">
            <div className="mb-3 flex items-center gap-2 text-brand-ink">
              <Scale className="size-5" aria-hidden />
              <span className="font-medium">החלטות</span>
            </div>
            <Stat label="הוחלט" value={`${decided}/${decisions.length}`} hint={overdueDecisions.length ? `${overdueDecisions.length} באיחור` : "הכל בזמן"} />
            <ProgressBar value={decided} max={Math.max(decisions.length, 1)} tone="sage" label="החלטות" />
          </Card>
        </Link>

        <Link href="/budget" className="group block">
          <Card className="h-full transition-colors group-hover:border-brand">
            <div className="mb-3 flex items-center gap-2 text-brand-ink">
              <Wallet className="size-5" aria-hidden />
              <span className="font-medium">תקציב</span>
            </div>
            <Stat
              label="הוקצה"
              value={<bdi>{formatILS(budget.effective)}</bdi>}
              hint={
                wedding.budgetTotal ? (
                  <bdi>
                    {budget.overBudget ? `חריגה של ${formatILS(-(budget.headroom ?? 0))}` : `נשארו ${formatILS(budget.headroom)} מתוך ${formatILS(wedding.budgetTotal)}`}
                  </bdi>
                ) : (
                  "עוד לא נקבע תקציב כולל"
                )
              }
            />
            {wedding.budgetTotal ? (
              <ProgressBar value={budget.effective} max={wedding.budgetTotal} tone={budget.overBudget ? "rose" : "brand"} label="תקציב" />
            ) : null}
          </Card>
        </Link>

        <Link href="/tasks" className="group block">
          <Card className="h-full transition-colors group-hover:border-brand">
            <div className="mb-3 flex items-center gap-2 text-brand-ink">
              <CheckSquare className="size-5" aria-hidden />
              <span className="font-medium">משימות</span>
            </div>
            <Stat label="הושלמו" value={`${progress.done}/${progress.total}`} hint={groups.now.length ? `${groups.now.length} דחופות` : "אין דחוף כרגע"} />
            <ProgressBar value={progress.done} max={Math.max(progress.total, 1)} tone="sage" label="משימות" />
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle
            action={
              <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink">
                כל המשימות <ArrowLeft className="size-4" aria-hidden />
              </Link>
            }
          >
            מה עושים עכשיו
          </SectionTitle>
          {groups.now.length === 0 && soonDecisions.length === 0 ? (
            <p className="text-muted">אין כרגע דבר דחוף. אפשר להתקדם למשימות הבאות.</p>
          ) : (
            <ul className="divide-y divide-line">
              {groups.now.slice(0, 5).map((t) => {
                const due = taskDue(t, wedding.weddingDate);
                const late = due ? daysBetween(today, due) < 0 : false;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={t.linkHref ?? "/tasks"} className="min-w-0 flex-1 truncate font-medium hover:underline">
                      {t.title}
                    </Link>
                    {due ? <Badge tone={late ? "rose" : "amber"}>{late ? "באיחור" : relativeDays(daysBetween(today, due))}</Badge> : null}
                  </li>
                );
              })}
              {soonDecisions.map(({ d, due }) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/decisions/${d.id}`} className="flex min-w-0 flex-1 items-center gap-2 font-medium hover:underline">
                    <Scale className="size-4 shrink-0 text-muted" aria-hidden />
                    <span className="truncate">להחליט: {d.title}</span>
                  </Link>
                  {due ? <Badge tone={dueState(due, today) === "overdue" ? "rose" : "amber"}>עד {formatDateShort(due)}</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>מה חדש</SectionTitle>
          {activity.length === 0 ? (
            <p className="text-muted">כשאורחים יאשרו הגעה או שמישהו יעדכן החלטה, זה יופיע כאן.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="text-sm">
                  {a.href ? (
                    <Link href={a.href} className="hover:underline">
                      {a.text}
                    </Link>
                  ) : (
                    a.text
                  )}
                  <span className="block text-xs text-muted">{formatDateShort(a.createdAt.toISOString().slice(0, 10))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
