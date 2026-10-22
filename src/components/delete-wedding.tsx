"use client";

import { ActionForm, SubmitButton } from "@/components/ui/form";
import { TextField } from "@/components/ui/field";
import { deleteWeddingAction } from "@/app/actions/wedding";

export function DeleteWeddingForm() {
  return (
    <ActionForm action={deleteWeddingAction} className="flex flex-wrap items-end gap-3">
      <TextField label='כתבו "מחיקה" לאישור' name="confirm" required autoComplete="off" className="w-48" />
      <SubmitButton variant="danger">מחיקה לצמיתות</SubmitButton>
    </ActionForm>
  );
}
