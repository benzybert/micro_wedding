import { DEFAULT_INVITATION, DEFAULT_REMINDER, renderTemplate } from "@/lib/guests";
import { formatDateLong } from "@/lib/format";

type WeddingForMessage = {
  partnerAName: string;
  partnerBName: string;
  weddingDate: string | null;
  venueName: string | null;
  invitationTemplate: string | null;
  reminderTemplate: string | null;
};

export function rsvpUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/rsvp/${token}`;
}

/**
 * Placeholders: {שם} household, {זוג} the couple, {תאריך} (written to follow "ב"), {מקום} (" ב<venue>" or empty),
 * {קישור} personal RSVP link.
 */
export function buildMessage(kind: "invite" | "reminder", wedding: WeddingForMessage, household: { name: string }, link: string): string {
  const template = kind === "invite" ? (wedding.invitationTemplate ?? DEFAULT_INVITATION) : (wedding.reminderTemplate ?? DEFAULT_REMINDER);
  return renderTemplate(template, {
    שם: household.name,
    זוג: `${wedding.partnerAName} ו${wedding.partnerBName}`,
    תאריך: wedding.weddingDate ? formatDateLong(wedding.weddingDate) : "תאריך שנעדכן בקרוב",
    מקום: wedding.venueName ? ` ב${wedding.venueName}` : "",
    קישור: link,
  });
}
