import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";

export type Wedding = typeof schema.weddings.$inferSelect;

export type Member = {
  userId: string;
  name: string;
  email: string;
  role: schema.MemberRole;
  partner: "a" | "b" | null;
};

export type Workspace = {
  user: { id: string; name: string; email: string };
  wedding: Wedding;
  me: Member;
  members: Member[];
};

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const session = await getSession();
  if (!session) return null;

  const mine = await db
    .select({ weddingId: schema.weddingMembers.weddingId })
    .from(schema.weddingMembers)
    .where(eq(schema.weddingMembers.userId, session.user.id))
    .orderBy(schema.weddingMembers.joinedAt)
    .limit(1);
  const weddingId = mine[0]?.weddingId;
  if (!weddingId) return null;

  const [wedding] = await db.select().from(schema.weddings).where(eq(schema.weddings.id, weddingId)).limit(1);
  if (!wedding) return null;

  const rows = await db
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
    .orderBy(schema.weddingMembers.joinedAt);

  const members: Member[] = rows;
  const me = members.find((m) => m.userId === session.user.id);
  if (!me) return null;

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    wedding,
    me,
    members,
  };
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/** Page/action gate: signed in AND member of a wedding. Every server action must call this. */
export async function requireWorkspace(): Promise<Workspace> {
  const session = await getSession();
  if (!session) redirect("/login");
  const ws = await getWorkspace();
  if (!ws) redirect("/onboarding");
  return ws;
}

/** Display name of a partner slot. */
export function partnerName(wedding: Pick<Wedding, "partnerAName" | "partnerBName">, p: "a" | "b") {
  return p === "a" ? wedding.partnerAName : wedding.partnerBName;
}

/** Name to show for a member: the partner slot's name as entered on the wedding, else the account name. */
export function memberLabel(wedding: Pick<Wedding, "partnerAName" | "partnerBName">, m: Pick<Member, "partner" | "name">): string {
  return m.partner === "a" ? wedding.partnerAName : m.partner === "b" ? wedding.partnerBName : m.name;
}
