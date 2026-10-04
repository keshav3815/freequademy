import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { journey } from "./data";
import { useInView, useMediaQuery, usePrefersReducedMotion } from "./hooks";
import { Reveal, SectionHeader, SmartLink } from "./primitives";

const STEPS = journey.length;

/** Node positions along an ascending diagonal, in percent of the path box. */
const nodePoints = journey.map((_, i) => {
  const t = i / (STEPS - 1);
  return { x: 4 + t * 92, y: 82 - t * 64 + (i % 2 === 0 ? 0 : 10) };
});

/** Smooth curve through the nodes, in pixels for a box of the given size. */
function buildPath(width: number, height: number) {
  const pts = nodePoints.map((p) => ({ x: (p.x / 100) * width, y: (p.y / 100) * height }));
  return pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const midX = (prev.x + p.x) / 2;
      return `C ${midX} ${prev.y}, ${midX} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");
}

function useElementSize<T extends Element>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

function StepPanel({ index }: { index: number }) {
  const step = journey[index];
  const Icon = step.icon;
  return (
    <div
      id="journey-panel"
      role="tabpanel"
      aria-labelledby={`journey-tab-${index}`}
      className="fq-card grid animate-fade-in gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8 md:p-7"
    >
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-white">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="fq-eyebrow">
            Step {String(index + 1).padStart(2, "0")} / {String(STEPS).padStart(2, "0")}
          </p>
          <h3 className="fq-h3 mt-1">{step.title}</h3>
        </div>
      </div>
      <div>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{step.detail}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {step.points.map((p) => (
            <li key={p} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium">
              {p}
            </li>
          ))}
        </ul>
      </div>
      <SmartLink
        href={step.href}
        className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-accent-foreground hover:underline hover:underline-offset-4"
      >
        {step.cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </SmartLink>
    </div>
  );
}

interface HorizontalProps {
  active: number;
  onSelect: (index: number) => void;
}

/** Desktop: a diagonal path of steps plus a detail panel, built as an accessible tab list. */
function JourneyPath({ active, onSelect }: HorizontalProps) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [boxRef, box] = useElementSize<HTMLDivElement>();
  const pathD = box.width ? buildPath(box.width, box.height) : "";
  // Nodes sit at equal steps along x, so the filled share of the curve is close to active / (STEPS - 1).
  const fill = active / (STEPS - 1);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = active;
    if (e.key in keys) next = (active + keys[e.key] + STEPS) % STEPS;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = STEPS - 1;
    else return;
    e.preventDefault();
    onSelect(next);
    tabsRef.current[next]?.focus({ preventScroll: true });
  };

  return (
    <div className="mt-8">
      <div ref={boxRef} className="relative h-[190px] xl:h-[210px]">
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${box.width || 1} ${box.height || 1}`}
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <path d={pathD} fill="none" className="stroke-foreground/15" strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
          <path
            d={pathD}
            fill="none"
            pathLength={1}
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="1 1"
            strokeDashoffset={1 - fill}
          />
        </svg>

        <div role="tablist" aria-label="Learning journey steps" aria-orientation="horizontal" onKeyDown={onKeyDown}>
          {journey.map((step, i) => {
            const reached = i <= active;
            const current = i === active;
            const Icon = step.icon;
            const labelBelow = i % 2 === 0;
            return (
              <button
                key={step.title}
                ref={(el) => {
                  tabsRef.current[i] = el;
                }}
                id={`journey-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={current}
                aria-controls="journey-panel"
                tabIndex={current ? 0 : -1}
                onClick={() => onSelect(i)}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${nodePoints[i].x}%`, top: `${nodePoints[i].y}%` }}
              >
                <span
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-full border-2 transition-all duration-500",
                    current && "scale-110 border-primary bg-primary text-primary-foreground shadow-[0_0_0_6px_hsl(var(--primary)/0.15)]",
                    reached && !current && "border-primary bg-card text-primary",
                    !reached && "border-border bg-card text-muted-foreground group-hover:border-primary/40",
                  )}
                >
                  {reached && !current ? <Check className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
                </span>
                <span
                  className={cn(
                    "absolute left-1/2 w-32 -translate-x-1/2 text-center",
                    labelBelow ? "top-full mt-2" : "bottom-full mb-2",
                  )}
                >
                  <span className={cn("block text-sm", current ? "font-extrabold text-foreground" : "font-semibold text-muted-foreground")}>
                    {step.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-12">
        <StepPanel key={active} index={active} />
      </div>
    </div>
  );
}

/** Desktop wrapper that pins the path and lets scroll position choose the active step. */
function PinnedJourney() {
  const outerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = outerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      setActive(Math.min(STEPS - 1, Math.floor(progress * STEPS)));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Selecting a step scrolls to the matching position so scroll and selection stay in sync.
  const select = useCallback((i: number) => {
    const el = outerRef.current;
    if (!el) return;
    setActive(i);
    const top = el.getBoundingClientRect().top + window.scrollY;
    const scrollable = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + scrollable * ((i + 0.5) / STEPS), behavior: "smooth" });
  }, []);

  return (
    <div ref={outerRef} style={{ height: `${100 + STEPS * 30}vh` }}>
      <div className="sticky top-0 flex h-screen items-center pt-16">
        <div className="fq-container">
          <Header />
          <JourneyPath active={active} onSelect={select} />
        </div>
      </div>
    </div>
  );
}

/** Mobile and tablet: a vertical timeline whose segments light up as you scroll. */
function VerticalStep({ index }: { index: number }) {
  const [ref, inView] = useInView<HTMLLIElement>({ rootMargin: "0px 0px -35% 0px", threshold: 0 });
  const step = journey[index];
  const Icon = step.icon;
  const last = index === STEPS - 1;

  return (
    <li ref={ref} className="relative grid grid-cols-[48px_1fr] gap-4 pb-10 last:pb-0">
      {!last && (
        <span aria-hidden="true" className="absolute bottom-0 left-[23px] top-12 w-0.5 overflow-hidden bg-border">
          <span
            className={cn(
              "block w-full origin-top bg-primary transition-transform duration-700 ease-out motion-reduce:transition-none",
              inView ? "scale-y-100" : "scale-y-0",
            )}
            style={{ height: "100%" }}
          />
        </span>
      )}
      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 grid h-12 w-12 place-items-center rounded-full border-2 transition-colors duration-500",
          inView ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div
        className={cn(
          "pt-1 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
          inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-40 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        )}
      >
        <p className="fq-eyebrow">Step {String(index + 1).padStart(2, "0")}</p>
        <h3 className="fq-h3 mt-1">{step.title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{step.detail}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {step.points.map((p) => (
            <li key={p} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium">
              {p}
            </li>
          ))}
        </ul>
        <SmartLink href={step.href} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-foreground">
          {step.cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SmartLink>
      </div>
    </li>
  );
}

function Header() {
  return (
    <SectionHeader
      id="journey-title"
      eyebrow="How it works"
      title={
        <>
          Learning isn't a straight line.
          <br className="hidden sm:block" /> It's a <span className="fq-text-brand">journey.</span>
        </>
      }
      lead="Every step on Freequademy leads into the next. Start anywhere, loop back when you need to, and keep moving forward."
    />
  );
}

export default function LearningJourney() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const tallEnough = useMediaQuery("(min-height: 760px)");
  const reducedMotion = usePrefersReducedMotion();
  const [manualActive, setManualActive] = useState(0);

  const pinned = desktop && tallEnough && !reducedMotion;

  return (
    <section id="journey" aria-labelledby="journey-title" className="relative bg-surface">
      {pinned ? (
        <PinnedJourney />
      ) : desktop ? (
        <div className="fq-container py-24">
          <Header />
          <JourneyPath active={manualActive} onSelect={setManualActive} />
        </div>
      ) : (
        <div className="fq-container py-20 md:py-28">
          <Header />
          <Reveal>
            <ol className="mt-12 max-w-xl">
              {journey.map((step, i) => (
                <VerticalStep key={step.title} index={i} />
              ))}
            </ol>
          </Reveal>
        </div>
      )}
    </section>
  );
}
