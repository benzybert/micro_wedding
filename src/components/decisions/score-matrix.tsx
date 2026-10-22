"use client";

import { useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { saveScoresAction } from "@/app/actions/decisions";
import { analyzeDecision, SCORE_LABEL, type CriterionLite, type OptionLite } from "@/lib/decisions";
import { formatILS } from "@/lib/format";
import { cn } from "@/lib/utils";

type Option = OptionLite & { details: string | null };
type PartnerScore = { label: string; score: number };

/**
 * My own ratings only. Each option is a card of criteria; a live total shows how it stands for me.
 * The partner's score for a cell appears only after I have rated that cell (so neither of us anchors the other).
 */
export function ScoreMatrix({
  decisionId,
  options,
  criteria,
  mine,
  partnerByCell,
  headcount,
}: {
  decisionId: string;
  options: Option[];
  criteria: CriterionLite[];
  mine: Record<string, number>;
  partnerByCell: Record<string, PartnerScore[]>;
  headcount: number;
}) {
  const [scores, setScores] = useState<Record<string, number>>(mine);

  const live = useMemo(() => {
    const flat = Object.entries(scores)
      .filter(([, v]) => v >= 1)
      .map(([k, v]) => {
        const [optionId, criterionId] = k.split("|");
        return { optionId: optionId!, criterionId: criterionId!, userId: "me", score: v };
      });
    return analyzeDecision(options, criteria, flat, ["me"]);
  }, [scores, options, criteria]);

  if (!options.length) return <p className="text-muted">הוסיפו אפשרויות כדי לדרג אותן.</p>;
  if (!criteria.length) return <p className="text-muted">הוסיפו קריטריונים כדי לדרג.</p>;

  return (
    <ActionForm action={saveScoresAction} className="flex flex-col gap-4">
      <input type="hidden" name="decisionId" value={decisionId} />
      {options.map((o) => {
        const total = live.results.find((r) => r.optionId === o.id)?.total ?? null;
        const cost = o.costAmount == null ? null : o.costType === "per_guest" ? o.costAmount * headcount : o.costAmount;
        return (
          <div key={o.id} className={cn("rounded-card border border-line bg-surface p-4", o.rejected && "opacity-60")}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">
                {o.name}
                {o.rejected ? <span className="ms-2 text-xs font-normal text-muted">(נפסלה)</span> : null}
              </h3>
              <p className="text-sm text-muted">
                {cost != null ? (
                  <>
                    <bdi>{formatILS(cost)}</bdi>
                    {o.costType === "per_guest" ? ` (${formatILS(o.costAmount)} לצלחת)` : ""}
                    {" · "}
                  </>
                ) : null}
                הציון שלי: <span className="font-medium text-ink tabular-nums">{total === null ? "—" : Math.round(total)}</span>
              </p>
            </div>
            <ul className="divide-y divide-line">
              {criteria.map((c) => {
                const key = `${o.id}|${c.id}`;
                const value = scores[key] ?? 0;
                const partners = value ? (partnerByCell[key] ?? []) : [];
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <label htmlFor={`s-${o.id}-${c.id}`} className="min-w-0 flex-1 text-sm">
                      {c.name}
                      <span className="ms-1 text-xs text-muted" title="משקל">
                        {"●".repeat(c.weight)}
                      </span>
                    </label>
                    {partners.map((p) => (
                      <span key={p.label} className="rounded-full bg-sky-soft px-2 py-0.5 text-xs text-sky-ink">
                        {p.label}: {p.score}
                      </span>
                    ))}
                    <select
                      id={`s-${o.id}-${c.id}`}
                      name={`s_${o.id}_${c.id}`}
                      value={value}
                      onChange={(e) => setScores((s) => ({ ...s, [key]: Number(e.target.value) }))}
                      className="min-h-10 w-36 rounded-xl border border-line bg-surface px-2 text-sm"
                    >
                      <option value={0}>לא דורג</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} · {SCORE_LABEL[n]}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div className="sticky bottom-20 z-10 self-start lg:bottom-4">
        <SubmitButton pendingLabel="שומרים…">שמירת הציונים שלי</SubmitButton>
      </div>
    </ActionForm>
  );
}
