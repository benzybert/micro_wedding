import type { Metadata } from "next";
import { Clock, Pencil, Trash2 } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { ConfirmButton, CopyButton } from "@/components/guests/client-bits";
import { PrintButton, SeedTimelineForm, TimelineItemForm } from "@/components/timeline-forms";
import { deleteTimelineItemAction } from "@/app/actions/timeline";
import { addMinutes } from "@/data/timeline-template";
import { requireWorkspace } from "@/lib/session";
import { getTimeline } from "@/lib/queries";
import { formatDateLong } from "@/lib/format";

export const metadata: Metadata = { title: "לו״ז יום החתונה" };

export default async function TimelinePage() {
  const { wedding } = await requireWorkspace();
  const items = await getTimeline(wedding.id);

  const plain = [
    `לו״ז ${wedding.partnerAName} ו${wedding.partnerBName}${wedding.weddingDate ? ` · ${formatDateLong(wedding.weddingDate)}` : ""}`,
    wedding.venueName ? `${wedding.venueName}${wedding.venueAddress ? `, ${wedding.venueAddress}` : ""}` : "",
    "",
    ...items.map((i) => `${i.startTime}${i.durationMin ? `–${addMinutes(i.startTime, i.durationMin)}` : ""}  ${i.title}${i.owner ? ` (${i.owner})` : ""}${i.notes ? ` · ${i.notes}` : ""}`),
  ]
    .filter((l, idx) => l !== "" || idx > 0)
    .join("\n");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="לו״ז יום החתונה"
        description="הלו״ז שנשלח לספקים: צלם, DJ, מעצבת, קייטרינג. כך כולם יודעים מה קורה ומתי."
        actions={items.length ? <><CopyButton text={plain} label="העתקה כטקסט" /><PrintButton /></> : undefined}
      />

      {items.length === 0 ? (
        <EmptyState icon={<Clock className="size-8" />} title="עוד אין לו״ז">
          <p className="mb-4">אפשר להתחיל מלו״ז לדוגמה לחתונה של כ-40 איש בערב, ולהתאים אותו.</p>
          <SeedTimelineForm defaultTime={wedding.startTime ?? "18:00"} />
        </EmptyState>
      ) : (
        <Card className="mb-6">
          <ol className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="py-3">
                <div className="flex items-start gap-4">
                  <p className="w-14 shrink-0 font-display text-xl font-semibold tabular-nums">
                    <bdi className="ltr">{i.startTime}</bdi>
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.title}</p>
                    <p className="text-xs text-muted">
                      {i.durationMin ? `${i.durationMin} דקות` : ""}
                      {i.durationMin && i.owner ? " · " : ""}
                      {i.owner ? `אחראי/ת: ${i.owner}` : ""}
                    </p>
                    {i.notes ? <p className="mt-0.5 text-sm text-muted">{i.notes}</p> : null}
                    <details className="no-print mt-1">
                      <summary className="inline-flex cursor-pointer items-center gap-1 text-sm text-brand-ink">
                        <Pencil className="size-3.5" aria-hidden /> עריכה
                      </summary>
                      <div className="mt-3 rounded-xl bg-surface-2 p-4">
                        <TimelineItemForm values={i} />
                        <form action={deleteTimelineItemAction} className="mt-3">
                          <input type="hidden" name="id" value={i.id} />
                          <ConfirmButton message="למחוק את השלב?" className="inline-flex items-center gap-1 text-sm text-rose-ink hover:underline">
                            <Trash2 className="size-3.5" aria-hidden /> מחיקה
                          </ConfirmButton>
                        </form>
                      </div>
                    </details>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="no-print">
        <SectionTitle>שלב חדש</SectionTitle>
        <TimelineItemForm />
      </Card>
    </div>
  );
}
