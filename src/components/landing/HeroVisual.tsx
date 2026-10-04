import { useEffect, useState, type CSSProperties } from "react";
import { BookOpen, Check, ClipboardCheck, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useInView, usePrefersReducedMotion, useProgressiveText } from "./hooks";
import { PreviewTag } from "./primitives";

const path = ["Learn", "Practice", "Ask", "Improve", "Mentor"] as const;

const aiAnswer = "Its graph is a U-shaped curve, which can cross the x-axis twice.";

function floatStyle(delay: number) {
  return { "--float-delay": `${delay}ms`, "--enter-delay": `${300 + delay / 4}ms` } as CSSProperties;
}

/**
 * The hero's product composition: a lesson view at the centre with three
 * supporting cards resting on its corners. Kept deliberately spare — three
 * cards, clear spacing, no overlaps — rather than a crowded collage. All
 * content is sample data.
 */
export default function HeroVisual() {
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0 });
  const reducedMotion = usePrefersReducedMotion();
  const [activeStep, setActiveStep] = useState(2);
  const [answerStarted, setAnswerStarted] = useState(false);
  const answer = useProgressiveText(aiAnswer, answerStarted, { wordsPerTick: 1, tickMs: 70 });

  // Walk the learning path while the hero is on screen.
  useEffect(() => {
    if (!inView || reducedMotion) return;
    const id = window.setInterval(() => setActiveStep((s) => (s + 1) % path.length), 2400);
    return () => window.clearInterval(id);
  }, [inView, reducedMotion]);

  useEffect(() => {
    if (!inView) return;
    const id = window.setTimeout(() => setAnswerStarted(true), 1200);
    return () => window.clearTimeout(id);
  }, [inView]);

  const progress = ((activeStep + 1) / path.length) * 100;

  return (
    <figure ref={ref} data-animate={inView} className="relative mx-auto w-full max-w-[560px]">
      <figcaption className="sr-only">
        Product preview: a Freequademy lesson on quadratic equations, alongside a course card, an AI doubt answer and a
        chapter test result. Sample data.
      </figcaption>

      <div aria-hidden="true" className="relative pb-14 pt-12 sm:pb-16 sm:pt-14">
        {/* Central lesson view */}
        <div
          className="fq-hero-enter fq-card relative z-10 mx-auto max-w-[380px] p-5 sm:p-6"
          style={{ "--enter-delay": "200ms" } as CSSProperties}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
              Class 10 · Mathematics
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">Lesson 3 of 8</span>
          </div>
          <p className="mt-4 text-xl font-bold tracking-tight">Quadratic equations</p>
          <p className="mt-1 text-sm text-muted-foreground">Roots, the discriminant and what the graph tells you.</p>

          <div className="mt-6">
            <div className="relative flex items-start justify-between">
              <div className="absolute left-4 right-4 top-4 h-0.5 bg-border" />
              <div
                className="absolute left-4 top-4 h-0.5 bg-primary transition-[width] duration-700"
                style={{ width: `calc((100% - 2rem) * ${activeStep / (path.length - 1)})` }}
              />
              {path.map((step, i) => {
                const done = i < activeStep;
                const current = i === activeStep;
                return (
                  <div key={step} className="relative flex w-12 flex-col items-center gap-2">
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border-2 text-[11px] font-bold transition-all duration-500",
                        done && "border-primary bg-primary text-primary-foreground",
                        current && "fq-pulse border-primary bg-card text-primary",
                        !done && !current && "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={cn("text-[11px]", current ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Chapter progress</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="mt-2 h-1.5 bg-border [&>div]:duration-700" />
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Up next: <span className="font-semibold text-foreground">Nature of roots</span>
            </div>
          </div>
        </div>

        {/* Course card, resting on the top-left corner */}
        <div className="fq-hero-enter absolute -top-2 left-0 z-20 hidden sm:block" style={floatStyle(0)}>
          <div className="fq-float fq-float-card w-48 p-3.5" style={floatStyle(0)}>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">Chemical reactions</p>
                <p className="text-[11px] text-muted-foreground">Science · 5 lessons</p>
              </div>
            </div>
            <Progress value={60} className="mt-3 h-1 bg-border" />
          </div>
        </div>

        {/* AI doubt solver, resting on the top-right corner */}
        <div className="fq-hero-enter absolute -top-4 right-0 z-20 hidden sm:block" style={floatStyle(700)}>
          <div className="fq-float fq-float-card w-56 p-3.5" style={floatStyle(700)}>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-brand text-white">
                <Sparkles className="h-3 w-3" />
              </span>
              AI doubt solver
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Why does a quadratic have two answers?</p>
            <p className={cn("mt-1.5 min-h-[2.4rem] text-xs leading-snug", !answer.done && "fq-caret")}>{answer.visible}</p>
          </div>
        </div>

        {/* Test result, resting on the bottom-left corner */}
        <div className="fq-hero-enter absolute -bottom-2 left-6 z-20 hidden sm:block" style={floatStyle(1400)}>
          <div className="fq-float fq-float-card w-56 p-3.5" style={floatStyle(1400)}>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> Chapter test · Trigonometry
            </div>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li className="flex items-center justify-between">
                <span>Identities</span>
                <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">Strong</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Heights &amp; distances</span>
                <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">Revisit</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <PreviewTag>Product preview · sample data</PreviewTag>
      </div>
    </figure>
  );
}
