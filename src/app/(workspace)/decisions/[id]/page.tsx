import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Ban, CalendarClock, CheckCircle2, ExternalLink, Pencil, RotateCcw, ThumbsDown, ThumbsUp, Trash2, Trophy, Undo2 } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { ProgressBar } from "@/components/ui/progress";
import { ConfirmButton } from "@/components/guests/client-bits";
import { CommentForm, CriterionForm, DecideForm, DecisionForm, OptionForm } from "@/components/decisions/forms";
import { ScoreMatrix } from "@/components/decisions/score-matrix";
import {
  deleteCommentAction,
  deleteCriterionAction,
  deleteDecisionAction,
  deleteOptionAction,
  reopenDecisionAction,
  toggleRejectOptionAction,
} from "@/app/actions/decisions";
import { requireWorkspace, memberLabel } from "@/lib/session";
import { getDecisionBundle } from "@/lib/queries";
import { DECISION_CATEGORIES, STATUS_LABEL, analyzeDecision, decisionDue, dueState, optionCost } from "@/lib/decisions";
import { budgetHeadcount } from "@/lib/budget";
import { formatDateLong, formatDateShort, formatILS, todayIso } from "@/lib/format";
import { headcount } from "@/lib/guests";

export const metadata: Metadata = { title: "החלטה" };

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await requireWorkspace();
  const bundle = await getDecisionBundle(ws.wedding.id, id);
  if (!bundle) notFound();
  const { decision, options, criteria, scores, comments } = bundle;

  const guestRows = await db.select({ id: schema.guests.id, householdId: schema.guests.householdId, attending: schema.guests.attending }).from(schema.guests).where(eq(schema.guests.weddingId, ws.wedding.id));
  const heads = budgetHeadcount(headcount(guestRows).expected, ws.wedding.guestCap);

  const memberIds = ws.members.map((m) => m.userId);
  const labelOf = (userId: string) => {
    const m = ws.members.find((x) => x.userId === userId);
    return m ? memberLabel(ws.wedding, m) : "";
  };
  const analysis = analyzeDecision(options, criteria, scores, memberIds);

  const mine: Record<string, number> = {};
  for (const s of scores) if (s.userId === ws.user.id) mine[`${s.optionId}|${s.criterionId}`] = s.score;
  const partnerByCell: Record<string, { label: string; score: number }[]> = {};
  for (const s of scores) {
    if (s.userId === ws.user.id) continue;
    (partnerByCell[`${s.optionId}|${s.criterionId}`] ??= []).push({ label: labelOf(s.userId), score: s.score });
  }
  const myCount = Object.keys(mine).length;

  const decided = decision.status === "decided";
  const chosen = options.find((o) => o.id === decision.chosenOptionId);
  const live = options.filter((o) => !o.rejected);
  const due = decisionDue(decision, ws.wedding.weddingDate);
  const state = dueState(due, todayIso());
  const optionName = new Map(options.map((o) => [o.id, o.name] as const));
  const criterionName = new Map(criteria.map((c) => [c.id, c.name] as const));
  const ranked = analysis.ranking.map((rid) => ({ option: options.find((o) => o.id === rid)!, result: analysis.results.find((r) => r.optionId === rid)! }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/decisions" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowRight className="size-4" aria-hidden />
        חזרה להחלטות
      </Link>
      <PageHeader
        eyebrow={DECISION_CATEGORIES[decision.category] ?? "אחר"}
        title={decision.title}
        description={decision.description ?? undefined}
        actions={
          <>
            <Badge tone={decided ? "sage" : decision.status === "parked" ? "neutral" : "amber"}>{STATUS_LABEL[decision.status]}</Badge>
            {due && !decided ? (
              <Badge tone={state === "overdue" ? "rose" : state === "soon" ? "amber" : "neutral"}>
                <CalendarClock className="size-3" aria-hidden />
                {state === "overdue" ? "באיחור · " : "עד "}
                {formatDateShort(due)}
              </Badge>
            ) : null}
          </>
        }
      />

      {decided ? (
        <Card className="mb-6 border-sage-ink bg-sage-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-display text-xl font-semibold text-sage-ink">
                <CheckCircle2 className="size-5" aria-hidden /> הוחלט: {chosen?.name}
              </p>
              {decision.decisionNote ? <p className="mt-2 whitespace-pre-line text-ink">{decision.decisionNote}</p> : null}
              <p className="mt-2 text-xs text-muted">
                {decision.decidedAt ? formatDateLong(decision.decidedAt.toISOString().slice(0, 10)) : ""}
                {decision.decidedByUserId ? ` · ${labelOf(decision.decidedByUserId)}` : ""}
              </p>
            </div>
            <form action={reopenDecisionAction}>
              <input type="hidden" name="id" value={decision.id} />
              <ConfirmButton message="לפתוח את ההחלטה מחדש? התיעוד הנוכחי יימחק." className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-sage-ink hover:bg-surface/60">
                <Undo2 className="size-4" aria-hidden /> פתיחה מחדש
              </ConfirmButton>
            </form>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6">
        <details className="rounded-card border border-line bg-surface">
          <summary className="flex min-h-12 items-center gap-2 px-5 font-medium">
            <Pencil className="size-4 text-muted" aria-hidden /> עריכת פרטי ההחלטה
          </summary>
          <div className="border-t border-line p-5">
            <DecisionForm
              values={{ id: decision.id, title: decision.title, category: decision.category, description: decision.description, priority: decision.priority, dueDate: decision.dueDate ?? due, status: decision.status, ownerUserId: decision.ownerUserId }}
              members={ws.members.map((m) => ({ userId: m.userId, label: memberLabel(ws.wedding, m) }))}
            />
          </div>
        </details>

        <Card>
          <SectionTitle>אפשרויות ({options.length})</SectionTitle>
          {options.length ? (
            <ul className="grid gap-3">
              {options.map((o) => {
                const cost = optionCost(o, heads);
                return (
                  <li key={o.id} className={`rounded-xl border p-4 ${o.id === decision.chosenOptionId ? "border-sage-ink bg-sage-soft" : "border-line"} ${o.rejected ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-semibold">
                          {o.name}
                          {o.rejected ? <span className="ms-2 text-xs font-normal text-muted">(נפסלה)</span> : null}
                        </h3>
                        {cost != null ? (
                          <p className="text-sm text-muted">
                            <bdi>{formatILS(cost)}</bdi>
                            {o.costType === "per_guest" ? ` · ${formatILS(o.costAmount)} לצלחת × ${heads}` : ""}
                          </p>
                        ) : null}
                      </div>
                      {o.url ? (
                        <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline">
                          קישור <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                    {o.details ? <p className="mt-2 whitespace-pre-line text-sm">{o.details}</p> : null}
                    {o.pros || o.cons ? (
                      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        {o.pros ? (
                          <p className="flex gap-1.5 text-sage-ink">
                            <ThumbsUp className="mt-1 size-3.5 shrink-0" aria-label="יתרונות" />
                            <span className="whitespace-pre-line">{o.pros}</span>
                          </p>
                        ) : null}
                        {o.cons ? (
                          <p className="flex gap-1.5 text-rose-ink">
                            <ThumbsDown className="mt-1 size-3.5 shrink-0" aria-label="חסרונות" />
                            <span className="whitespace-pre-line">{o.cons}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {!decided ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        <form action={toggleRejectOptionAction}>
                          <input type="hidden" name="id" value={o.id} />
                          <button type="submit" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2">
                            {o.rejected ? <RotateCcw className="size-3.5" aria-hidden /> : <Ban className="size-3.5" aria-hidden />}
                            {o.rejected ? "החזרה" : "פסילה"}
                          </button>
                        </form>
                        <form action={deleteOptionAction}>
                          <input type="hidden" name="id" value={o.id} />
                          <ConfirmButton message={`למחוק את "${o.name}" ואת הציונים שלה?`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-rose-ink hover:bg-rose-soft">
                            <Trash2 className="size-3.5" aria-hidden /> מחיקה
                          </ConfirmButton>
                        </form>
                        <details className="w-full">
                          <summary className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-brand-ink hover:bg-surface-2">
                            <Pencil className="size-3.5" aria-hidden /> עריכה
                          </summary>
                          <div className="mt-3">
                            <OptionForm decisionId={decision.id} values={o} />
                          </div>
                        </details>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">עוד אין אפשרויות. הוסיפו לפחות שתיים כדי להשוות.</p>
          )}
          {!decided ? (
            <details className="mt-4 rounded-xl border border-dashed border-line p-4" open={options.length === 0}>
              <summary className="font-medium text-brand-ink">הוספת אפשרות</summary>
              <div className="mt-3">
                <OptionForm decisionId={decision.id} />
              </div>
            </details>
          ) : null}
        </Card>

        {!decided ? (
          <>
            <Card>
              <SectionTitle>קריטריונים</SectionTitle>
              <p className="mb-3 text-sm text-muted">מה חשוב לכם בהחלטה, ובאיזה משקל. אותם קריטריונים משותפים לשניכם.</p>
              <ul className="divide-y divide-line">
                {criteria.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-end gap-2 py-3">
                    <div className="min-w-0 flex-1">
                      <CriterionForm decisionId={decision.id} values={c} />
                    </div>
                    <form action={deleteCriterionAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton message={`למחוק את "${c.name}" ואת הציונים שלו?`} className="grid size-11 place-items-center rounded-xl text-rose-ink hover:bg-rose-soft">
                        <Trash2 className="size-4" aria-label={`מחיקת ${c.name}`} />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-line pt-3">
                <CriterionForm decisionId={decision.id} />
              </div>
            </Card>

            <section aria-labelledby="rate-h">
              <h2 id="rate-h" className="mb-1 font-display text-xl font-semibold">
                הדירוג שלי
              </h2>
              <p className="mb-3 text-sm text-muted">כל אחד מדרג לבד. הציון של בן/בת הזוג מוצג רק אחרי שדירגתם את אותו תא, כדי שלא תשפיעו זה על זה.</p>
              <ScoreMatrix
                decisionId={decision.id}
                options={options.map((o) => ({ id: o.id, name: o.name, costAmount: o.costAmount, costType: o.costType, rejected: o.rejected, details: o.details }))}
                criteria={criteria.map((c) => ({ id: c.id, name: c.name, weight: c.weight }))}
                mine={mine}
                partnerByCell={partnerByCell}
                headcount={heads}
              />
            </section>
          </>
        ) : null}

        {(myCount > 0 || decided) && ranked.length ? (
          <Card>
            <SectionTitle>התוצאה המשותפת</SectionTitle>
            {analysis.leaderId ? (
              <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-soft p-3 text-amber-ink">
                <Trophy className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>
                  מובילה: <strong>{optionName.get(analysis.leaderId)}</strong>
                  {analysis.margin !== null ? (analysis.margin >= 10 ? ` · פער ברור של ${Math.round(analysis.margin)} נקודות` : ` · פער קטן של ${Math.round(analysis.margin)} נקודות, כדאי לדבר`) : ""}
                </span>
              </p>
            ) : null}
            <ol className="grid gap-4">
              {ranked.map(({ option, result }, i) => (
                <li key={option.id}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {i + 1}. {option.name}
                    </span>
                    <span className="font-display text-xl font-semibold tabular-nums">{result.total === null ? "—" : Math.round(result.total)}</span>
                  </div>
                  <ProgressBar value={result.total ?? 0} max={100} tone={i === 0 && result.total !== null ? "sage" : "brand"} label={option.name} />
                  <p className="mt-1 text-xs text-muted">
                    {ws.members.map((m) => `${memberLabel(ws.wedding, m)} ${result.byMember[m.userId] == null ? "—" : Math.round(result.byMember[m.userId]!)}`).join(" · ")}
                    {" · "}דורג {Math.round(result.coverage * 100)}%
                    {analysis.splitOptionIds.includes(option.id) ? " · הציונים רחוקים" : ""}
                  </p>
                </li>
              ))}
            </ol>
            {analysis.disagreements.length ? (
              <div className="mt-5 rounded-xl bg-rose-soft p-4">
                <p className="mb-2 font-medium text-rose-ink">איפה אתם לא מסכימים (שווה לדבר על זה)</p>
                <ul className="space-y-1 text-sm text-rose-ink">
                  {analysis.disagreements.slice(0, 6).map((d) => (
                    <li key={`${d.optionId}${d.criterionId}`}>
                      {optionName.get(d.optionId)} · {criterionName.get(d.criterionId)}: {d.scores.map((s) => `${labelOf(s.userId)} ${s.score}`).join(" מול ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        ) : !decided && options.length ? (
          <p className="rounded-card border border-dashed border-line p-5 text-center text-sm text-muted">דרגו קודם, ואז תראו את התוצאה המשותפת.</p>
        ) : null}

        {!decided && live.length ? (
          <Card>
            <SectionTitle>לסגור את ההחלטה</SectionTitle>
            <DecideForm decisionId={decision.id} options={live.map((o) => ({ id: o.id, name: o.name }))} />
          </Card>
        ) : null}

        <Card>
          <SectionTitle>שיחה</SectionTitle>
          {comments.length ? (
            <ul className="mb-4 space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-surface-2 p-3 text-sm">
                  <p className="mb-0.5 flex items-center justify-between text-xs text-muted">
                    <span>
                      {c.author} · {formatDateShort(c.createdAt.toISOString().slice(0, 10))}
                    </span>
                    {c.userId === ws.user.id ? (
                      <form action={deleteCommentAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-rose-ink hover:underline">
                          מחיקה
                        </button>
                      </form>
                    ) : null}
                  </p>
                  <p className="whitespace-pre-line">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <CommentForm decisionId={decision.id} />
        </Card>

        <form action={deleteDecisionAction}>
          <input type="hidden" name="id" value={decision.id} />
          <ConfirmButton message="למחוק את ההחלטה עם כל האפשרויות והציונים? אי אפשר לבטל." className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-ink hover:bg-rose-soft">
            <Trash2 className="size-4" aria-hidden /> מחיקת ההחלטה
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
