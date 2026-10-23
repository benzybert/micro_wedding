import type { Metadata } from "next";
import { DateView } from "@/components/views/date-view";

export const metadata: Metadata = { title: "תאריך" };

export default function Page() {
  return <DateView />;
}
