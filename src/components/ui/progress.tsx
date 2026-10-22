import { cn } from "@/lib/utils";
import { toneBg, type Tone } from "./badge";

export type Segment = { value: number; tone: Tone; label: string };

/**
 * Stacked horizontal bar. Fills from the inline-start edge (right in RTL).
 * `max` is the full width; segments beyond it are clipped and the bar turns into a warning via `over`.
 */
export function SegmentedBar({
  segments,
  max,
  className,
  label,
}: {
  segments: Segment[];
  max: number;
  className?: string;
  label: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const denom = Math.max(max, total, 1);
  return (
    <div
      role="img"
      aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")} מתוך ${max}`}
      className={cn("flex h-3 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      {segments.map((s) =>
        s.value > 0 ? (
          <div key={s.label} className={cn("h-full", toneBg[s.tone])} style={{ width: `${(s.value / denom) * 100}%` }} />
        ) : null,
      )}
    </div>
  );
}

export function ProgressBar({ value, max, tone = "brand", label }: { value: number; max: number; tone?: Tone; label: string }) {
  return <SegmentedBar segments={[{ value: Math.min(value, max), tone, label }]} max={max} label={label} />;
}
