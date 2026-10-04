import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrimaryCta } from "./LandingAuth";
import { Reveal, Section } from "./primitives";
import { ctaStyles } from "./styles";

const studentVerbs = ["Learn.", "Practice.", "Ask.", "Improve.", "Connect."];
const classes = [6, 7, 8, 9, 10, 11, 12];

const mentorPoints = [
  { title: "Guide learners", body: "Help students set goals and work out what to focus on." },
  { title: "Share knowledge", body: "Explain the concepts you know well and answer doubts." },
  { title: "Support learning journeys", body: "Give feedback that turns a test result into a next step." },
  { title: "Be part of the ecosystem", body: "Contribute to the community, events and blog." },
];

export default function AudienceSection() {
  const cta = usePrimaryCta();

  return (
    <Section id="audience" labelledBy="audience-title">
      <div className="fq-container">
        <h2 id="audience-title" className="sr-only">
          Who Freequademy is for
        </h2>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <Reveal as="article" className="fq-card relative flex flex-col overflow-hidden p-7 md:p-10">
            <div aria-hidden="true" className="fq-glow pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative flex flex-1 flex-col">
              <p className="fq-eyebrow">For students</p>
              <h3 className="sr-only">For students: learn, practice, ask, improve and connect.</h3>
              <p aria-hidden="true" className="mt-5 max-w-md text-3xl font-extrabold leading-[1.15] tracking-tight md:text-4xl">
                {studentVerbs.map((verb, i) => (
                  <span key={verb} className={cn(i === studentVerbs.length - 1 && "fq-text-brand")}>
                    {verb}{" "}
                  </span>
                ))}
              </p>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Everything you need to understand your subjects and keep improving, for Classes 6 to 12.
              </p>

              <nav aria-label="Browse courses by class" className="mt-8">
                <p className="text-sm font-semibold">Find your class</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {classes.map((c) => (
                    <li key={c}>
                      <Link
                        to={`/courses?class=${c}`}
                        className="grid h-11 min-w-11 place-items-center rounded-xl border border-border bg-card px-3 text-sm font-bold transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
                        aria-label={`Class ${c} courses`}
                      >
                        {c}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-auto pt-10">
                <Button asChild className={ctaStyles.primary}>
                  <Link to={cta.href}>
                    {cta.label}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal as="article" delay={100} className="fq-ink relative flex flex-col overflow-hidden rounded-[1.25rem] p-7 md:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-violet/25 blur-3xl"
            />
            <div className="relative flex flex-1 flex-col">
              <p className="fq-eyebrow">For mentors &amp; educators</p>
              <h3 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
                Help students find their way.
              </h3>
              <ul className="mt-8 grid gap-5 sm:grid-cols-2">
                {mentorPoints.map((p) => (
                  <li key={p.title} className="border-t border-white/10 pt-4">
                    <p className="font-bold">{p.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-8 flex items-start gap-2 text-sm text-muted-foreground">
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Mentor and educator tools are still growing. Join early and help shape them.
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
                <Button asChild className={ctaStyles.onInk}>
                  <Link to="/signup-mentor">
                    Sign up as a mentor
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="ghost" className={ctaStyles.onInkSecondary}>
                  <Link to="/mentorship">About mentorship</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
