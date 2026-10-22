import { describe, expect, it } from "vitest";
import { buildMessage, rsvpUrl } from "./messages";

const base = {
  partnerAName: "נועה",
  partnerBName: "דן",
  weddingDate: "2027-03-23",
  venueName: "גן האירועים",
  invitationTemplate: null,
  reminderTemplate: null,
};

describe("buildMessage", () => {
  it("fills the default invitation with couple, date, venue and personal link", () => {
    const link = rsvpUrl("https://x.example/", "tok123");
    expect(link).toBe("https://x.example/rsvp/tok123");
    const msg = buildMessage("invite", base, { name: "משפחת כהן" }, link);
    expect(msg).toContain("שלום משפחת כהן");
    expect(msg).toContain("נועה ודן");
    expect(msg).toMatch(/ביום שלישי, 23 במרץ 2027 בגן האירועים/);
    expect(msg).toContain(link);
    expect(msg).not.toMatch(/\{|\}/);
  });

  it("copes with no date and no venue", () => {
    const msg = buildMessage("invite", { ...base, weddingDate: null, venueName: null }, { name: "רון" }, "https://l");
    expect(msg).toContain("בתאריך שנעדכן בקרוב");
    expect(msg).not.toContain("undefined");
  });

  it("uses custom templates and the reminder template", () => {
    const msg = buildMessage("reminder", { ...base, reminderTemplate: "תזכורת ל{שם}: {קישור}" }, { name: "דנה" }, "https://l");
    expect(msg).toBe("תזכורת לדנה: https://l");
  });
});
