"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { Select, Textarea, TextField, Field } from "@/components/ui/field";
import { submitRsvpAction } from "@/app/actions/rsvp";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; attending: "pending" | "yes" | "no"; diet: string; allergies: string | null };

export function RsvpForm({ token, members, message }: { token: string; members: Member[]; message: string | null }) {
  const [answers, setAnswers] = useState<Record<string, "yes" | "no" | "pending">>(
    Object.fromEntries(members.map((m) => [m.id, m.attending])),
  );

  return (
    <ActionForm action={submitRsvpAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      {members.map((m) => {
        const a = answers[m.id];
        return (
          <div key={m.id} role="group" aria-labelledby={`rsvp-${m.id}`} className="rounded-card border border-line bg-surface p-4">
            <h3 id={`rsvp-${m.id}`} className="mb-3 font-display text-lg font-semibold">
              <bdi>{m.name}</bdi>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "yes", label: "מגיע/ה", icon: Check },
                  { v: "no", label: "לא מגיע/ה", icon: X },
                ] as const
              ).map(({ v, label, icon: Icon }) => (
                <label
                  key={v}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 font-medium transition-colors",
                    a === v
                      ? v === "yes"
                        ? "border-sage-ink bg-sage-soft text-sage-ink"
                        : "border-rose-ink bg-rose-soft text-rose-ink"
                      : "border-line bg-surface text-ink hover:bg-surface-2",
                  )}
                >
                  <input
                    type="radio"
                    name={`attending_${m.id}`}
                    value={v}
                    checked={a === v}
                    onChange={() => setAnswers((s) => ({ ...s, [m.id]: v }))}
                    className="sr-only"
                    required
                  />
                  <Icon className="size-4" aria-hidden />
                  {label}
                </label>
              ))}
            </div>

            {a === "yes" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="העדפת אוכל">
                  {(p) => (
                    <Select {...p} name={`diet_${m.id}`} defaultValue={m.diet}>
                      <option value="regular">הכל</option>
                      <option value="vegetarian">צמחוני</option>
                      <option value="vegan">טבעוני</option>
                      <option value="gluten_free">ללא גלוטן</option>
                    </Select>
                  )}
                </Field>
                <TextField label="אלרגיות (אם יש)" name={`allergies_${m.id}`} defaultValue={m.allergies ?? ""} maxLength={200} />
              </div>
            ) : null}
          </div>
        );
      })}

      <Field label="רוצים להוסיף משהו? (לא חובה)">{(p) => <Textarea {...p} name="message" rows={3} maxLength={500} defaultValue={message ?? ""} />}</Field>

      <SubmitButton size="lg" pendingLabel="שומרים…">
        שליחת תשובה
      </SubmitButton>
    </ActionForm>
  );
}
