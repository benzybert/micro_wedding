"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useHydrated } from "./app-state";

/** Renders its children only once the stored data has loaded. */
export function Ready({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <p className="muted loading">טוענים…</p>;
  return <>{children}</>;
}

export function PageHeader({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {lead ? <p className="lead">{lead}</p> : null}
    </header>
  );
}

export function Card({
  title,
  children,
  id,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section className={`card ${className}`} id={id}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  step?: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={value ?? ""}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(null);
        const n = Number(raw);
        onChange(Number.isFinite(n) && n >= min ? n : null);
      }}
    />
  );
}

export function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export type Tone = "ok" | "caution" | "blocked" | "info";

export function Badge({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <p className={`notice notice-${tone}`}>{children}</p>;
}

export function Disclaimer() {
  return (
    <p className="disclaimer">
      מידע כללי, לא ייעוץ משפטי או הלכתי. המחירים הם טווחי שוק אינדיקטיביים ולא הצעות מחיר: קבלו שלוש הצעות בכתב
      ובררו אם הן כוללות מע״מ. את הדין ההלכתי קובע מסדר הקידושין שלכם.
    </p>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="text-link" href={href}>
      {children}
    </Link>
  );
}

export const shekel = (n: number): string =>
  `${Math.round(n).toLocaleString("he-IL")} ₪`;

export const shekelExact = (n: number): string =>
  `${n.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₪`;
