import type { Metadata } from "next";
import { VendorsView } from "@/components/views/vendors-view";

export const metadata: Metadata = { title: "ספקים" };

export default function Page() {
  return <VendorsView />;
}
