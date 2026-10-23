import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureMembers } from "@/lib/wedding-service";

/*
 * No accounts: this is a private planning tool for two people. The site holds ONE wedding, and a cookie
 * remembers which partner is looking ("אני בן" / "אני יערה"), so scores, comments and the activity feed
 * still say who did what. It is an identity picker, not authentication: anyone who has the URL can use it.
 */

export const WHO_COOKIE = "mw_who";

export type Wedding = typeof schema.weddings.$inferSelect;

export type Member = {
  userId: string;
  name: string;
  email: string;
  role: schema.MemberRole;
  partner: "a" | "b" | null;
};

export type Workspace = {
  /** The partner who is looking (the stand-in identity behind the cookie). */
  user: { id: string; name: string; email: string };
  wedding: Wedding;
  me: Member;
  members: Member[];
};

type Context = { wedding: Wedding; members: Member[]; who: "a" | "b" | null };

async function loadMembers(weddingId: string): Promise<Member[]> {
  return db
    .select({
      userId: schema.weddingMembers.userId,
      role: schema.weddingMembers.role,
      partner: schema.weddingMembers.partner,
      name: schema.user.name,
      email: schema.user.email,
    })
    .from(schema.weddingMembers)
    .innerJoin(schema.user, eq(schema.user.id, schema.weddingMembers.userId))
    .where(eq(schema.weddingMembers.weddingId, weddingId))
    .orderBy(asc(schema.weddingMembers.partner));
}

/** The one wedding on this site (null until the one-time setup is done) and who is looking. */
export const getContext = cache(async (): Promise<Context | null> => {
  // Read the cookie FIRST: touching request data opts the page out of static prerendering. Without it Next would
  // run the queries below at build time and freeze whatever the database held then.
  const raw = (await cookies()).get(WHO_COOKIE)?.value;
  const [wedding] = await db.select().from(schema.weddings).orderBy(asc(schema.weddings.createdAt)).limit(1);
  if (!wedding) return null;

  let members = await loadMembers(wedding.id);
  if (!members.some((m) => m.partner === "a") || !members.some((m) => m.partner === "b")) {
    await ensureMembers(wedding.id, { a: wedding.partnerAName, b: wedding.partnerBName });
    members = await loadMembers(wedding.id);
  }
  return { wedding, members, who: raw === "a" || raw === "b" ? raw : null };
});

function workspaceOf(ctx: Context): Workspace | null {
  const me = ctx.who ? ctx.members.find((m) => m.partner === ctx.who) : undefined;
  if (!me) return null;
  return { user: { id: me.userId, name: me.name, email: me.email }, wedding: ctx.wedding, me, members: ctx.members };
}

export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const ctx = await getContext();
  return ctx ? workspaceOf(ctx) : null;
});

/** Page/action gate: the wedding exists and a partner has been picked. Every server action calls this. */
export async function requireWorkspace(): Promise<Workspace> {
  const ctx = await getContext();
  if (!ctx) redirect("/onboarding");
  const ws = workspaceOf(ctx);
  if (!ws) redirect("/who");
  return ws;
}

/** Display name of a partner slot. */
export function partnerName(wedding: Pick<Wedding, "partnerAName" | "partnerBName">, p: "a" | "b") {
  return p === "a" ? wedding.partnerAName : wedding.partnerBName;
}

/** Name to show for a member: the partner slot's name as entered on the wedding, else the stored name. */
export function memberLabel(wedding: Pick<Wedding, "partnerAName" | "partnerBName">, m: Pick<Member, "partner" | "name">): string {
  return m.partner === "a" ? wedding.partnerAName : m.partner === "b" ? wedding.partnerBName : m.name;
}
