"use client";

import { useRef } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Field, Textarea } from "@/components/ui/field";
import { importGuestsAction } from "@/app/actions/guests";

export function ImportForm() {
  const ta = useRef<HTMLTextAreaElement>(null);
  return (
    <ActionForm action={importGuestsAction} className="flex flex-col gap-4">
      <Field label="הדביקו כאן">
        {(a) => <Textarea {...a} ref={ta} name="csv" rows={10} required placeholder={"שם\tמשק בית\tצד\tרשימה\tטלפון\nדנה כהן\tמשפחת כהן\tנועה\tא\t050-111-2222"} className="font-mono text-sm" dir="ltr" />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="me-2 text-muted">או קובץ:</span>
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && ta.current) ta.current.value = await file.text();
            }}
          />
        </label>
      </div>
      <div>
        <SubmitButton pendingLabel="מייבאים…">ייבוא</SubmitButton>
      </div>
    </ActionForm>
  );
}
