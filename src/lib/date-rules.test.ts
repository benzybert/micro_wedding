import { describe, expect, it } from "vitest";
import { addDays, diffDays, hebrewDateOf, isIsoDate, todayIso, weekdayOf } from "./hebrew-calendar";
import { bestDatesByMonth, checkDate, earliestAfterPriorMarriage } from "./date-rules";

const ash = { custom: "ashkenazi", route: "rabbinate" } as const;
const seph = { custom: "sephardi", route: "rabbinate" } as const;

function ids(iso: string, o: typeof ash | typeof seph = ash) {
  return checkDate(iso, o).findings.map((f) => f.id);
}

describe("calendar helpers", () => {
  it("reads the Hebrew date from the runtime", () => {
    expect(hebrewDateOf("2026-04-02")).toEqual({ day: 15, month: "Nisan", year: 5786 });
    expect(hebrewDateOf("2026-07-23")).toMatchObject({ day: 9, month: "Av" });
  });

  it("rejects dates that do not exist", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("2026-02-28")).toBe(true);
  });

  it("adds days across a month and counts the distance", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(diffDays("2026-10-23", "2026-12-07")).toBe(45);
    expect(weekdayOf("2026-10-23")).toBe(5);
  });

  it("gives today's date in Israel, not in UTC", () => {
    // 22:30 UTC on 22 Oct is already 23 Oct in Israel (UTC+3 in October? UTC+2 after the clock change).
    expect(todayIso(new Date("2026-10-22T22:30:00Z"))).toBe("2026-10-23");
  });
});

describe("Shabbat, festivals and fasts", () => {
  it("blocks Shabbat", () => {
    expect(ids("2026-10-24")).toContain("shabbat");
    expect(checkDate("2026-10-24", ash).status).toBe("blocked");
  });

  it("blocks Pesach, Chol HaMoed and Sukkot", () => {
    expect(ids("2026-04-02")).toContain("pesach");
    expect(ids("2026-04-05")).toContain("pesach-cm");
    expect(ids("2026-09-26")).toContain("sukkot"); // 15 Tishri 5787
    expect(ids("2026-09-27")).toContain("sukkot-cm");
    expect(ids("2026-10-03")).toContain("shmini-atzeret"); // 22 Tishri 5787
  });

  it("keeps a fast on its date when it does not fall on Shabbat", () => {
    // 17 Tamuz 5786 is a Thursday (2 July 2026).
    expect(ids("2026-07-02")).toContain("tamuz-17");
    // 3 Tishri 5787 is a Monday (14 September 2026).
    expect(ids("2026-09-14")).toContain("tzom-gedaliah");
  });

  it("moves a fast that falls on Shabbat to Sunday", () => {
    // 3 Tishri 5785 was Shabbat 5 Oct 2024: Tzom Gedaliah was on Sunday 6 Oct.
    expect(hebrewDateOf("2024-10-05")).toMatchObject({ day: 3, month: "Tishri" });
    expect(ids("2024-10-06")).toContain("tzom-gedaliah");
    expect(ids("2024-10-05")).not.toContain("tzom-gedaliah");
    // 17 Tamuz 5782 was Shabbat 16 Jul 2022: the fast was on Sunday 17 Jul.
    expect(ids("2022-07-17")).toContain("tamuz-17");
    expect(ids("2022-07-16")).not.toContain("tamuz-17");
    // 9 Av 5785 was Shabbat 2 Aug 2025: Tisha B'Av was observed on Sunday 3 Aug.
    expect(ids("2025-08-03")).toContain("tisha-bav");
    expect(ids("2025-08-02")).not.toContain("tisha-bav");
  });
});

describe("the Three Weeks depend on the community", () => {
  it("2026: Ashkenazi 2 July to 23 July, matching the guide", () => {
    expect(checkDate("2026-07-01", ash).status).toBe("ok");
    expect(ids("2026-07-02")).toContain("tamuz-17");
    expect(ids("2026-07-10")).toContain("three-weeks");
    expect(ids("2026-07-23")).toContain("tisha-bav");
    expect(checkDate("2026-07-24", ash).status).toBe("ok");
  });

  it("Sephardim are free until Rosh Chodesh Av", () => {
    expect(checkDate("2026-07-10", seph).status).toBe("ok");
    expect(checkDate("2026-07-10", ash).status).toBe("blocked");
    expect(checkDate("2026-07-10", ash).customDependent).toBe(true);
    // Rosh Chodesh Av 5786 is 15 July 2026.
    expect(hebrewDateOf("2026-07-15")).toMatchObject({ day: 1, month: "Av" });
    expect(ids("2026-07-15", seph)).toContain("three-weeks");
  });

  it("matches the guide for 2027 (22 July to 12 August)", () => {
    expect(ids("2027-07-22")).toContain("tamuz-17");
    expect(ids("2027-08-12")).toContain("tisha-bav");
  });
});

describe("Sefirat HaOmer", () => {
  it("2026: restricted from Pesach, Ashkenazim return on Lag BaOmer, Sephardim a day later", () => {
    expect(ids("2026-04-20")).toContain("omer"); // 3 days after Pesach ended
    expect(ids("2026-05-04")).toContain("omer"); // 17 Iyar
    expect(ids("2026-05-05", ash)).not.toContain("omer"); // Lag BaOmer
    expect(ids("2026-05-05", seph)).toContain("omer");
    expect(ids("2026-05-06", seph)).not.toContain("omer");
  });

  it("2027 Lag BaOmer is 25 May", () => {
    expect(hebrewDateOf("2027-05-25")).toMatchObject({ day: 18, month: "Iyar" });
    expect(ids("2027-05-24")).toContain("omer");
    expect(ids("2027-05-25")).not.toContain("omer");
  });
});

describe("statutory memorial days", () => {
  it("2026: Yom HaShoah on 14 April and Yom HaZikaron on 21 April", () => {
    expect(ids("2026-04-14")).toContain("yom-hashoah");
    expect(ids("2026-04-13")).toContain("yom-hashoah-eve");
    expect(ids("2026-04-21")).toContain("yom-hazikaron");
    expect(ids("2026-04-20")).toContain("yom-hazikaron-eve");
    // Independence Day itself is open to public events.
    expect(ids("2026-04-22")).not.toContain("yom-hazikaron");
  });

  it("2025: Independence Day moved to Thursday 1 May, so Yom HaZikaron is Wednesday 30 April", () => {
    expect(ids("2025-04-30")).toContain("yom-hazikaron");
    expect(ids("2025-05-01")).not.toContain("yom-hazikaron");
  });

  it("2024: Independence Day moved from Monday to Tuesday, so Yom HaZikaron is Monday 13 May", () => {
    expect(ids("2024-05-13")).toContain("yom-hazikaron");
  });

  it("applies in every route, even a civil wedding abroad-registered one", () => {
    const civil = checkDate("2026-04-21", { custom: "ashkenazi", route: "cyprus" });
    expect(civil.findings.find((f) => f.id === "yom-hazikaron")?.severity).toBe("blocked");
    expect(civil.status).toBe("blocked");
  });
});

describe("outside the Rabbinate route", () => {
  it("downgrades halachic blocks to a caution", () => {
    const civil = checkDate("2026-07-10", { custom: "ashkenazi", route: "utah" });
    expect(civil.status).toBe("caution");
  });
});

describe("cost ranking", () => {
  it("makes Thursday in summer the most expensive and a winter weekday the cheapest", () => {
    const winterTuesday = checkDate("2026-12-01", ash);
    const summerThursday = checkDate("2026-06-04", ash);
    expect(winterTuesday.costRank).toBe(0);
    expect(summerThursday.costRank).toBe(5);
  });

  it("picks only open dates, cheapest first inside a month", () => {
    const picks = bestDatesByMonth("2026-12-01", 3, 2, ash);
    expect(picks.length).toBeGreaterThanOrEqual(3);
    for (const month of picks) {
      expect(month.dates.length).toBeLessThanOrEqual(2);
      for (const d of month.dates) expect(d.status).toBe("ok");
    }
    expect(picks[0].dates[0].dayTier).toBe("low");
  });
});

describe("waiting period after a divorce or widowhood", () => {
  it("counts 90 full days between the two end days", () => {
    expect(earliestAfterPriorMarriage("2026-01-01")).toBe("2026-04-02");
    expect(diffDays("2026-01-01", earliestAfterPriorMarriage("2026-01-01"))).toBe(91);
  });
});
