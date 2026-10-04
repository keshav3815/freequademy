import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import freequademyLogo from "@/assets/freequademy-logo.png";
import { usePrimaryCta } from "./LandingAuth";
import { Reveal } from "./primitives";
import { ctaStyles } from "./styles";

export default function FinalCTA() {
  const cta = usePrimaryCta();

  return (
    <section aria-labelledby="cta-title" className="px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
      <div className="fq-ink relative mx-auto max-w-[1200px] overflow-hidden rounded-[2rem] px-6 py-20 text-center md:px-12 md:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="fq-grid-bg absolute inset-0 opacity-60" />
          <div className="absolute left-1/2 top-full h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-brand opacity-40 blur-[110px]" />
        </div>

        <Reveal className="relative mx-auto max-w-3xl">
          <img src={freequademyLogo} alt="" width={64} height={64} className="mx-auto h-14 w-14 md:h-16 md:w-16" />
          <h2 id="cta-title" className="fq-display mt-8">
            Your learning journey <span className="fq-text-brand">starts here.</span>
          </h2>
          <p className="fq-lead mx-auto mt-6 max-w-xl">
            Learn at your pace, practise what you know, ask when you're stuck, and keep improving.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className={ctaStyles.onInk}>
              <Link to={cta.href}>
                {cta.label}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className={ctaStyles.onInkSecondary}>
              <a href="#platform">
                Explore Freequademy
                <ArrowDown />
              </a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
