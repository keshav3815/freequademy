import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import freequademyLogo from "@/assets/freequademy-logo.png";
import { navLinks } from "./data";
import { usePrimaryCta } from "./LandingAuth";
import { SmartLink } from "./primitives";
import { ctaStyles } from "./styles";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-extrabold tracking-tight", className)}>
      Free<span className="fq-text-brand">quademy</span>
    </span>
  );
}

export default function LandingNavbar() {
  const cta = usePrimaryCta();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => desktop.matches && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const compact = scrolled || menuOpen;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
        compact
          ? "border-b border-border bg-background/95 shadow-[0_1px_12px_-6px_hsl(var(--foreground)/0.15)] backdrop-blur-lg"
          : "border-b border-transparent bg-background/0",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>
      <div
        className={cn(
          "fq-container flex items-center justify-between gap-6 transition-[height] duration-300",
          scrolled ? "h-14 md:h-16" : "h-16 md:h-20",
        )}
      >
        <Link to="/" className="flex min-h-11 items-center gap-2" aria-label="Freequademy home">
          <img src={freequademyLogo} alt="" width={36} height={36} className="h-8 w-8 md:h-9 md:w-9" />
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.label}>
                <SmartLink
                  href={link.href}
                  className="rounded-full px-4 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {!cta.isSignedIn && (
            <Button asChild variant="ghost" className="h-10 rounded-full px-4 text-[15px] font-semibold hover:bg-muted hover:text-foreground">
              <Link to="/login">Log in</Link>
            </Button>
          )}
          <Button asChild className={cn(ctaStyles.primary, "h-10 px-5 text-sm")}>
            <Link to={cta.href}>
              {cta.isSignedIn ? cta.label : "Start Learning"}
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      <div
        id="landing-mobile-menu"
        hidden={!menuOpen}
        className="border-t border-border bg-background lg:hidden"
      >
        <nav aria-label="Mobile" className="fq-container py-4">
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.label}>
                <SmartLink
                  href={link.href}
                  onClick={closeMenu}
                  className="flex min-h-12 items-center justify-between rounded-xl px-3 text-base font-semibold hover:bg-muted"
                >
                  {link.label}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </SmartLink>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 border-t border-border pt-4">
            <Button asChild className={cn(ctaStyles.primary, "w-full")}>
              <Link to={cta.href} onClick={closeMenu}>
                {cta.label}
                <ArrowRight />
              </Link>
            </Button>
            {!cta.isSignedIn && (
              <Button asChild variant="ghost" className={cn(ctaStyles.secondary, "w-full")}>
                <Link to="/login" onClick={closeMenu}>
                  Log in
                </Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
