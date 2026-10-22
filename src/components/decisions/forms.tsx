"use client";

import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Field, Select, Textarea, TextField } from "@/components/ui/field";
import {
  addCommentAction,
  createDecisionAction,
  decideAction,
  saveCriterionAction,
  saveOptionAction,
  updateDecisionAction,
} from "@/app/actions/decisions";
import { DECISION_CATEGORIES, STATUS_LABEL } from "@/lib/decisions";
import type { DecisionStatus } from "@/db/schema";

type DecisionValues = {
  id?: string;
  title?: string;
  category?: string;
  description?: string | null;
  priority?: "high" | "normal" | "low";
  dueDate?: string | null;
  status?: DecisionStatus;
  ownerUserId?: string | null;
};

export function DecisionForm({ values = {}, members = [] }: { values?: DecisionValues; members?: { userId: string; label: string }[] }) {
  const editing = !!values.id;
  return (
    <ActionForm action={editing ? updateDecisionAction : createDecisionAction} className="flex flex-col gap-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <TextField label="מה צריך להחליט?" name="title" required maxLength={160} defaultValue={values.title} placeholder="למשל: איזה צלם?" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="נושא">
          {(a) => (
            <Select {...a} name="category" defaultValue={values.category ?? "other"}>
              {Object.entries(DECISION_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="דחיפות">
          {(a) => (
            <Select {...a} name="priority" defaultValue={values.priority ?? "normal"}>
              <option value="high">גבוהה</option>
              <option value="normal">רגילה</option>
              <option value="low">נמוכה</option>
            </Select>
          )}
        </Field>
        <TextField label="להחליט עד" name="dueDate" type="date" defaultValue={values.dueDate ?? ""} />
      </div>
      {editing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {values.status !== "decided" ? (
            <Field label="מצב">
              {(a) => (
                <Select {...a} name="status" defaultValue={values.status ?? "open"}>
                  {(["open", "researching", "parked"] as const).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <Field label="מי אחראי/ת">
            {(a) => (
              <Select {...a} name="ownerUserId" defaultValue={values.ownerUserId ?? ""}>
                <option value="">שנינו</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      ) : null}
      <Field label="הקשר" hint="למה זה חשוב, מה מגביל אותנו">
        {(a) => <Textarea {...a} name="description" rows={3} maxLength={2000} defaultValue={values.description ?? ""} />}
      </Field>
      <div>
        <SubmitButton pendingLabel="שומרים…">{editing ? "שמירה" : "יצירת החלטה"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

type OptionValues = {
  id?: string;
  name?: string;
  details?: string | null;
  costAmount?: number | null;
  costType?: "total" | "per_guest";
  url?: string | null;
  pros?: string | null;
  cons?: string | null;
};

export function OptionForm({ decisionId, values = {} }: { decisionId: string; values?: OptionValues }) {
  const editing = !!values.id;
  return (
    <ActionForm action={saveOptionAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={!editing}>
      <input type="hidden" name="decisionId" value={decisionId} />
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <TextField label="שם האפשרות" name="name" required maxLength={160} defaultValue={values.name} className="sm:col-span-2" />
      <TextField label="מחיר (₪)" name="costAmount" inputMode="numeric" defaultValue={values.costAmount ?? ""} />
      <Field label="המחיר הוא">
        {(a) => (
          <Select {...a} name="costType" defaultValue={values.costType ?? "total"}>
            <option value="total">סך הכל</option>
            <option value="per_guest">לצלחת / לאורח</option>
          </Select>
        )}
      </Field>
      <TextField label="קישור" name="url" type="url" defaultValue={values.url ?? ""} placeholder="https://" className="sm:col-span-2" />
      <Field label="יתרונות">{(a) => <Textarea {...a} name="pros" rows={2} maxLength={600} defaultValue={values.pros ?? ""} />}</Field>
      <Field label="חסרונות">{(a) => <Textarea {...a} name="cons" rows={2} maxLength={600} defaultValue={values.cons ?? ""} />}</Field>
      <Field label="פרטים" className="sm:col-span-2">
        {(a) => <Textarea {...a} name="details" rows={2} maxLength={1000} defaultValue={values.details ?? ""} />}
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="שומרים…">{editing ? "שמירה" : "הוספת אפשרות"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CriterionForm({ decisionId, values }: { decisionId: string; values?: { id: string; name: string; weight: number } }) {
  return (
    <ActionForm action={saveCriterionAction} className="flex flex-wrap items-end gap-2" resetOnSuccess={!values} successHint={false}>
      <input type="hidden" name="decisionId" value={decisionId} />
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <TextField label={values ? "קריטריון" : "קריטריון חדש"} name="name" required maxLength={100} defaultValue={values?.name} className="min-w-44 flex-1" />
      <Field label="משקל">
        {(a) => (
          <Select {...a} name="weight" defaultValue={String(values?.weight ?? 3)} className="w-28">
            <option value="1">1 · קל</option>
            <option value="2">2</option>
            <option value="3">3 · רגיל</option>
            <option value="4">4</option>
            <option value="5">5 · קריטי</option>
          </Select>
        )}
      </Field>
      <SubmitButton variant={values ? "secondary" : "primary"} size="md">
        {values ? "עדכון" : "הוספה"}
      </SubmitButton>
    </ActionForm>
  );
}

export function DecideForm({ decisionId, options }: { decisionId: string; options: { id: string; name: string }[] }) {
  return (
    <ActionForm action={decideAction} className="flex flex-col gap-4">
      <input type="hidden" name="decisionId" value={decisionId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">מה בחרתם?</legend>
        {options.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
            <input type="radio" name="optionId" value={o.id} className="size-4 accent-[var(--brand)]" />
            <span className="font-medium">{o.name}</span>
          </label>
        ))}
        <TextField label="או משהו אחר" name="customChoice" maxLength={160} hint="אם הבחירה לא ברשימה" />
      </fieldset>
      <Field label="למה? (נשאר בתיעוד)" hint="משפט או שניים: מה הכריע, ומה ויתרתם עליו">
        {(a) => <Textarea {...a} name="note" rows={3} maxLength={1500} />}
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="addToBudget" defaultChecked className="size-4 accent-[var(--brand)]" />
        להוסיף לתקציב (אם יש לאפשרות מחיר)
      </label>
      <div>
        <SubmitButton pendingLabel="רושמים…">לסגור את ההחלטה</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CommentForm({ decisionId }: { decisionId: string }) {
  return (
    <ActionForm action={addCommentAction} className="flex flex-col gap-2" resetOnSuccess successHint={false}>
      <input type="hidden" name="decisionId" value={decisionId} />
      <Field label="הערה לשניכם">{(a) => <Textarea {...a} name="body" rows={2} maxLength={1500} required />}</Field>
      <div>
        <SubmitButton variant="secondary" size="sm">
          פרסום
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
