import { pillars } from "./data";
import { Reveal } from "./primitives";

export default function ValueStrip() {
  return (
    <section aria-labelledby="value-title" className="border-y border-border bg-card">
      <h2 id="value-title" className="sr-only">
        What you can do on Freequademy
      </h2>
      <ul className="fq-container grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
        {pillars.map(({ icon: Icon, title, body }, i) => (
          <Reveal
            as="li"
            key={title}
            delay={i * 70}
            className="flex items-start gap-3 py-5 sm:py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0 sm:[&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-border lg:[&:nth-child(n+3)]:border-t-0"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h3 className="text-[15px] font-bold">{title}</h3>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{body}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
