import type { ReactNode } from "react";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { features, type Feature, type FeatureKey } from "./data";
import { IconTile, InitialsAvatar, Reveal, Section, SectionHeader, SmartLink } from "./primitives";

/* Small decorative visuals, one per feature. All aria-hidden. */

function LearnVisual() {
  const lessons = [
    { title: "Introduction to quadratics", state: "done" },
    { title: "Solving by factorisation", state: "done" },
    { title: "The quadratic formula", state: "current" },
    { title: "Nature of roots", state: "next" },
  ] as const;
  return (
    <ol className="grid gap-2">
      {lessons.map((l, i) => (
        <li
          key={l.title}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-transform duration-500 group-hover:translate-x-1",
            l.state === "current" ? "border-primary/30 bg-accent font-semibold" : "border-border bg-card",
          )}
          style={{ transitionDelay: `${i * 40}ms` }}
        >
          <span
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
              l.state === "done" && "bg-primary text-primary-foreground",
              l.state === "current" && "border-2 border-primary text-primary",
              l.state === "next" && "border border-border text-muted-foreground",
            )}
          >
            {l.state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className="truncate">{l.title}</span>
          {l.state === "current" && <span className="ml-auto text-[11px] font-semibold text-accent-foreground">In progress</span>}
        </li>
      ))}
    </ol>
  );
}

function AiVisual() {
  return (
    <div className="grid gap-2.5 text-[13px] leading-snug">
      <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-3.5 py-2.5">
        What's the difference between speed and velocity?
      </p>
      <div className="flex max-w-[92%] gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-brand">
          <Sparkles className="h-3 w-3 text-white" />
        </span>
        <p className="rounded-2xl rounded-tl-md border border-white/10 bg-white/5 px-3.5 py-2.5 text-white/85">
          Speed is how fast you move. Velocity is how fast <em>and</em> in which direction…
        </p>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {["Give an example", "Quiz me"].map((f) => (
          <span key={f} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function PracticeVisual() {
  const options = ["x = 2, 3", "x = −2, −3", "x = 1, 6", "x = −1, 6"];
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[13px] font-semibold">Solve x² − 5x + 6 = 0</p>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {options.map((o, i) => (
          <span
            key={o}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs",
              i === 0 ? "border-success/40 bg-success/10 font-semibold text-success" : "border-border bg-card text-muted-foreground",
            )}
          >
            {i === 0 && <Check className="h-3 w-3" />}
            {o}
          </span>
        ))}
      </div>
    </div>
  );
}

function MentorshipVisual() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex -space-x-2">
        <InitialsAvatar initials="You" className="h-8 w-8 border-2 border-card bg-none bg-foreground text-[10px]" />
        <InitialsAvatar initials="M" className="h-8 w-8 border-2 border-card" />
      </div>
      <div className="min-w-0 text-xs">
        <p className="font-semibold">One-on-one session</p>
        <p className="truncate text-muted-foreground">Goal: a revision plan that sticks</p>
      </div>
    </div>
  );
}

function CommunityVisual() {
  return (
    <div className="grid gap-2 text-xs">
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="font-semibold">Why is the sky blue and not violet?</p>
        <div className="mt-2.5 flex items-center gap-2 text-muted-foreground">
          <div className="flex -space-x-1.5">
            {["A", "R", "K"].map((i) => (
              <InitialsAvatar key={i} initials={i} className="h-6 w-6 border-2 border-surface text-[9px]" />
            ))}
          </div>
          3 replies · Physics
        </div>
      </div>
    </div>
  );
}

function ProgressVisual() {
  const topics = [
    { name: "Algebra", value: 86, label: "Strong" },
    { name: "Geometry", value: 64, label: "Steady" },
    { name: "Probability", value: 38, label: "Revisit" },
  ];
  return (
    <ul className="grid gap-2.5">
      {topics.map((t) => (
        <li key={t.name} className="grid grid-cols-[80px_1fr_52px] items-center gap-3 text-xs">
          <span className="font-medium">{t.name}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-border">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${t.value}%` }} />
          </span>
          <span className="text-right text-muted-foreground">{t.label}</span>
        </li>
      ))}
    </ul>
  );
}

const visuals: Record<FeatureKey, () => ReactNode> = {
  learn: LearnVisual,
  ai: AiVisual,
  practice: PracticeVisual,
  mentorship: MentorshipVisual,
  community: CommunityVisual,
  progress: ProgressVisual,
};

const layout: Record<FeatureKey, string> = {
  learn: "md:col-span-2 lg:col-span-4",
  ai: "md:row-span-2 lg:col-span-2 lg:row-span-2",
  practice: "lg:col-span-2",
  mentorship: "lg:col-span-2",
  community: "lg:col-span-3",
  progress: "lg:col-span-3",
};

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Visual = visuals[feature.key];
  const Icon = feature.icon;
  const dark = feature.key === "ai";
  const wide = feature.key === "learn";

  return (
    <Reveal
      as="article"
      delay={index * 80}
      className={cn(
        "fq-lift group relative flex flex-col overflow-hidden rounded-[1.25rem] border p-6 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring md:p-7",
        dark ? "fq-ink border-ink-border" : "border-border bg-card shadow-[var(--shadow-card)]",
        wide && "lg:grid lg:grid-cols-2 lg:gap-8",
        layout[feature.key],
      )}
    >
      {dark && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-violet/30 blur-3xl"
        />
      )}
      <div className="relative flex flex-col">
        <IconTile className={dark ? "border-white/10 bg-white/10 text-white" : undefined}>
          <Icon />
        </IconTile>
        <h3 className="fq-h3 mt-5">{feature.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{feature.body}</p>
        <SmartLink
          href={feature.href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          {feature.cta}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </SmartLink>
      </div>
      <div aria-hidden="true" className={cn("relative mt-6", wide && "lg:mt-0 lg:self-center", dark && "mt-auto pt-8")}>
        <Visual />
      </div>
    </Reveal>
  );
}

export default function EcosystemSection() {
  return (
    <Section id="platform" labelledBy="platform-title">
      <div className="fq-container">
        <SectionHeader
          id="platform-title"
          eyebrow="The platform"
          title={
            <>
              One place for your <span className="fq-text-brand">entire learning journey</span>
            </>
          }
          lead="Most students juggle separate apps for lessons, tests, doubts and study groups. Freequademy puts them in one place, so each step feeds the next."
        />

        <div className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.key} feature={feature} index={i % 3} />
          ))}
        </div>
      </div>
    </Section>
  );
}
