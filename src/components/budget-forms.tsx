"use client";

import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Field, Select, Textarea, TextField } from "@/components/ui/field";
import { saveBudgetItemAction, setBudgetTotalAction } from "@/app/actions/budget";
import { BUDGET_CATEGORIES } from "@/data/budget";

type Values = {
  id?: string;
  title?: string;
  category?: string;
  plannedAmount?: number;
  perGuest?: boolean;
  actualAmount?: number | null;
  paidAmount?: number;
  dueDate?: string | null;
  notes?: string | null;
};

export function BudgetItemForm({ values = {}, defaultCategory }: { values?: Values; defaultCategory?: string }) {
  const editing = !!values.id;
  return (
    <ActionForm action={saveBudgetItemAction} className="grid gap-3 sm:grid-cols-6" resetOnSuccess={!editing}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <TextField label="סעיף" name="title" required maxLength={160} defaultValue={values.title} className="sm:col-span-3" />
      <Field label="קטגוריה" className="sm:col-span-3">
        {(a) => (
          <Select {...a} name="category" defaultValue={values.category ?? defaultCategory ?? "other"}>
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.he}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <TextField label="הערכה (₪)" name="plannedAmount" inputMode="numeric" defaultValue={values.plannedAmount ?? ""} className="sm:col-span-2" />
      <TextField label="הצעה/חשבונית (₪)" name="actualAmount" inputMode="numeric" defaultValue={values.actualAmount ?? ""} className="sm:col-span-2" />
      <TextField label="שולם עד כה (₪)" name="paidAmount" inputMode="numeric" defaultValue={values.paidAmount ?? ""} className="sm:col-span-2" />
      <TextField label="תשלום הבא עד" name="dueDate" type="date" defaultValue={values.dueDate ?? ""} className="sm:col-span-3" />
      <label className="flex items-end gap-2 pb-3 text-sm sm:col-span-3">
        <input type="checkbox" name="perGuest" defaultChecked={values.perGuest} className="size-4 accent-[var(--brand)]" />
        המחיר הוא לאורח / לצלחת (מוכפל במספר הסועדים)
      </label>
      <Field label="הערות" className="sm:col-span-6">
        {(a) => <Textarea {...a} name="notes" rows={2} maxLength={500} defaultValue={values.notes ?? ""} />}
      </Field>
      <div className="sm:col-span-6">
        <SubmitButton pendingLabel="שומרים…">{editing ? "שמירה" : "הוספת סעיף"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function BudgetTotalForm({ value }: { value: number | null }) {
  return (
    <ActionForm action={setBudgetTotalAction} className="flex flex-wrap items-end gap-3">
      <TextField label="תקציב כולל (₪)" name="budgetTotal" inputMode="numeric" defaultValue={value ?? ""} className="w-48" />
      <SubmitButton variant="secondary">עדכון</SubmitButton>
    </ActionForm>
  );
}
