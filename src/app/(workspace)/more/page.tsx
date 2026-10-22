import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { MoreList } from "@/components/nav";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "עוד" };

export default function MorePage() {
  return (
    <>
      <PageHeader title="עוד" />
      <MoreList />
      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="secondary" className="w-full">
          <LogOut className="size-4" aria-hidden />
          התנתקות
        </Button>
      </form>
    </>
  );
}
