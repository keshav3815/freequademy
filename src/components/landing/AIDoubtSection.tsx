import { useEffect, useState } from "react";
import { Check, CornerDownRight, ImageIcon, RotateCcw, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiSamples } from "./data";
import { useInView, usePrefersReducedMotion, useProgressiveText } from "./hooks";
import { FlowSteps, PreviewTag, Reveal, Section } from "./primitives";

const flow = ["Question", "AI explanation", "Follow-up", "Understanding"] as const;

export default function AIDoubtSection() {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState(0);
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.35 });
  const reducedMotion = usePrefersReducedMotion();
  const sample = aiSamples[sampleIndex];
  const answer = useProgressiveText(sample.answer, inView && phase >= 1, { resetKey: run });

  // Question → answer streams → follow-ups appear → understanding.
  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setPhase(3);
      return;
    }
    setPhase(0);
    const id = window.setTimeout(() => setPhase(1), 700);
    return () => window.clearTimeout(id);
  }, [inView, reducedMotion, sampleIndex, run]);

  useEffect(() => {
    if (phase !== 1 || !answer.done) return;
    const toFollowUp = window.setTimeout(() => setPhase(2), 400);
    return () => window.clearTimeout(toFollowUp);
  }, [phase, answer.done]);

  useEffect(() => {
    if (phase !== 2) return;
    const toUnderstanding = window.setTimeout(() => setPhase(3), 1400);
    return () => window.clearTimeout(toUnderstanding);
  }, [phase]);

  const choose = (i: number) => {
    setSampleIndex(i);
    setRun((r) => r + 1);
  };

  return (
    <Section id="ai-help" labelledBy="ai-title" className="fq-ink overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-brand-blue/20 blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-brand-violet/20 blur-[120px]" />
      </div>

      <div className="fq-container relative grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal>
          <p className="fq-eyebrow mb-4">AI doubt solver</p>
          <h2 id="ai-title" className="fq-display">
            Stuck? <span className="fq-text-brand">Ask.</span>
          </h2>
          <p className="fq-lead mt-6 max-w-lg">
            Type your doubt or upload a photo of the problem. The doubt solver explains it step by step, in language
            that suits your class, so one question doesn't hold up your whole evening.
          </p>

          <fieldset className="mt-8">
            <legend className="text-sm font-semibold">Try a sample question</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiSamples.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={i === sampleIndex}
                  onClick={() => choose(i)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                    i === sampleIndex
                      ? "border-white bg-white text-ink"
                      : "border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:text-white",
                  )}
                >
                  {s.concept}
                </button>
              ))}
            </div>
          </fieldset>

          <FlowSteps
            steps={flow}
            activeIndex={phase}
            label="How a doubt gets resolved"
            className="mt-8"
          />

          <p className="fq-caption mt-8 max-w-md">
            The doubt solver is part of the student dashboard. Answers are AI-generated, so check important steps with
            your teacher or a mentor.
          </p>
        </Reveal>

        <Reveal as="figure" delay={120}>
          <figcaption className="sr-only">
            Sample conversation. A {sample.grade} student asks: “{sample.question}” The AI explains: {sample.answer}
          </figcaption>

          <div ref={ref} aria-hidden="true" className="overflow-hidden rounded-3xl border border-white/10 bg-ink-raised shadow-2xl">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-4">
              <span className="mr-auto flex items-center gap-2 text-sm font-semibold">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-brand">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </span>
                Doubt solver
              </span>
              {[sample.subject, sample.grade, sample.concept].map((chip) => (
                <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/75">
                  {chip}
                </span>
              ))}
            </div>

            <div className="grid min-h-[380px] content-start gap-4 p-5 sm:p-6">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground">
                {sample.question}
              </p>

              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-brand">
                  <Sparkles className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/90">
                  {phase === 0 ? (
                    <span className="inline-flex gap-1 py-1.5">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" style={{ animationDelay: `${d * 150}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <p className={cn(!answer.done && "fq-caret")}>{answer.visible}</p>
                  )}
                </div>
              </div>

              <div className={cn("pl-11 transition-opacity duration-500", phase >= 2 ? "opacity-100" : "opacity-0")}>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
                  <CornerDownRight className="h-3 w-3" /> Ask a follow-up
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sample.followUps.map((f) => (
                    <span key={f} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  "ml-11 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-white transition-opacity duration-500",
                  phase >= 3 ? "opacity-100" : "opacity-0",
                )}
              >
                <Check className="h-4 w-4 text-[hsl(158_64%_55%)]" /> Makes sense now. Next: 3 practice questions on {sample.concept.toLowerCase()}.
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
              <ImageIcon className="h-4 w-4 text-white/40" />
              <span className="flex-1 truncate text-sm text-white/40">Type your doubt or upload a photo…</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
                <Send className="h-3.5 w-3.5 text-white/60" />
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <PreviewTag>Sample conversation</PreviewTag>
            <button
              type="button"
              onClick={() => setRun((r) => r + 1)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-white/70 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Replay
            </button>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
