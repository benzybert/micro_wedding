import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Group an array by a key. */
export function groupBy<T, K extends string>(items: readonly T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

export function sum(nums: readonly number[]): number {
  let total = 0;
  for (const n of nums) total += n;
  return total;
}

/** Trim a form value; empty string becomes null. */
export function textOrNull(value: FormDataEntryValue | null | undefined, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}
