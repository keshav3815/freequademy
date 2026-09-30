import { principles } from "./data";
import { Reveal, Section, SectionHeader } from "./primitives";

export default function PrinciplesSection() {
  return (
    <Section id="why" labelledBy="why-title">
      <div className="fq-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            id="why-title"
            eyebrow="Why Freequademy"
            title="Built on a few simple beliefs."
            lead="No inflated numbers. Just the ideas that shape what we build."
          />
        </div>

        <ol className="border-t border-border">
          {principles.map((p, i) => (
            <Reveal
              as="li"
              key={p.title}
              delay={i * 60}
              className="group grid grid-cols-[3rem_1fr] gap-4 border-b border-border py-7 sm:grid-cols-[5rem_1fr] md:py-9"
            >
              <span
                aria-hidden="true"
                className="font-mono text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary sm:text-base"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight md:text-2xl">{p.title}</h3>
                <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted-foreground md:text-base">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
