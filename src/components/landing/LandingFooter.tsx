import { Link } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";
import freequademyLogo from "@/assets/freequademy-logo.png";
import { footerColumns } from "./data";
import { Wordmark } from "./LandingNavbar";
import { SmartLink } from "./primitives";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="fq-container py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(5,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-xs">
            <Link to="/" className="inline-flex items-center gap-2" aria-label="Freequademy home">
              <img src={freequademyLogo} alt="" width={36} height={36} className="h-9 w-9" />
              <Wordmark />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Learning, practice, AI help, mentorship and community in one connected learning journey for Classes 6 to 12.
            </p>
            <a
              href="https://www.instagram.com/freequademy/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-muted"
            >
              <FaInstagram className="h-4 w-4" aria-hidden="true" />
              Instagram
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-5">
            {footerColumns.map((col) => (
              <nav key={col.title} aria-labelledby={`footer-${col.title}`}>
                <h2 id={`footer-${col.title}`} className="text-sm font-bold">
                  {col.title}
                </h2>
                <ul className="mt-4 grid gap-1">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <SmartLink
                          href={link.href}
                          className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </SmartLink>
                      ) : (
                        <span className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground">
                          {link.label}
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                            Soon
                          </span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Freequademy. All rights reserved.</p>
          <p>Made for curious students.</p>
        </div>
      </div>
    </footer>
  );
}
