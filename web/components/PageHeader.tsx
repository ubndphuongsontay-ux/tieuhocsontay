import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <div className="mb-1 text-[12.5px] font-medium text-primary">{eyebrow}</div>
        ) : null}
        <h1 className="text-[30px] leading-[1.25] font-extrabold tracking-tight text-foreground sm:text-[32px]">
          {title}
        </h1>
        {description ? (
          <div className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[12px] border border-border bg-card shadow-[var(--shadow-card)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[20px] leading-snug font-bold text-foreground">{children}</h2>
  );
}
