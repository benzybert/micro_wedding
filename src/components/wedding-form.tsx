"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Field, Input, Select, Textarea, TextField } from "@/components/ui/field";
import { CITIES } from "@/data/cities";
import { DEFAULT_INVITATION, DEFAULT_REMINDER } from "@/lib/guests";
import type { ActionState } from "@/lib/action-state";

type Values = {
  partnerAName?: string;
  partnerBName?: string;
  weddingDate?: string | null;
  guestCap?: number;
  budgetTotal?: number | null;
  calendarCustom?: "ashkenaz" | "sepharad";
  ceremonyTrack?: "rabbinate" | "private_rabbi" | "civil_abroad" | "other";
  city?: string;
  venueName?: string | null;
  venueAddress?: string | null;
  startTime?: string | null;
  rsvpDeadline?: string | null;
  rsvpNote?: string | null;
  invitationTemplate?: string | null;
  reminderTemplate?: string | null;
};

const TRACKS = [
  { value: "rabbinate", label: "רבנות (מסדר קידושין מטעם הרבנות)" },
  { value: "private_rabbi", label: "מסדר קידושין פרטי, עם רישום ברבנות" },
  { value: "civil_abroad", label: "נישואין אזרחיים בחו״ל (קפריסין / יוטה בזום)" },
  { value: "other", label: "עוד לא החלטנו / אחר" },
];

/** A date input that can be emptied: phone date pickers often have no way to clear a chosen date. */
function OptionalDate({ label, name, initial, hint }: { label: string; name: string; initial: string | null | undefined; hint?: string }) {
  const [value, setValue] = useState(initial ?? "");
  return (
    <Field label={label} hint={hint}>
      {(a) => (
        <div className="flex items-center gap-2">
          <Input {...a} name={name} type="date" value={value} onChange={(e) => setValue(e.target.value)} className="min-w-0 flex-1" />
          {value ? (
            <button type="button" onClick={() => setValue("")} className="min-h-11 shrink-0 rounded-xl border border-line px-3 text-sm text-muted hover:bg-surface-2">
              ניקוי
            </button>
          ) : null}
        </div>
      )}
    </Field>
  );
}

export function WeddingForm({
  action,
  values = {},
  mode,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  values?: Values;
  mode: "onboarding" | "settings";
}) {
  const settings = mode === "settings";
  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="שם ראשון" name="partnerAName" required maxLength={60} defaultValue={values.partnerAName} />
        <TextField label="שם שני" name="partnerBName" required maxLength={60} defaultValue={values.partnerBName} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalDate
          label="תאריך החתונה (אם כבר יש)"
          name="weddingDate"
          initial={values.weddingDate}
          hint="אפשר להשאיר ריק עד שמתייעצים עם מסדר הקידושין או יועץ. המשימות וההחלטות יוצגו לפי ״כמה ימים לפני״, ויקבלו תאריכים כשתזינו תאריך."
        />
        <TextField
          label="תקרת אורחים"
          name="guestCap"
          type="number"
          inputMode="numeric"
          min={2}
          max={300}
          required
          defaultValue={values.guestCap ?? 40}
          hint="מיקרו חתונה היא בדרך כלל עד 40 עד 60 איש"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">מנהג לוח (משפיע על שלושת השבועות וספירת העומר)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { v: "ashkenaz", t: "אשכנזי", d: "שלושת השבועות מי״ז בתמוז, העומר עד ערב ל״ג" },
            { v: "sepharad", t: "ספרדי", d: "תשעת הימים מראש חודש אב, העומר עד ל״ג כולל" },
          ].map((o) => (
            <label key={o.v} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="radio" name="calendarCustom" value={o.v} defaultChecked={(values.calendarCustom ?? "ashkenaz") === o.v} className="mt-1.5 size-4 accent-[var(--brand)]" />
              <span>
                <span className="block font-medium">{o.t}</span>
                <span className="block text-xs text-muted">{o.d}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">אם יש אי-ודאות, בחרו את המחמיר ושאלו את מסדר הקידושין.</p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="מסלול נישואין">
          {(a) => (
            <Select {...a} name="ceremonyTrack" defaultValue={values.ceremonyTrack ?? "rabbinate"}>
              {TRACKS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="אזור האירוע" hint="לחישוב שקיעה והדלקת נרות">
          {(a) => (
            <Select {...a} name="city" defaultValue={values.city ?? "Tel Aviv"}>
              {CITIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.he}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {settings ? (
        <>
          <hr className="border-line" />
          <TextField label="תקציב כולל (₪)" name="budgetTotal" inputMode="numeric" defaultValue={values.budgetTotal ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="שם המקום" name="venueName" maxLength={120} defaultValue={values.venueName ?? ""} />
            <TextField label="כתובת" name="venueAddress" maxLength={200} defaultValue={values.venueAddress ?? ""} />
            <TextField label="שעת תחילה" name="startTime" type="time" defaultValue={values.startTime ?? ""} />
            <OptionalDate label="מועד אחרון לאישור הגעה" name="rsvpDeadline" initial={values.rsvpDeadline} />
          </div>
          <Field label="הערה לאורחים בעמוד האישור" hint="קוד לבוש, חניה, מדיניות ילדים וכו׳">
            {(a) => <Textarea {...a} name="rsvpNote" maxLength={600} defaultValue={values.rsvpNote ?? ""} />}
          </Field>
          <Field label="נוסח הזמנה בוואטסאפ" hint="משתנים: {שם} {זוג} {תאריך} {מקום} {קישור}">
            {(a) => <Textarea {...a} name="invitationTemplate" rows={6} maxLength={1200} defaultValue={values.invitationTemplate ?? DEFAULT_INVITATION} />}
          </Field>
          <Field label="נוסח תזכורת">
            {(a) => <Textarea {...a} name="reminderTemplate" rows={5} maxLength={1200} defaultValue={values.reminderTemplate ?? DEFAULT_REMINDER} />}
          </Field>
        </>
      ) : null}

      <div>
        <SubmitButton size="lg" pendingLabel="שומרים…">
          {settings ? "שמירה" : "מתחילים לתכנן"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

