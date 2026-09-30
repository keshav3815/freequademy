import { Fragment, type AnchorHTMLAttributes, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "./hooks";
import type { Href } from "./data";

interface SmartLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: Href;
}

/** Router link for app routes, plain anchor for on-page sections. */
export function SmartLink({ href, children, ...rest }: SmartLinkProps) {
  if (href.startsWith("#")) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  );
}

type RevealTag = "div" | "li" | "article" | "figure";

interface RevealProps extends HTMLAttributes<HTMLElement> {
  as?: RevealTag;
  /** Stagger delay in milliseconds. */
  delay?: number;
}

/** Fades and lifts its content in when scrolled into view. */
export function Reveal({ as = "div", delay = 0, className, style, children, ...rest }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const Tag = as as "div";
  return (
    <Tag
      ref={ref}
      data-visible={inView}
      className={cn("fq-reveal", className)}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  id: string;
  labelledBy: string;
}

export function Section({ id, labelledBy, className, children, ...rest }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("relative py-20 md:py-28 lg:py-32", className)} {...rest}>
      {children}
    </section>
  );
}

interface SectionHeaderProps {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({ id, eyebrow, title, lead, align = "left", className }: SectionHeaderProps) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <p className="fq-eyebrow mb-4">{eyebrow}</p>
      <h2 id={id} className="fq-h2">
        {title}
      </h2>
      {lead && <p className={cn("fq-lead mt-5 max-w-2xl", align === "center" && "mx-auto")}>{lead}</p>}
    </Reveal>
  );
}

/** Honest label for marketing visuals that show sample data. */
export function PreviewTag({ children = "Product preview", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      <Eye className="h-3 w-3" aria-hidden="true" />
      {children}
    </span>
  );
}

interface FlowStepsProps {
  steps: readonly string[];
  /** Steps up to and including this index render as reached. */
  activeIndex?: number;
  label: string;
  className?: string;
}

/** A compact "A → B → C" sequence. Reached steps are marked with weight and a check, not colour alone. */
export function FlowSteps({ steps, activeIndex = steps.length - 1, label, className }: FlowStepsProps) {
  return (
    <ol aria-label={label} className={cn("flex flex-wrap items-center gap-x-2 gap-y-2 text-sm", className)}>
      {steps.map((step, i) => {
        const reached = i <= activeIndex;
        return (
          <Fragment key={step}>
            <li
              aria-current={i === activeIndex ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors duration-500",
                reached
                  ? "border-primary/30 bg-primary/10 font-semibold text-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold",
                  reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              {step}
            </li>
            {i < steps.length - 1 && (
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-accent text-accent-foreground [&_svg]:h-5 [&_svg]:w-5",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Initials avatar for illustrative people. Never uses real photos. */
export function InitialsAvatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-white",
        className,
      )}
    >
      {initials}
    </span>
  );
}
