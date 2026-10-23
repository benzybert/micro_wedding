import type { Metadata } from "next";
import { BudgetView } from "@/components/views/budget-view";

export const metadata: Metadata = { title: "תקציב" };

export default function Page() {
  return <BudgetView />;
}
