"use client";

import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Field, Select, Textarea, TextField } from "@/components/ui/field";
import { createHouseholdAction, updateHouseholdAction } from "@/app/actions/guests";
import { TIER_LABEL } from "@/lib/guests";
import type { Side, Tier } from "@/db/schema";

type Values = { id?: string; name?: string; side?: Side; tier?: Tier; groupLabel?: string | null; phone?: string | null; email?: string | null; notes?: string | null };

const GROUPS = ["משפחה", "משפחה מורחבת", "חברים", "עבודה", "צבא", "לימודים", "שכנים"];

export function HouseholdForm({ partnerA, partnerB, values = {} }: { partnerA: string; partnerB: string; values?: Values }) {
  const editing = !!values.id;
  return (
    <ActionForm action={editing ? updateHouseholdAction : createHouseholdAction} className="flex flex-col gap-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <TextField label="שם משק הבית" name="name" required maxLength={120} defaultValue={values.name} hint="למשל: משפחת כהן, או שם של אדם אחד" />

      {!editing ? (
        <Field label="מי מגיע? שורה לכל אדם" hint='ילדים: "ילד: מאיה" או "מאיה (ילדה)". אם משאירים ריק, נוצר אורח אחד בשם משק הבית.'>
          {(a) => <Textarea {...a} name="members" rows={4} maxLength={2000} placeholder={"דנה כהן\nיוסי כהן\nמאיה (ילדה)"} />}
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="צד">
          {(a) => (
            <Select {...a} name="side" defaultValue={values.side ?? "both"}>
              <option value="a">של {partnerA}</option>
              <option value="b">של {partnerB}</option>
              <option value="both">משותף</option>
            </Select>
          )}
        </Field>
        <Field label="רשימה" hint="קובע מי נכנס אם אין מקום">
          {(a) => (
            <Select {...a} name="tier" defaultValue={values.tier ?? "want"}>
              {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="קבוצה">
          {(a) => (
            <>
              <input {...a} name="groupLabel" list="group-suggestions" maxLength={60} defaultValue={values.groupLabel ?? ""} dir="auto" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[0.95rem]" />
              <datalist id="group-suggestions">
                {GROUPS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="טלפון (לוואטסאפ)" name="phone" type="tel" autoComplete="off" defaultValue={values.phone ?? ""} placeholder="050-123-4567" />
        <TextField label="אימייל" name="email" type="email" autoComplete="off" defaultValue={values.email ?? ""} />
      </div>
      <Field label="הערות">{(a) => <Textarea {...a} name="notes" rows={2} maxLength={500} defaultValue={values.notes ?? ""} />}</Field>

      <div>
        <SubmitButton pendingLabel="שומרים…">{editing ? "שמירה" : "הוספה"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
