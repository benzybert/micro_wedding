import { AlertTriangle, Ban, CheckCircle2, CloudSun, Info, Moon, Sunset, Tag } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import type { DateAssessment, DateFlag, PriceLevel, Severity, Verdict } from "@/lib/hebrew-calendar";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";

export const VERDICT_LABEL: Record<Verdict, string> = { ok: "אפשרי", caution: "בזהירות", avoid: "עדיף להימנע", blocked: "לא אפשרי" };
export const VERDICT_TONE: Record<Verdict, Tone> = { ok: "sage", caution: "amber", avoid: "amber", blocked: "rose" };
const PRICE_LABEL: Record<PriceLevel, string> = { low: "חסכוני", medium: "ממוצע", high: "יקר" };
const PRICE_TONE: Record<PriceLevel, Tone> = { low: "sage", medium: "neutral", high: "rose" };

const FLAG_STYLE: Record<Severity, { box: string; icon: React.ReactNode }> = {
  blocked: { box: "bg-rose-soft text-rose-ink", icon: <Ban className="mt-0.5 size-4 shrink-0" aria-hidden /> },
  avoid: { box: "bg-amber-soft text-amber-ink", icon: <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> },
  caution: { box: "bg-amber-soft text-amber-ink", icon: <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> },
  info: { box: "bg-sky-soft text-sky-ink", icon: <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> },
  good: { box: "bg-sage-soft text-sage-ink", icon: <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> },
};

export function PriceBadge({ level }: { level: PriceLevel }) {
  return (
    <Badge tone={PRICE_TONE[level]}>
      <Tag className="size-3" aria-hidden />
      {PRICE_LABEL[level]}
    </Badge>
  );
}

export function FlagList({ flags }: { flags: DateFlag[] }) {
  return (
    <ul className="grid gap-2">
      {flags.map((f) => (
        <li key={f.code} className={cn("flex gap-2 rounded-xl p-3 text-sm", FLAG_STYLE[f.severity].box)}>
          {FLAG_STYLE[f.severity].icon}
          <span>
            <strong className="font-semibold">{f.title}.</strong> {f.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Full breakdown for one date. */
export function AssessmentDetail({ a }: { a: DateAssessment }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-semibold">{formatDateLong(a.iso)}</p>
          <p className="text-sm text-muted">
            {a.hebrewDate}
            {a.holidays.length ? ` · ${a.holidays.join(", ")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={VERDICT_TONE[a.verdict]}>{VERDICT_LABEL[a.verdict]}</Badge>
          <PriceBadge level={a.priceLevel} />
        </div>
      </div>
      <FlagList flags={a.flags} />
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="mb-1 flex items-center gap-1.5 text-muted">
            <Sunset className="size-4" aria-hidden /> שקיעה
          </dt>
          <dd className="font-medium">
            <bdi className="ltr">{a.sun.sunset}</bdi>
            {a.weekdayIndex === 5 ? <span className="block text-xs font-normal text-muted">הדלקת נרות: <bdi className="ltr">{a.sun.candleLighting}</bdi></span> : null}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="mb-1 flex items-center gap-1.5 text-muted">
            <Moon className="size-4" aria-hidden /> צאת הכוכבים
          </dt>
          <dd className="font-medium">
            <bdi className="ltr">{a.sun.nightfall}</bdi>
            {a.weekdayIndex === 6 ? <span className="block text-xs font-normal text-muted">מוצאי שבת: אפשר להתחיל אחרי</span> : null}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="mb-1 flex items-center gap-1.5 text-muted">
            <CloudSun className="size-4" aria-hidden /> מזג אוויר
          </dt>
          <dd className="text-xs leading-relaxed">{a.weatherNote}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">{a.priceNote}</p>
    </div>
  );
}
