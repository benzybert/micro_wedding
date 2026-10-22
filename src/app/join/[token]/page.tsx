import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { buttonClass } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { acceptInviteAction } from "@/app/actions/wedding";
import { getSession, getWorkspace } from "@/lib/session";
import { sha256 } from "@/lib/token";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "הצטרפות לתכנון", robots: { index: false } };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [row] = await db
    .select({ a: schema.weddings.partnerAName, b: schema.weddings.partnerBName })
    .from(schema.weddingInvites)
    .innerJoin(schema.weddings, eq(schema.weddings.id, schema.weddingInvites.weddingId))
    .where(
      and(
        eq(schema.weddingInvites.tokenHash, sha256(token)),
        isNull(schema.weddingInvites.acceptedAt),
        gt(schema.weddingInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const session = await getSession();
  const mine = session ? await getWorkspace() : null;
  if (mine) redirect("/home");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="mb-6 text-center font-display text-3xl font-semibold text-brand-ink">{SITE.name}</p>
      <main id="main" className="rounded-card border border-line bg-surface p-6 text-center shadow-sm sm:p-8">
        {!row ? (
          <>
            <h1 className="mb-2 font-display text-2xl font-semibold">ההזמנה לא תקפה</h1>
            <p className="text-muted">הקישור פג תוקף או שכבר נוצל. בקשו מבן/בת הזוג קישור חדש.</p>
          </>
        ) : (
          <>
            <h1 className="mb-2 font-display text-2xl font-semibold">
              {row.a} ו{row.b}
            </h1>
            <p className="mb-6 text-muted">הוזמנתם להצטרף לתכנון החתונה המשותף.</p>
            {session ? (
              <ActionForm action={acceptInviteAction}>
                <input type="hidden" name="token" value={token} />
                <SubmitButton size="lg" pendingLabel="מצטרפים…">
                  הצטרפות
                </SubmitButton>
              </ActionForm>
            ) : (
              <div className="flex flex-col gap-3">
                <Link className={buttonClass("primary", "lg")} href={`/signup?next=${encodeURIComponent(`/join/${token}`)}`}>
                  יצירת חשבון והצטרפות
                </Link>
                <Link className={buttonClass("secondary", "lg")} href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}>
                  כבר יש לי חשבון
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
