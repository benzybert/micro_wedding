import type { Metadata } from "next";
import { RouteView } from "@/components/views/route-view";

export const metadata: Metadata = { title: "מסלול רישום" };

export default function Page() {
  return <RouteView />;
}
