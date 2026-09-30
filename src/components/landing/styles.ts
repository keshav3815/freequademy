/** Class overrides applied to the shared shadcn Button for landing CTAs. */
export const ctaStyles = {
  primary:
    "h-12 rounded-full px-6 text-[15px] font-semibold bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.8)] hover:bg-primary/90 hover:scale-100 hover:shadow-[0_14px_30px_-12px_hsl(var(--primary)/0.9)] active:translate-y-px [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5",
  secondary:
    "h-12 rounded-full px-6 text-[15px] font-semibold border border-border bg-card text-foreground hover:bg-muted hover:text-foreground active:translate-y-px",
  onInk:
    "h-12 rounded-full px-6 text-[15px] font-semibold bg-white text-[hsl(var(--ink))] hover:bg-white/90 hover:scale-100 active:translate-y-px [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5",
  onInkSecondary:
    "h-12 rounded-full px-6 text-[15px] font-semibold border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white active:translate-y-px",
} as const;
