/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Loader2, Search, X, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/teacher/format";

/*
 * Teacher portal design system primitives. Every portal page composes these
 * so spacing, type scale, radius and states stay consistent:
 *   page title 28px · section title 18px · card title 15px · body 14px · meta 12–13px
 *   8px spacing grid · 10px radius · 1px borders · minimal shadow
 */

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
export const tButtonVariants = cva(
  "tp-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[var(--tp-shadow-sm)] hover:bg-primary/90",
        secondary: "border border-border bg-card text-foreground shadow-[var(--tp-shadow-sm)] hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "bg-destructive text-white hover:bg-destructive/90",
        subtle: "bg-accent text-accent-foreground hover:bg-accent/70",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface TButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof tButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const TButton = React.forwardRef<HTMLButtonElement, TButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(tButtonVariants({ variant, size }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
TButton.displayName = "TButton";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { to: string; label: string };
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {back && (
          <Link to={back.to} className="tp-focus mb-1 inline-flex items-center gap-1 rounded text-[13px] font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {back.label}
          </Link>
        )}
        {eyebrow && <div className="text-[13px] text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px] sm:leading-9">{title}</h1>
        {description && <p className="max-w-2xl text-[14px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  as: As = "section",
  id,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div" | "article";
  id?: string;
}) {
  const headingId = React.useId();
  return (
    <As
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn("rounded-lg border border-border bg-card shadow-[var(--tp-shadow-sm)]", className)}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1 basis-44">
            {title && (
              <h2 id={headingId} className="text-[15px] font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="max-w-full">{action}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </As>
  );
}

export function PanelLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="tp-focus inline-flex items-center gap-1 rounded text-[13px] font-medium text-primary hover:underline">
      {children}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  deltaUnit = " pts",
  upIsGood = true,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number | null;
  deltaUnit?: string;
  upIsGood?: boolean;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-8 text-foreground">{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
        {delta !== null && delta !== undefined && delta !== 0 && <Delta value={delta} unit={deltaUnit} upIsGood={upIsGood} />}
        {hint && <span>{hint}</span>}
      </div>
    </>
  );
  const className = "block rounded-lg border border-border bg-card p-4 shadow-[var(--tp-shadow-sm)]";
  return to ? (
    <Link to={to} className={cn(className, "tp-focus transition-colors hover:border-primary/40")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function Delta({ value, unit = "", upIsGood = true }: { value: number; unit?: string; upIsGood?: boolean }) {
  const up = value > 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", good ? "text-success" : "text-destructive")}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {up ? "+" : "−"}
      {Math.abs(value)}
      {unit}
      <span className="sr-only">{good ? " (improvement)" : " (decline)"}</span>
    </span>
  );
}

export function ProgressBar({ value, label, className }: { value: number | null; label?: string; className?: string }) {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.round(v)}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${v}%` }} />
      </div>
      <span className="tp-tabular w-10 text-right text-[12px] font-medium text-muted-foreground">{value === null ? "—" : `${Math.round(v)}%`}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  accent: "bg-accent text-accent-foreground",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  accent: "bg-primary",
};

/** Always text + (optional) dot, never color alone. */
export function StatusPill({ tone = "neutral", dot, pulse, children, className }: { tone?: Tone; dot?: boolean; pulse?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium", toneClass[tone], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClass[tone], pulse && "tp-live-dot")} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 32, className }: { name: string | null | undefined; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14")}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, compact }: { message: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14")}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-[15px] font-semibold text-foreground">Something went wrong</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{message}</p>
      {onRetry && (
        <TButton variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </TButton>
      )}
    </div>
  );
}

interface QueryLike<T> {
  isLoading: boolean;
  isError: boolean;
  data: T | undefined;
  refetch: () => unknown;
}

/**
 * Loading → skeleton, error → retry, success → children. A failed request is
 * never rendered as an empty/zero state.
 */
export function QueryView<T>({
  query,
  skeleton,
  what,
  compact,
  children,
}: {
  query: QueryLike<T>;
  skeleton: React.ReactNode;
  what: string;
  compact?: boolean;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <div role="status" aria-label={`Loading ${what}`}>{skeleton}</div>;
  if (query.isError || query.data === undefined) {
    return <ErrorState compact={compact} message={`We couldn't load ${what}.`} onRetry={() => query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5 rounded" />
            <Skeleton className="h-3 w-1/4 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3, className, height = 180 }: { count?: number; className?: string; height?: number }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="rounded-lg" style={{ height }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-muted/60 p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "tp-focus inline-flex h-7 shrink-0 items-center gap-1.5 rounded px-3 text-[13px] font-medium transition-colors",
              active ? "bg-card text-foreground shadow-[var(--tp-shadow-sm)]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="tp-tabular text-[12px] text-muted-foreground">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Controlled input that reports a debounced value. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
  delay = 200,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
  delay?: number;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  React.useEffect(() => {
    if (draft === value) return;
    const t = window.setTimeout(() => onChange(draft), delay);
    return () => window.clearTimeout(t);
  }, [draft, value, onChange, delay]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        aria-label={label}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        className="tp-focus h-9 w-full rounded-md border border-input bg-card pl-9 pr-8 text-sm placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          className="tp-focus absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Pagination({ page, pageCount, total, pageSize, onPage }: { page: number; pageCount: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
      <span className="tp-tabular">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <TButton variant="ghost" size="iconSm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft />
        </TButton>
        <span className="tp-tabular px-2">
          {page} / {pageCount}
        </span>
        <TButton variant="ghost" size="iconSm" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          <ChevronRight />
        </TButton>
      </div>
    </nav>
  );
}

export function usePaged<T>(items: T[], pageSize: number, resetKey: unknown) {
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setPage(1), [resetKey]);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  return {
    page: current,
    pageCount,
    setPage,
    rows: items.slice((current - 1) * pageSize, current * pageSize),
  };
}

export function Field({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-destructive">{error}</p>
      ) : (
        hint && <p className="text-[12px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export const inputClass =
  "tp-focus flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50";
export const textareaClass =
  "tp-focus flex min-h-[96px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <TButton variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </TButton>
          <TButton variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </TButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
