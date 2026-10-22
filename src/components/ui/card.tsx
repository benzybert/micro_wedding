import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 rounded-card border border-line bg-surface p-5 shadow-[0_1px_0_rgb(0_0_0/0.02)]", className)} {...props} />;
}

export function SectionTitle({
  children,
  action,
  as: Tag = "h2",
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <Tag className="font-display text-xl font-semibold">{children}</Tag>
      {action}
    </div>
  );
}
