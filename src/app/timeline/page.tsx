import type { Metadata } from "next";
import { TimelineView } from "@/components/views/timeline-view";

export const metadata: Metadata = { title: "לוח זמנים" };

export default function Page() {
  return <TimelineView />;
}
