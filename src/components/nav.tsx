"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  Clock,
  Ellipsis,
  Home,
  Scale,
  Settings,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: Item[] = [
  { href: "/home", label: "בית", icon: Home },
  { href: "/guests", label: "אורחים", icon: Users },
  { href: "/decisions", label: "החלטות", icon: Scale },
  { href: "/date", label: "תאריך", icon: CalendarDays },
  { href: "/budget", label: "תקציב", icon: Wallet },
  { href: "/vendors", label: "ספקים", icon: Store },
  { href: "/tasks", label: "משימות", icon: CheckSquare },
  { href: "/timeline", label: "לו״ז היום", icon: Clock },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

const MOBILE_PRIMARY = ["/home", "/guests", "/decisions", "/tasks"];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const active = useActive();
  return (
    <nav aria-label="ניווט ראשי" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors",
            active(href) ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
          )}
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const active = useActive();
  const primary = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
  const moreActive = !primary.some((i) => active(i.href));
  return (
    <nav
      aria-label="ניווט ראשי"
      className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {primary.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium", active(href) ? "text-brand-ink" : "text-muted")}
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </Link>
      ))}
      <Link
        href="/more"
        aria-current={moreActive ? "page" : undefined}
        className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium", moreActive ? "text-brand-ink" : "text-muted")}
      >
        <Ellipsis className="size-5" aria-hidden />
        עוד
      </Link>
    </nav>
  );
}

export function MoreList() {
  return (
    <nav aria-label="כל העמודים" className="grid gap-2">
      {NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href)).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 font-medium">
          <Icon className="size-5 text-brand-ink" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
