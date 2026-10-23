import Link from "next/link";
import { UserRound } from "lucide-react";
import { SITE } from "@/config/site";
import { BottomNav, SideNav } from "@/components/nav";
import { memberLabel, requireWorkspace } from "@/lib/session";

// Everything here reads the live database; never prerender it.
export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const ws = await requireWorkspace();
  const me = memberLabel(ws.wedding, ws.me);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-e border-line px-4 py-6 lg:flex">
        <Link href="/home" className="px-3 font-display text-2xl font-semibold text-brand-ink">
          {SITE.name}
        </Link>
        <SideNav />
        <Link href="/who" className="mt-auto flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm hover:bg-line/50" title="החלפת מתכנן/ת">
          <UserRound className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            אני <strong>{me}</strong>
          </span>
          <span className="text-xs text-muted">החלפה</span>
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/home" className="font-display text-xl font-semibold text-brand-ink">
            {SITE.name}
          </Link>
          <Link href="/who" className="inline-flex items-center gap-1.5 truncate text-sm text-muted">
            <UserRound className="size-4" aria-hidden />
            אני {me}
          </Link>
        </header>
        <main id="main" className="px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
