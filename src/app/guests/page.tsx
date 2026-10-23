import type { Metadata } from "next";
import { GuestsView } from "@/components/views/guests-view";

export const metadata: Metadata = { title: "אורחים" };

export default function Page() {
  return <GuestsView />;
}
