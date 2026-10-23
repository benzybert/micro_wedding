"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { decideCandidatesAction, uploadWhatsappAction } from "@/app/actions/whatsapp";
import { TIER_LABEL } from "@/lib/guests";
import { cn } from "@/lib/utils";
import type { Tier } from "@/db/schema";

export type WindowOption = { value: number; label: string };

export function WhatsappUploadForm({ windows, defaultMonths }: { windows: WindowOption[]; defaultMonths: number }) {
  return (
    <ActionForm action={uploadWhatsappAction} className="flex flex-col gap-4">
      <Field label="הקובץ שהכלי יצר" hint="whatsapp-chats.json: שמות, טלפונים ומועד ההודעה האחרונה. בלי תוכן הודעות.">
        {(a) => <input {...a} type="file" name="file" accept=".json,application/json" required className="text-sm" />}
      </Field>
      <Field label="עם מי דיברתי" hint="רק שיחות שהיתה בהן הודעה בטווח הזה ייכנסו לרשימת האישור. השאר לא נשמר בפלטפורמה.">
        {(a) => (
          <Select {...a} name="months" defaultValue={String(defaultMonths)} className="sm:max-w-xs">
            {windows.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div>
        <SubmitButton pendingLabel="טוענים…">טעינה לרשימת האישור</SubmitButton>
      </div>
    </ActionForm>
  );
}

export type ReviewRow = {
  id: string;
  name: string;
  /** Already formatted for display. */
  phone: string;
  ageLabel: string;
  dateLabel: string;
  /** Someone with this exact name is already on the guest list. */
  maybeDuplicate: boolean;
};

type Choice = "approve" | "reject";

/** One yes/no per person. People left unmarked stay in the queue for next time. */
export function CandidatesReview({ rows, partnerAName, partnerBName }: { rows: ReviewRow[]; partnerAName: string; partnerBName: string }) {
  const [choice, setChoice] = useState<Record<string, Choice>>({});
  const yes = rows.filter((r) => choice[r.id] === "approve").length;
  const no = rows.filter((r) => choice[r.id] === "reject").length;

  const toggle = (id: string, value: Choice) =>
    setChoice((prev) => {
      const next = { ...prev };
      if (next[id] === value) delete next[id];
      else next[id] = value;
      return next;
    });
  const markAll = (value: Choice | null) => setChoice(value ? Object.fromEntries(rows.map((r) => [r.id, value])) : {});

  return (
    <ActionForm action={decideCandidatesAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          <span className="font-medium text-sage-ink">{yes} כן</span> · <span className="font-medium text-rose-ink">{no} לא</span> · {rows.length - yes - no} עדיין בלי החלטה
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => markAll("approve")}>
            סימון כולם כן
          </Button>
          <Button size="sm" variant="secondary" onClick={() => markAll("reject")}>
            סימון כולם לא
          </Button>
          <Button size="sm" variant="ghost" onClick={() => markAll(null)} disabled={yes + no === 0}>
            ניקוי סימונים
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map((r) => {
          const c = choice[r.id];
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <bdi>{r.name}</bdi>
                  {r.maybeDuplicate ? <Badge tone="amber">כבר ברשימה?</Badge> : null}
                </p>
                <p className="text-xs text-muted">
                  <span dir="ltr">{r.phone}</span> · <time title={r.dateLabel}>הודעה אחרונה {r.ageLabel}</time>
                </p>
              </div>
              <div className="flex gap-2" role="group" aria-label={`החלטה לגבי ${r.name}`}>
                <ChoiceButton active={c === "approve"} tone="yes" label={`כן, להוסיף את ${r.name}`} onClick={() => toggle(r.id, "approve")}>
                  <Check className="size-4" aria-hidden /> כן
                </ChoiceButton>
                <ChoiceButton active={c === "reject"} tone="no" label={`לא, לא להוסיף את ${r.name}`} onClick={() => toggle(r.id, "reject")}>
                  <X className="size-4" aria-hidden /> לא
                </ChoiceButton>
                {c ? <input type="hidden" name={`d:${r.id}`} value={c} /> : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-surface-2 p-4">
        <Field label="הצד של מי שאישרתי" className="min-w-40">
          {(a) => (
            <Select {...a} name="side" defaultValue="both">
              <option value="both">משותף</option>
              <option value="a">{partnerAName}</option>
              <option value="b">{partnerBName}</option>
            </Select>
          )}
        </Field>
        <Field label="לאיזו רשימה" className="min-w-40">
          {(a) => (
            <Select {...a} name="tier" defaultValue="want">
              {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <SubmitButton pendingLabel="שומרים…">שמירת ההחלטות</SubmitButton>
      </div>
      <p className="-mt-2 text-xs text-muted">מי שסומן כן נכנס לרשימת האורחים, מי שסומן לא לא יוצע שוב, ומי שלא סומן ימתין להחלטה.</p>
    </ActionForm>
  );
}

function ChoiceButton({ active, tone, label, onClick, children }: { active: boolean; tone: "yes" | "no"; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 min-w-16 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
        active
          ? tone === "yes"
            ? "border-sage-ink bg-sage-soft text-sage-ink"
            : "border-rose-ink bg-rose-soft text-rose-ink"
          : "border-line bg-surface text-ink hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
