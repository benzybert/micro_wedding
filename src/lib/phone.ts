/**
 * Israeli-first phone handling for WhatsApp deep links.
 * Returns digits-only international form ("9725XXXXXXXX") or null when it cannot be a real number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("00")) digits = digits.slice(2);

  if (hasPlus) {
    // International: E.164 allows up to 15 digits.
    if (digits.startsWith("972")) return validIsraeli(digits);
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }
  if (digits.startsWith("972")) return validIsraeli(digits);
  if (digits.startsWith("0")) return validIsraeli(`972${digits.slice(1)}`);
  // Bare mobile without the leading zero: 501234567
  if (/^5\d{8}$/.test(digits)) return `972${digits}`;
  return null;
}

function validIsraeli(digits: string): string | null {
  const national = digits.slice(3);
  // Mobile: 5X + 7 digits (9). Landline: area code 2,3,4,8,9 + 7 digits (8). VoIP: 7X + 7 digits (9).
  if (/^5\d{8}$/.test(national) || /^7\d{8}$/.test(national) || /^[23489]\d{7}$/.test(national)) return digits;
  return null;
}

/** "972501234567" → "050-123-4567" (falls back to +digits for non-Israeli numbers). */
export function formatPhone(raw: string | null | undefined): string {
  const n = normalizePhone(raw);
  if (!n) return raw?.trim() ?? "";
  if (n.startsWith("972")) {
    const national = `0${n.slice(3)}`;
    if (national.length === 10) return `${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
    return `${national.slice(0, 2)}-${national.slice(2)}`;
  }
  return `+${n}`;
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const n = normalizePhone(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/** Link without a recipient, so the sender picks the contact in WhatsApp. */
export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
