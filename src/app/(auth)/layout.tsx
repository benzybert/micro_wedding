import Link from "next/link";
import { SITE } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 block text-center font-display text-3xl font-semibold text-brand-ink">
        {SITE.name}
      </Link>
      <main id="main" className="rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
        {children}
      </main>
    </div>
  );
}
