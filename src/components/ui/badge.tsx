import { cn } from "@/lib/utils";

export type Tone = "neutral" | "brand" | "sage" | "amber" | "rose" | "sky";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  brand: "bg-brand-soft text-brand-ink",
  sage: "bg-sage-soft text-sage-ink",
  amber: "bg-amber-soft text-amber-ink",
  rose: "bg-rose-soft text-rose-ink",
  sky: "bg-sky-soft text-sky-ink",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const toneBg: Record<Tone, string> = {
  neutral: "bg-muted",
  brand: "bg-brand",
  sage: "bg-sage-ink",
  amber: "bg-amber-ink",
  rose: "bg-rose-ink",
  sky: "bg-sky-ink",
};
