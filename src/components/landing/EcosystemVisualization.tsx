import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import freequademyLogo from "@/assets/freequademy-logo.png";
import { ecosystemNodes } from "./data";
import { useInView, useMediaQuery, usePrefersReducedMotion } from "./hooks";
import { Reveal, Section, SectionHeader } from "./primitives";
import { Wordmark } from "./LandingNavbar";

const RADIUS = 38;
const nodes = ecosystemNodes.map((node, i) => {
  const angle = (-90 + i * (360 / ecosystemNodes.length)) * (Math.PI / 180);
  return { ...node, x: 50 + RADIUS * Math.cos(angle), y: 50 + RADIUS * Math.sin(angle) };
});

function Hub({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-6 py-5 shadow-[var(--shadow-float)]", className)}>
      <img src={freequademyLogo} alt="" width={56} height={56} className="h-12 w-12 md:h-14 md:w-14" />
      <Wordmark className="text-base md:text-lg" />
    </div>
  );
}

function Diagram({ active, onActivate }: { active: number; onActivate: (i: number) => void }) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0 });

  return (
    <div ref={ref} data-animate={inView} className="relative mx-auto aspect-square w-full max-w-[600px]">
      <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <circle cx={50} cy={50} r={RADIUS} fill="none" className="stroke-border" strokeWidth={0.3} />
        <circle cx={50} cy={50} r={RADIUS * 0.55} fill="none" className="stroke-border" strokeWidth={0.2} strokeDasharray="0.6 1.2" />
        {nodes.map((n, i) => (
          <line
            key={n.key}
            x1={50}
            y1={50}
            x2={n.x}
            y2={n.y}
            strokeWidth={i === active ? 0.6 : 0.35}
            className={cn("fq-dash-sm transition-[stroke] duration-500", i === active ? "stroke-primary" : "stroke-primary/30")}
          />
        ))}
        {/* Arc links to the active node's neighbours */}
        {[-1, 1].map((dir) => {
          const next = nodes[(active + dir + nodes.length) % nodes.length];
          const cur = nodes[active];
          return (
            <path
              key={dir}
              d={`M ${cur.x} ${cur.y} A ${RADIUS} ${RADIUS} 0 0 ${dir > 0 ? 1 : 0} ${next.x} ${next.y}`}
              fill="none"
              className="stroke-primary/60"
              strokeWidth={0.5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Hub />
      </div>

      <ul>
        {nodes.map((n, i) => {
          const Icon = n.icon;
          const current = i === active;
          return (
            <li key={n.key} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
              <button
                type="button"
                aria-pressed={current}
                aria-describedby={current ? "ecosystem-detail" : undefined}
                onMouseEnter={() => onActivate(i)}
                onFocus={() => onActivate(i)}
                onClick={() => onActivate(i)}
                className={cn(
                  "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300",
                  current
                    ? "scale-105 border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.8)]"
                    : "border-border bg-card text-foreground hover:border-primary/40",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {n.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function EcosystemVisualization() {
  const wide = useMediaQuery("(min-width: 768px)");
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0.3 });

  useEffect(() => {
    if (!wide || !inView || interacted || reducedMotion) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % nodes.length), 2800);
    return () => window.clearInterval(id);
  }, [wide, inView, interacted, reducedMotion]);

  const activate = (i: number) => {
    setInteracted(true);
    setActive(i);
  };

  const current = nodes[active];

  return (
    <Section id="ecosystem" labelledBy="ecosystem-title" className="overflow-hidden bg-surface">
      <div className="fq-container">
        <SectionHeader
          id="ecosystem-title"
          eyebrow="The ecosystem"
          align="center"
          title={
            <>
              Six parts. <span className="fq-text-brand">One system.</span>
            </>
          }
          lead="Each part of Freequademy feeds the others. What you learn shapes what you practise, what you practise shows what to ask, and every answer moves you forward."
        />

        {wide ? (
          <Reveal className="mt-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div ref={ref}>
              <Diagram active={active} onActivate={activate} />
            </div>
            <div id="ecosystem-detail" aria-live={interacted ? "polite" : "off"} className="fq-card mx-auto w-full max-w-md p-7">
              <p className="fq-eyebrow">How it connects</p>
              <p key={current.key} className="mt-3 animate-fade-in">
                <span className="block text-2xl font-extrabold tracking-tight">{current.label}</span>
                <span className="mt-2 block text-[15px] leading-relaxed text-muted-foreground">{current.connects}</span>
              </p>
              <p className="fq-caption mt-6">Hover or select a part of the diagram to see how it connects.</p>
            </div>
          </Reveal>
        ) : (
          <div className="mt-12">
            <Reveal className="flex justify-center">
              <Hub />
            </Reveal>
            <div aria-hidden="true" className="mx-auto h-8 w-px bg-primary/40" />
            <ul className="grid grid-cols-2 gap-3">
              {nodes.map((n, i) => {
                const Icon = n.icon;
                return (
                  <Reveal as="li" key={n.key} delay={(i % 2) * 80} className="fq-card p-4">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <p className="mt-2 font-bold">{n.label}</p>
                    <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{n.connects}</p>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}
