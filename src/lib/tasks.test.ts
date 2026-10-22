import { describe, expect, it } from "vitest";
import { TASK_TEMPLATES, templatesForTrack } from "@/data/task-templates";
import { DECISION_TEMPLATES } from "@/data/decision-templates";
import { TIMELINE_TEMPLATE, addMinutes } from "@/data/timeline-template";
import { groupTasks, taskDue, taskProgress, type TaskLite } from "./tasks";

const t = (id: string, o: Partial<TaskLite> = {}): TaskLite => ({ id, done: false, dueDate: null, dueOffsetDays: null, ...o });

describe("taskDue", () => {
  it("derives from the wedding date and moves with it", () => {
    expect(taskDue({ dueDate: null, dueOffsetDays: 45 }, "2027-03-01")).toBe("2027-01-15");
    expect(taskDue({ dueDate: null, dueOffsetDays: 45 }, "2027-03-15")).toBe("2027-01-29");
  });
  it("supports tasks after the wedding (negative offset)", () => {
    expect(taskDue({ dueDate: null, dueOffsetDays: -14 }, "2027-03-01")).toBe("2027-03-15");
  });
  it("prefers an explicit date and handles no wedding date", () => {
    expect(taskDue({ dueDate: "2026-12-01", dueOffsetDays: 45 }, "2027-03-01")).toBe("2026-12-01");
    expect(taskDue({ dueDate: null, dueOffsetDays: 45 }, null)).toBeNull();
  });
});

describe("groupTasks", () => {
  const today = "2026-10-22";
  const wedding = "2027-01-22"; // 92 days away
  it("buckets by urgency and sorts by due date", () => {
    const tasks = [
      t("far", { dueOffsetDays: 20 }), // 2027-01-02: 72 days → later
      t("soon", { dueOffsetDays: 50 }), // 2026-12-03: 42 days → soon
      t("urgent", { dueOffsetDays: 85 }), // 2026-10-29: 7 days → now
      t("overdue", { dueDate: "2026-10-01" }),
      t("nodate"),
      t("fin", { done: true, dueOffsetDays: 85 }),
    ];
    const g = groupTasks(tasks, wedding, today);
    expect(g.now.map((x) => x.id)).toEqual(["overdue", "urgent"]);
    expect(g.soon.map((x) => x.id)).toEqual(["soon"]);
    expect(g.later.map((x) => x.id)).toEqual(["far"]);
    expect(g.undated.map((x) => x.id)).toEqual(["nodate"]);
    expect(g.done.map((x) => x.id)).toEqual(["fin"]);
  });
  it("puts relative tasks in 'undated' while the date is unknown", () => {
    expect(groupTasks([t("a", { dueOffsetDays: 30 })], null, today).undated).toHaveLength(1);
  });
  it("reports progress", () => {
    expect(taskProgress([t("a", { done: true }), t("b")])).toEqual({ done: 1, total: 2, ratio: 0.5 });
  });
});

describe("templates", () => {
  it("have unique keys", () => {
    const keys = TASK_TEMPLATES.map((x) => x.key);
    expect(new Set(keys).size).toBe(keys.length);
    const dkeys = DECISION_TEMPLATES.map((x) => x.key);
    expect(new Set(dkeys).size).toBe(dkeys.length);
  });
  it("only seeds religious paperwork for religious tracks", () => {
    const civil = templatesForTrack("civil_abroad").map((x) => x.key);
    expect(civil).not.toContain("open-marriage-file");
    expect(civil).not.toContain("mikveh");
    expect(civil).toContain("civil-register");
    const rabbinate = templatesForTrack("rabbinate").map((x) => x.key);
    expect(rabbinate).toContain("open-marriage-file");
    expect(rabbinate).not.toContain("civil-register");
  });
  it("keeps the rabbinate file at least 45 days ahead and ACUM as a hard deadline", () => {
    const file = TASK_TEMPLATES.find((x) => x.key === "open-marriage-file")!;
    expect(file.offsetDays).toBeGreaterThanOrEqual(45);
    expect(file.hard).toBe(true);
    const acum = TASK_TEMPLATES.find((x) => x.key === "acum")!;
    expect(acum.offsetDays).toBeGreaterThanOrEqual(3); // 72 hours
    expect(acum.hard).toBe(true);
  });
  it("every decision has criteria with weights 1–5", () => {
    for (const d of DECISION_TEMPLATES) {
      expect(d.criteria.length).toBeGreaterThan(0);
      for (const c of d.criteria) expect(c.weight >= 1 && c.weight <= 5).toBe(true);
    }
  });
  it("timeline is chronological and addMinutes wraps midnight", () => {
    const offsets = TIMELINE_TEMPLATE.map((x) => x.offsetMin);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
    expect(addMinutes("18:00", -45)).toBe("17:15");
    expect(addMinutes("23:30", 60)).toBe("00:30");
    expect(addMinutes("00:10", -20)).toBe("23:50");
  });
});
