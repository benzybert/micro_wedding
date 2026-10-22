import { describe, expect, it } from "vitest";
import { assessDate, scanDates, type CalendarCustom } from "./hebrew-calendar";

const A = (iso: string, custom: CalendarCustom = "ashkenaz", city = "Tel Aviv") => assessDate(iso, { custom, city });
const codes = (iso: string, custom: CalendarCustom = "ashkenaz") => A(iso, custom).flags.map((f) => f.code);

describe("assessDate: weekdays and Shabbat", () => {
  it("a plain winter Tuesday is clear and cheap", () => {
    const a = A("2026-12-15");
    expect(a.verdict).toBe("ok");
    expect(codes("2026-12-15")).toEqual(["clear"]);
    expect(a.priceLevel).toBe("low");
    expect(a.weatherNote).toMatch(/גשם/);
    expect(a.weekday).toBe("יום שלישי");
  });

  it("Saturday is Motzei-Shabbat only and Friday must end before Shabbat", () => {
    const sat = A("2026-10-24");
    expect(sat.verdict).toBe("caution");
    expect(sat.flags[0]?.code).toBe("shabbat");
    const fri = A("2026-10-23");
    expect(fri.verdict).toBe("caution");
    expect(fri.flags[0]?.detail).toMatch(/\d{2}:\d{2}/);
  });

  it("Thursday in summer is the most expensive combination", () => {
    expect(A("2027-06-17").priceLevel).toBe("high");
  });

  it("reports sunset / nightfall / candle lighting in local time, Jerusalem lights earlier than Tel Aviv", () => {
    const tlv = A("2026-11-06", "ashkenaz", "Tel Aviv").sun;
    const jlm = A("2026-11-06", "ashkenaz", "Jerusalem").sun;
    expect(tlv.sunset).toMatch(/^\d{2}:\d{2}$/);
    expect(tlv.sunset).toBe("16:46");
    expect(tlv.candleLighting < tlv.sunset).toBe(true);
    expect(jlm.candleLighting < tlv.candleLighting).toBe(true);
  });
});

describe("assessDate: holidays", () => {
  it("blocks Yom Tov and Chol HaMoed", () => {
    expect(A("2026-04-02").verdict).toBe("blocked");
    expect(codes("2026-04-02")).toContain("yom_tov");
    expect(codes("2026-04-05")).toContain("chol_hamoed");
    expect(A("2026-09-12").verdict).toBe("blocked"); // Rosh Hashana
    expect(A("2026-09-21").verdict).toBe("blocked"); // Yom Kippur
  });

  it("flags the eve of a holiday", () => {
    expect(codes("2026-09-11")).toContain("erev_chag");
  });

  it("treats Tisha B'Av as blocked and a minor fast as 'avoid'", () => {
    expect(A("2026-07-23").verdict).toBe("blocked");
    const tzomGedalia = A("2026-09-14");
    expect(tzomGedalia.verdict).toBe("avoid");
    expect(codes("2026-09-14")).toContain("minor_fast");
  });

  it("flags Aseret Yemei Teshuva as a custom (caution), not a prohibition", () => {
    const a = A("2026-09-15");
    expect(a.verdict).toBe("caution");
    expect(codes("2026-09-15")).toContain("ten_days");
  });

  it("marks Purim as busy but allowed", () => {
    const a = A("2027-03-23");
    expect(a.verdict).toBe("ok");
    expect(codes("2027-03-23")).toContain("festive");
  });
});

describe("assessDate: Omer by custom", () => {
  it("blocks from Pesach to the day before Lag BaOmer (Ashkenazi)", () => {
    expect(codes("2026-04-28")).toContain("omer");
    expect(codes("2026-05-04")).toContain("omer"); // 17 Iyar
    expect(A("2026-05-05").verdict).toBe("ok"); // Lag BaOmer itself
    expect(codes("2026-05-05")).toContain("lag_baomer");
    expect(A("2026-05-06").verdict).toBe("ok");
  });

  it("extends through Lag BaOmer itself for Sephardim", () => {
    expect(A("2026-05-05", "sepharad").verdict).toBe("blocked");
    expect(A("2026-05-06", "sepharad").verdict).toBe("ok");
  });

  it("matches the reference ranges for 2027", () => {
    expect(codes("2027-05-24")).toContain("omer"); // day before Lag BaOmer (25 May 2027)
    expect(A("2027-05-25").verdict).toBe("ok");
  });

  it("does not block ordinary spring dates before Pesach", () => {
    expect(A("2026-03-25").verdict).toBe("ok");
  });
});

describe("assessDate: Three Weeks by custom", () => {
  it("Ashkenazi: blocked from 17 Tammuz through Tisha B'Av, open again after", () => {
    expect(A("2026-07-01").verdict).toBe("ok");
    expect(codes("2026-07-02")).toContain("three_weeks");
    expect(codes("2026-07-15")).toContain("three_weeks");
    expect(codes("2026-07-23")).toContain("three_weeks");
    expect(A("2026-07-27").verdict).toBe("ok");
  });

  it("Sephardi: open until Rosh Chodesh Av, blocked for the Nine Days", () => {
    const early = A("2026-07-08", "sepharad"); // 23 Tammuz
    expect(early.verdict).toBe("ok");
    expect(early.flags.map((f) => f.code)).toContain("three_weeks_sepharad");
    expect(A("2026-07-14", "sepharad").verdict).toBe("ok"); // 29 Tammuz, last open day
    expect(codes("2026-07-15", "sepharad")).toContain("nine_days"); // 1 Av
    expect(A("2026-07-22", "sepharad").verdict).toBe("blocked");
  });

  it("follows Tisha B'Av pushed to Sunday when 9 Av falls on Shabbat (2029)", () => {
    expect(A("2029-07-22").verdict).toBe("blocked");
    expect(A("2029-07-24").verdict).toBe("ok");
  });
});

describe("assessDate: statutory memorial days", () => {
  it("blocks Yom HaShoah and Yom HaZikaron and their eves", () => {
    expect(codes("2026-04-14")).toContain("memorial_day");
    expect(codes("2026-04-21")).toContain("memorial_day");
    expect(codes("2026-04-13")).toContain("memorial_eve");
    expect(A("2026-04-14").holidays.join(" ")).toMatch(/שואה/);
  });
});

describe("scanDates", () => {
  it("filters by weekday and verdict, and is ordered by date", () => {
    const res = scanDates({
      from: "2026-04-01",
      to: "2026-06-30",
      custom: "ashkenaz",
      city: "Tel Aviv",
      weekdays: [1, 2],
      worstAllowed: "ok",
    });
    expect(res.length).toBeGreaterThan(5);
    expect(res.every((r) => r.weekdayIndex === 1 || r.weekdayIndex === 2)).toBe(true);
    expect(res.every((r) => r.verdict === "ok")).toBe(true);
    // nothing inside the Omer restriction
    expect(res.every((r) => r.iso < "2026-04-02" || r.iso >= "2026-05-05")).toBe(true);
    expect([...res].sort((a, b) => a.iso.localeCompare(b.iso))).toEqual(res);
  });
});
