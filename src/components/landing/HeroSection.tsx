import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroVisual from "./HeroVisual";
import { usePrimaryCta } from "./LandingAuth";
import { ctaStyles } from "./styles";

const enter = (ms: number) => ({ "--enter-delay": `${ms}ms` }) as CSSProperties;

export default function HeroSection() {
  const cta = usePrimaryCta();

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden pb-16 pt-8 md:pb-24 md:pt-12 lg:pt-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -top-20">
        <div className="fq-grid-bg absolute inset-0" />
        <div className="fq-glow absolute inset-0" />
      </div>

      <div className="fq-container relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
        <div className="max-w-xl">
          <p
            className="fq-hero-enter inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pl-1.5 pr-3 text-[13px] font-medium text-muted-foreground"
            style={enter(0)}
          >
            <span className="shrink-0 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">Classes 6–12</span>
            One place for your whole learning journey
          </p>

          <h1 id="hero-title" className="fq-hero-title fq-hero-enter mt-6" style={enter(80)}>
            <span>Learn.</span> <span>Practice.</span> <span>Ask.</span> <span className="fq-text-brand">Improve.</span>
          </h1>

          <p className="fq-lead fq-hero-enter mt-6" style={enter(160)}>
            Freequademy brings courses, practice tests, AI-powered doubt solving, mentorship and a student community
            together, so every part of learning connects to the next.
          </p>

          <div className="fq-hero-enter mt-8 flex flex-col gap-3 sm:flex-row" style={enter(240)}>
            <Button asChild className={ctaStyles.primary}>
              <Link to={cta.href}>
                {cta.label}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className={ctaStyles.secondary}>
              <a href="#platform">
                Explore the Platform
                <ArrowDown />
              </a>
            </Button>
          </div>

          <p className="fq-caption fq-hero-enter mt-6" style={enter(320)}>
            Free to sign up. Teaching or mentoring?{" "}
            <Link to="/signup-mentor" className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-primary">
              Join as a mentor
            </Link>
          </p>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
