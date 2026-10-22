import { addDays, daysBetween } from "@/lib/format";

export type TaskLite = {
  id: string;
  done: boolean;
  dueDate: string | null;
  dueOffsetDays: number | null;
  sortOrder?: number;
};

/** Explicit date wins; otherwise the wedding date minus the offset (negative offset = after the wedding). */
export function taskDue(t: Pick<TaskLite, "dueDate" | "dueOffsetDays">, weddingDate: string | null): string | null {
  if (t.dueDate) return t.dueDate;
  if (weddingDate && t.dueOffsetDays != null) return addDays(weddingDate, -t.dueOffsetDays);
  return null;
}

export type TaskGroups<T> = {
  now: T[];
  soon: T[];
  later: T[];
  undated: T[];
  done: T[];
};

/** now = overdue or due within 14 days; soon = within 60 days; later = beyond. */
export function groupTasks<T extends TaskLite>(tasks: readonly T[], weddingDate: string | null, today: string): TaskGroups<T> {
  const g: TaskGroups<T> = { now: [], soon: [], later: [], undated: [], done: [] };
  const dueOf = (t: T) => taskDue(t, weddingDate);
  for (const t of tasks) {
    if (t.done) {
      g.done.push(t);
      continue;
    }
    const due = dueOf(t);
    if (!due) g.undated.push(t);
    else {
      const d = daysBetween(today, due);
      (d <= 14 ? g.now : d <= 60 ? g.soon : g.later).push(t);
    }
  }
  const byDue = (a: T, b: T) => (dueOf(a) ?? "9999").localeCompare(dueOf(b) ?? "9999") || (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  g.now.sort(byDue);
  g.soon.sort(byDue);
  g.later.sort(byDue);
  return g;
}

export function taskProgress(tasks: readonly Pick<TaskLite, "done">[]): { done: number; total: number; ratio: number } {
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, ratio: tasks.length ? done / tasks.length : 0 };
}
