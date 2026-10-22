"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { markContactedAction } from "@/app/actions/guests";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "העתקת קישור", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("secondary", "sm", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt("העתיקו את הקישור:", text);
        }
      }}
    >
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {done ? "הועתק" : label}
    </button>
  );
}

/** Opens WhatsApp with the prepared text and records that this household was contacted. */
export function WhatsAppButton({
  href,
  householdId,
  kind,
  label,
  className,
}: {
  href: string;
  householdId: string;
  kind: "invite" | "reminder";
  label: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={pending}
      className={buttonClass("primary", "sm", className)}
      onClick={() => start(() => void markContactedAction(householdId, kind))}
    >
      <MessageCircle className="size-4" aria-hidden />
      {label}
    </a>
  );
}

/** Select that submits its form as soon as it changes (used for quick tier / table changes). */
export function AutoSubmitSelect({
  name,
  defaultValue,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  name: string;
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  "aria-label": string;
}) {
  const ref = useRef<HTMLSelectElement>(null);
  return (
    <select
      ref={ref}
      name={name}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      className={cn("min-h-9 rounded-lg border border-line bg-surface px-2 text-sm", className)}
      onChange={() => ref.current?.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}

/** Submit button that asks for confirmation first. */
export function ConfirmButton({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
