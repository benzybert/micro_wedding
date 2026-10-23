import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { MoreList } from "@/components/nav";
import { PageHeader } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "עוד" };

export default function MorePage() {
  return (
    <>
      <PageHeader title="עוד" />
      <MoreList />
      <Link href="/who" className={buttonClass("secondary", "md", "mt-6 w-full")}>
        <UserRound className="size-4" aria-hidden />
        החלפת מתכנן/ת
      </Link>
    </>
  );
}
