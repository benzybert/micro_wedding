"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionState } from "@/lib/action-state";
import { clearCandidates, decideCandidates, stageCandidates, WHATSAPP_GROUP_LABEL, type Decision } from "@/lib/candidate-service";
import { requireWorkspace } from "@/lib/session";
import { MAX_CANDIDATES, MAX_FILE_BYTES, parseWhatsappExport, stagingSummary } from "@/lib/whatsapp-candidates";

function refresh() {
  revalidatePath("/guests", "layout");
  revalidatePath("/home");
  revalidatePath("/budget");
}

/** Reads the file the whatsapp-pull tool made, keeps only chats inside the chosen window, and queues them for approval. */
export async function uploadWhatsappAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("בחרו את הקובץ שהכלי יצר (whatsapp-chats.json).");
  if (file.size > MAX_FILE_BYTES) return fail("הקובץ גדול מדי. הריצו את הכלי עם חלון זמן קצר יותר.");
  const months = z.coerce.number().int().min(1).max(60).safeParse(fd.get("months"));
  if (!months.success) return fail("בחרו חלון זמן.");

  const parsed = parseWhatsappExport(await file.text(), { now: new Date(), months: months.data });
  if (!parsed.ok) return fail(parsed.error);

  const result = await stageCandidates(ws.wedding.id, parsed.candidates);
  refresh();
  return ok(stagingSummary(result, parsed.stats));
}

const choiceSchema = z.object({ side: z.enum(["a", "b", "both"]), tier: z.enum(["must", "want", "maybe"]) });

/** Form fields are named `d:<candidateId>` with the value `approve` or `reject`; people without a field stay pending. */
export async function decideCandidatesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await requireWorkspace();
  const choice = choiceSchema.safeParse({ side: fd.get("side") ?? "both", tier: fd.get("tier") ?? "want" });
  if (!choice.success) return fail("בחרו צד ורשימה לאנשים שמאשרים.");

  const decisions: Decision[] = [];
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith("d:") || (value !== "approve" && value !== "reject")) continue;
    const id = z.uuid().safeParse(key.slice(2));
    if (id.success) decisions.push({ id: id.data, decision: value });
  }
  if (!decisions.length) return fail("סמנו כן או לא לפחות לאחד מהאנשים.");
  if (decisions.length > MAX_CANDIDATES) return fail("יותר מדי החלטות בבת אחת.");

  const r = await decideCandidates(ws.wedding.id, decisions, choice.data);
  refresh();
  // Nobody left to review and someone was added: show them in the guest list (the form is gone, so a message would be lost).
  if (r.pendingLeft === 0 && r.approved > 0) redirect(`/guests?q=${encodeURIComponent(WHATSAPP_GROUP_LABEL)}`);

  const parts: string[] = [];
  if (r.approved) parts.push(`${r.approved} נוספו לרשימת האורחים`);
  if (r.alreadyGuests) parts.push(`${r.alreadyGuests} כבר היו ברשימה`);
  if (r.rejected) parts.push(`${r.rejected} נדחו`);
  if (r.pendingLeft) parts.push(`${r.pendingLeft} עדיין ממתינים להחלטה`);
  return ok(`${parts.join(". ")}.`);
}

export async function clearCandidatesAction(fd: FormData) {
  const ws = await requireWorkspace();
  const scope = z.enum(["rejected", "all"]).safeParse(fd.get("scope"));
  if (!scope.success) return;
  await clearCandidates(ws.wedding.id, scope.data);
  refresh();
}
