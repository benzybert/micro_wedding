import Link from "next/link";
import { LogOut } from "lucide-react";
import { SITE } from "@/config/site";
import { BottomNav, SideNav } from "@/components/nav";
import { signOutAction } from "@/app/actions/auth";
import { requireWorkspace } from "@/lib/session";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const ws = await requireWorkspace();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-e border-line px-4 py-6 lg:flex">
        <Link href="/home" className="px-3 font-display text-2xl font-semibold text-brand-ink">
          {SITE.name}
        </Link>
        <SideNav />
        <div className="mt-auto flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{ws.user.name}</p>
            <p className="truncate text-xs text-muted" dir="ltr">
              {ws.user.email}
            </p>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink" aria-label="התנתקות" title="התנתקות">
              <LogOut className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/home" className="font-display text-xl font-semibold text-brand-ink">
            {SITE.name}
          </Link>
          <p className="truncate text-sm text-muted">
            {ws.wedding.partnerAName} ו{ws.wedding.partnerBName}
          </p>
        </header>
        <main id="main" className="px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
