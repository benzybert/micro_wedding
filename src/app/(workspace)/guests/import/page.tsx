import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { ImportForm } from "@/components/guests/import-form";
import { requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "ייבוא אורחים" };

export default async function ImportPage() {
  await requireWorkspace();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/guests" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowRight className="size-4" aria-hidden />
        חזרה לאורחים
      </Link>
      <PageHeader title="ייבוא אורחים" description="מדביקים מאקסל או מגוגל שיטס (עם שורת כותרות), או מעלים קובץ CSV." />
      <Card>
        <ImportForm />
        <div className="mt-6 rounded-xl bg-surface-2 p-4 text-sm text-muted">
          <p className="mb-1 font-medium text-ink">עמודות שמזהים</p>
          <p>
            שם (חובה), משק בית, צד (שם אחד מכם), רשימה (א/ב/ג), טלפון, אימייל, תזונה (צמחוני/טבעוני/גלוטן), אלרגיות, ילד (כן), הערות. בלי כותרות: העמודה הראשונה היא שם, והשנייה טלפון. אנשים עם אותו שם משק בית מקובצים להזמנה אחת.
          </p>
        </div>
      </Card>
    </div>
  );
}
