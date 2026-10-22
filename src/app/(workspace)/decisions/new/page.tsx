import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { DecisionForm } from "@/components/decisions/forms";
import { requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "החלטה חדשה" };

export default async function NewDecisionPage() {
  await requireWorkspace();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/decisions" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowRight className="size-4" aria-hidden />
        חזרה להחלטות
      </Link>
      <PageHeader title="החלטה חדשה" description="אחרי היצירה מוסיפים אפשרויות ומדרגים." />
      <Card>
        <DecisionForm />
      </Card>
    </div>
  );
}
