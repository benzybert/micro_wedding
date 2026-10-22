"use client";

import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Field, Select, Textarea, TextField } from "@/components/ui/field";
import { saveVendorAction } from "@/app/actions/vendors";
import { BUDGET_CATEGORIES } from "@/data/budget";
import { VENDOR_STATUS_LABEL } from "@/lib/vendor-status";

type Values = {
  id?: string;
  name?: string;
  category?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  url?: string | null;
  instagram?: string | null;
  status?: string;
  quoteAmount?: number | null;
  depositAmount?: number | null;
  notes?: string | null;
};

export function VendorForm({ values = {} }: { values?: Values }) {
  const editing = !!values.id;
  return (
    <ActionForm action={saveVendorAction} className="grid gap-3 sm:grid-cols-6" resetOnSuccess={!editing}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <TextField label="שם הספק" name="name" required maxLength={120} defaultValue={values.name} className="sm:col-span-3" />
      <Field label="תחום" className="sm:col-span-3">
        {(a) => (
          <Select {...a} name="category" defaultValue={values.category ?? "photo_video"}>
            {BUDGET_CATEGORIES.filter((c) => c.key !== "contingency").map((c) => (
              <option key={c.key} value={c.key}>
                {c.he}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <TextField label="איש קשר" name="contactName" maxLength={120} defaultValue={values.contactName ?? ""} className="sm:col-span-2" />
      <TextField label="טלפון" name="phone" type="tel" defaultValue={values.phone ?? ""} className="sm:col-span-2" />
      <TextField label="אימייל" name="email" type="email" defaultValue={values.email ?? ""} className="sm:col-span-2" />
      <TextField label="אתר" name="url" type="url" defaultValue={values.url ?? ""} placeholder="https://" className="sm:col-span-3" />
      <TextField label="אינסטגרם" name="instagram" maxLength={60} defaultValue={values.instagram ?? ""} placeholder="@name" dir="ltr" className="sm:col-span-3" />
      <Field label="סטטוס" className="sm:col-span-2">
        {(a) => (
          <Select {...a} name="status" defaultValue={values.status ?? "idea"}>
            {Object.entries(VENDOR_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <TextField label="הצעת מחיר (₪)" name="quoteAmount" inputMode="numeric" defaultValue={values.quoteAmount ?? ""} className="sm:col-span-2" />
      <TextField label="מקדמה (₪)" name="depositAmount" inputMode="numeric" defaultValue={values.depositAmount ?? ""} className="sm:col-span-2" />
      <Field label="הערות" className="sm:col-span-6">
        {(a) => <Textarea {...a} name="notes" rows={2} maxLength={1000} defaultValue={values.notes ?? ""} />}
      </Field>
      <div className="sm:col-span-6">
        <SubmitButton pendingLabel="שומרים…">{editing ? "שמירה" : "הוספת ספק"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
