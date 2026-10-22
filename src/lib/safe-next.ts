/** Only allow same-site relative redirects (blocks open-redirect via ?next=). */
export function safeNext(next: FormDataEntryValue | string | null | undefined, fallback = "/home"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
