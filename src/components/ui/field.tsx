import { useId } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full min-h-11 rounded-xl border border-line bg-surface px-3.5 py-2 text-[0.95rem] text-ink " +
  "placeholder:text-muted/80 transition-colors hover:border-muted/60 focus:border-brand";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: (props: { id: string; "aria-describedby"?: string }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({ id, "aria-describedby": hintId })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  const dirProps = props.type === "tel" || props.type === "email" || props.type === "url" || props.type === "date" || props.type === "time" || props.type === "number" ? {} : { dir: "auto" as const };
  return <input className={cn(inputClass, className)} {...dirProps} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: React.ComponentProps<"textarea">) {
  return <textarea rows={rows} dir="auto" className={cn(inputClass, "py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "pe-8", className)} {...props}>
      {children}
    </select>
  );
}

/** Convenience: labelled text input. */
export function TextField({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(a) => <Input {...a} {...props} />}
    </Field>
  );
}
