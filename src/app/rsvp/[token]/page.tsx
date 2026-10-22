import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { RsvpForm } from "@/components/rsvp-form";
import { formatDateLong } from "@/lib/format";
import { hebrewDateOf } from "@/lib/hebrew-calendar";

// Secret link: never indexed, never cached.
export const metadata: Metadata = { title: "אישור הגעה", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length > 64) notFound();

  const [row] = await db
    .select({ household: schema.households, wedding: schema.weddings })
    .from(schema.households)
    .innerJoin(schema.weddings, eq(schema.weddings.id, schema.households.weddingId))
    .where(eq(schema.households.rsvpToken, token))
    .limit(1);
  if (!row) notFound();

  const { household, wedding } = row;
  const members = await db.select().from(schema.guests).where(eq(schema.guests.householdId, household.id)).orderBy(schema.guests.createdAt);
  const mapsQuery = [wedding.venueName, wedding.venueAddress].filter(Boolean).join(", ");
  const answered = !!household.respondedAt;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <main id="main">
        <header className="mb-6 rounded-card border border-line bg-brand-soft p-6 text-center sm:p-8">
          <p className="text-sm font-medium text-brand-ink">הוזמנתם לחתונה של</p>
          <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">
            {wedding.partnerAName} ו{wedding.partnerBName}
          </h1>
          <ul className="mt-5 space-y-1.5 text-start text-[0.95rem]">
            {wedding.weddingDate ? (
              <li className="flex items-start gap-2">
                <CalendarDays className="mt-1 size-4 shrink-0 text-brand-ink" aria-hidden />
                <span>
                  {formatDateLong(wedding.weddingDate)}
                  <span className="block text-xs text-muted">{hebrewDateOf(wedding.weddingDate)}</span>
                </span>
              </li>
            ) : null}
            {wedding.startTime ? (
              <li className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-brand-ink" aria-hidden />
                <span>
                  בשעה <bdi className="ltr">{wedding.startTime}</bdi>
                </span>
              </li>
            ) : null}
            {mapsQuery ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-1 size-4 shrink-0 text-brand-ink" aria-hidden />
                <span>
                  {wedding.venueName}
                  {wedding.venueAddress ? <span className="block text-xs text-muted">{wedding.venueAddress}</span> : null}
                  <span className="mt-1 flex gap-3 text-xs">
                    <a className="font-medium text-brand-ink underline underline-offset-4" href={`https://waze.com/ul?q=${encodeURIComponent(mapsQuery)}&navigate=yes`} target="_blank" rel="noopener noreferrer">
                      Waze
                    </a>
                    <a className="font-medium text-brand-ink underline underline-offset-4" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`} target="_blank" rel="noopener noreferrer">
                      Google Maps
                    </a>
                  </span>
                </span>
              </li>
            ) : null}
          </ul>
          {wedding.rsvpNote ? <p className="mt-4 whitespace-pre-line rounded-lg bg-surface/70 p-3 text-start text-sm">{wedding.rsvpNote}</p> : null}
        </header>

        <section aria-labelledby="rsvp-title">
          <h2 id="rsvp-title" className="mb-1 font-display text-2xl font-semibold">
            {answered ? "התשובה שלכם נשמרה" : `שלום ${household.name}`}
          </h2>
          <p className="mb-4 text-muted">
            {answered ? "אפשר לעדכן בכל רגע." : "נשמח לדעת אם תוכלו להגיע."}
            {wedding.rsvpDeadline ? ` נשמח לתשובה עד ${formatDateLong(wedding.rsvpDeadline)}.` : ""}
          </p>
          <RsvpForm
            token={token}
            message={household.rsvpMessage}
            members={members.map((m) => ({ id: m.id, name: m.name, attending: m.attending, diet: m.diet, allergies: m.allergies }))}
          />
        </section>
      </main>
    </div>
  );
}
