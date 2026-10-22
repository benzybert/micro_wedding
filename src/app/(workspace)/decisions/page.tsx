import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Plus, Scale, Trophy } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { ProgressBar } from "@/components/ui/progress";
import { requireWorkspace } from "@/lib/session";
import { getAllDecisionScoring, getDecisions } from "@/lib/queries";
import { DECISION_CATEGORIES, STATUS_LABEL, analyzeDecision, decisionDue, dueState } from "@/lib/decisions";
import { formatDateShort, todayIso } from "@/lib/format";

export const metadata: Metadata = { title: "החלטות" };

const DUE_TONE: Record<string, Tone> = { overdue: "rose", soon: "amber", later: "neutral", none: "neutral" };

export default async function DecisionsPage() {
  const { wedding, members, me } = await requireWorkspace();
  const today = todayIso();
  const [decisions, scoring] = await Promise.all([getDecisions(wedding.id), getAllDecisionScoring(wedding.id)]);
  const memberIds = members.map((m) => m.userId);

  const rows = decisions.map((d) => {
    const options = scoring.options.filter((o) => o.decisionId === d.id);
    const criteria = scoring.criteria.filter((c) => c.decisionId === d.id);
    const optionIds = new Set(options.map((o) => o.id));
    const scores = scoring.scores.filter((s) => optionIds.has(s.optionId));
    const analysis = analyzeDecision(options, criteria, scores, memberIds);
    const leader = options.find((o) => o.id === analysis.leaderId);
    const chosen = options.find((o) => o.id === d.chosenOptionId);
    const myScored = scores.some((s) => s.userId === me.userId);
    const due = decisionDue(d, wedding.weddingDate);
    return { d, options, leader, leaderTotal: analysis.results.find((r) => r.optionId === analysis.leaderId)?.total ?? null, chosen, myScored, due, state: dueState(due, today), split: analysis.disagreements.length };
  });

  const active = rows.filter((r) => r.d.status === "open" || r.d.status === "researching");
  const parked = rows.filter((r) => r.d.status === "parked");
  const decided = rows.filter((r) => r.d.status === "decided");
  const byUrgency = (a: (typeof rows)[number], b: (typeof rows)[number]) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.d.sortOrder - b.d.sortOrder;
  active.sort(byUrgency);
  const overdue = active.filter((r) => r.state === "overdue").length;

  const Row = ({ r }: { r: (typeof rows)[number] }) => (
    <li>
      <Link href={`/decisions/${r.d.id}`} className="group block">
        <Card className="p-4 transition-colors group-hover:border-brand">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold">{r.d.title}</h3>
              <p className="mt-0.5 text-xs text-muted">
                {DECISION_CATEGORIES[r.d.category] ?? "אחר"} · {r.options.length ? `${r.options.length} אפשרויות` : "עוד אין אפשרויות"}
                {r.d.priority === "high" ? " · חשוב" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {r.d.status === "decided" ? (
                <Badge tone="sage">
                  <CheckCircle2 className="size-3" aria-hidden /> הוחלט
                </Badge>
              ) : (
                <>
                  {r.d.status !== "open" ? <Badge>{STATUS_LABEL[r.d.status]}</Badge> : null}
                  {r.due ? (
                    <Badge tone={DUE_TONE[r.state]}>
                      <CalendarClock className="size-3" aria-hidden />
                      {r.state === "overdue" ? "באיחור · " : "עד "}
                      {formatDateShort(r.due)}
                    </Badge>
                  ) : null}
                </>
              )}
            </div>
          </div>
          {r.chosen ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-sage-ink">
              <CheckCircle2 className="size-4" aria-hidden /> {r.chosen.name}
            </p>
          ) : r.leader && r.leaderTotal !== null ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <Trophy className="size-4 text-amber-ink" aria-hidden />
              מובילה כרגע: <span className="font-medium text-ink">{r.leader.name}</span> ({Math.round(r.leaderTotal)})
              {r.split ? <span className="text-xs text-rose-ink"> · {r.split} חילוקי דעות</span> : null}
            </p>
          ) : r.options.length && !r.myScored ? (
            <p className="mt-2 text-sm text-brand-ink">עוד לא דירגת</p>
          ) : null}
        </Card>
      </Link>
    </li>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="החלטות"
        description="כל החלטה כוללת אפשרויות, קריטריונים עם משקל, ציון נפרד מכל אחד מכם, ובסוף תיעוד של מה הוחלט ולמה."
        actions={
          <Link href="/decisions/new" className={buttonClass("primary")}>
            <Plus className="size-4" aria-hidden /> החלטה חדשה
          </Link>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">
            {decided.length} מתוך {decisions.length} הוחלטו
            {overdue ? <span className="ms-2 text-sm font-normal text-rose-ink">{overdue} באיחור</span> : null}
          </p>
        </div>
        <div className="mt-3">
          <ProgressBar value={decided.length} max={Math.max(decisions.length, 1)} tone="sage" label="החלטות שנסגרו" />
        </div>
      </Card>

      {decisions.length === 0 ? (
        <EmptyState icon={<Scale className="size-8" />} title="עוד אין החלטות">
          <Link href="/decisions/new" className={buttonClass("primary")}>
            להתחיל מהחלטה ראשונה
          </Link>
        </EmptyState>
      ) : null}

      {active.length ? (
        <section aria-labelledby="active-h" className="mb-8">
          <h2 id="active-h" className="mb-3 font-display text-xl font-semibold">
            לסגור ({active.length})
          </h2>
          <ul className="grid gap-3">{active.map((r) => <Row key={r.d.id} r={r} />)}</ul>
        </section>
      ) : null}

      {parked.length ? (
        <section aria-labelledby="parked-h" className="mb-8">
          <h2 id="parked-h" className="mb-3 font-display text-xl font-semibold">
            בהמתנה ({parked.length})
          </h2>
          <ul className="grid gap-3">{parked.map((r) => <Row key={r.d.id} r={r} />)}</ul>
        </section>
      ) : null}

      {decided.length ? (
        <section aria-labelledby="decided-h">
          <h2 id="decided-h" className="mb-3 font-display text-xl font-semibold">
            הוחלט ({decided.length})
          </h2>
          <ul className="grid gap-3">{decided.map((r) => <Row key={r.d.id} r={r} />)}</ul>
        </section>
      ) : null}
    </div>
  );
}
