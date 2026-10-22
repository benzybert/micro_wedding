import type { VendorStatus } from "@/db/schema";

export const VENDOR_STATUS_LABEL: Record<VendorStatus, string> = {
  idea: "רעיון",
  contacted: "יצרנו קשר",
  quoted: "קיבלנו הצעה",
  booked: "סגרנו",
  declined: "לא מתאים",
};

export const VENDOR_STATUS_ORDER: VendorStatus[] = ["booked", "quoted", "contacted", "idea", "declined"];
