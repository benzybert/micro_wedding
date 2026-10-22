import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { HouseholdForm } from "@/components/guests/household-form";
import { requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "הוספת משק בית" };

export default async function NewHouseholdPage() {
  const { wedding } = await requireWorkspace();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/guests" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowRight className="size-4" aria-hidden />
        חזרה לאורחים
      </Link>
      <PageHeader title="הוספת אורחים" description="משק בית הוא הזמנה אחת: זוג, משפחה או אדם יחיד. כל משק בית מקבל קישור אישי לאישור הגעה." />
      <Card>
        <HouseholdForm partnerA={wedding.partnerAName} partnerB={wedding.partnerBName} />
      </Card>
    </div>
  );
}
