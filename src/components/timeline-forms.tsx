"use client";

import { Printer } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Textarea, TextField, Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { saveTimelineItemAction, seedTimelineAction } from "@/app/actions/timeline";

type Values = { id?: string; startTime?: string; title?: string; durationMin?: number | null; notes?: string | null; owner?: string | null };

export function TimelineItemForm({ values = {} }: { values?: Values }) {
  const editing = !!values.id;
  return (
    <ActionForm action={saveTimelineItemAction} className="grid gap-3 sm:grid-cols-6" resetOnSuccess={!editing}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <TextField label="שעה" name="startTime" type="time" required defaultValue={values.startTime} className="sm:col-span-2" />
      <TextField label="מה קורה" name="title" required maxLength={160} defaultValue={values.title} className="sm:col-span-4" />
      <TextField label="משך (דקות)" name="durationMin" inputMode="numeric" defaultValue={values.durationMin ?? ""} className="sm:col-span-2" />
      <TextField label="אחראי/ת" name="owner" maxLength={80} defaultValue={values.owner ?? ""} className="sm:col-span-4" />
      <Field label="הערות לספקים" className="sm:col-span-6">
        {(a) => <Textarea {...a} name="notes" rows={2} maxLength={500} defaultValue={values.notes ?? ""} />}
      </Field>
      <div className="sm:col-span-6">
        <SubmitButton>{editing ? "שמירה" : "הוספה"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function SeedTimelineForm({ defaultTime }: { defaultTime: string }) {
  return (
    <ActionForm action={seedTimelineAction} className="flex flex-wrap items-end justify-center gap-3">
      <TextField label="שעת החופה" name="chuppah" type="time" defaultValue={defaultTime} required className="w-40" />
      <SubmitButton>יצירת לו״ז לדוגמה</SubmitButton>
    </ActionForm>
  );
}

export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" className="no-print" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden /> הדפסה
    </Button>
  );
}
