"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "סקירה" },
  { href: "/date", label: "תאריך" },
  { href: "/budget", label: "תקציב" },
  { href: "/guests", label: "אורחים" },
  { href: "/vendors", label: "ספקים" },
  { href: "/timeline", label: "לוח זמנים" },
  { href: "/route", label: "מסלול רישום" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          מיקרו חתונה
        </Link>
        <nav aria-label="ניווט ראשי" className="nav">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={active ? "active" : ""}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
